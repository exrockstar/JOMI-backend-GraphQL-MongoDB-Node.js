import fs from "fs";
import moment from "moment";
import { Article } from "../entities/Article/Article";
import { create } from "xmlbuilder2";
import { ArticleModel } from "../entities";
import path from "path";
import { logger } from "../logger";
const FOLDER_DOI = "./submissions";
const FULL_DOI_DIR = path.join(__dirname, FOLDER_DOI); //Result: doi/submissions

//Needed for crossref submission request
const generateUniqueId = () => {
  return Math.random().toString(26).slice(2);
};

//Return a time stamp for the version number in the crossref submission request
const generateTimeStamp = () => {
  return moment().format("YYYYQMMDDHHmmss");
};

//Return full year of published or preprint date of the article we are
//sending to Crossref
const buildPublicationYear = (article: Article) => {
  let myYear;
  if (article.status === "publish") {
    myYear = article.published?.getFullYear();
  } else if (article.status === "preprint") {
    myYear = article.preprint_date?.getFullYear();
  }
  return {
    journal_issue: {
      publication_date: {
        "@media_type": "online",
        year: {
          "#text": `${myYear}`,
        },
      },
    },
  };
};

//Follows Crossref schema
const buildAuthorTags = (authors: any[]) => {
  return authors.length > 0
    ? authors.reduce((acc, current, index) => {
        const sequence = index === 0 ? "first" : "additional";
        const name = current && current.name;
        const firstName = (name && name.first) || "";
        const lastName = (name && name.last) || "";

        return {
          ...acc,
          person_name: {
            "@sequence": `${sequence}`,
            "@contributor_role": "author",
            given_name: {
              "#text": `${firstName}`,
            },
            surname: {
              "#text": `${lastName}`,
            },
          },
        };
      }, {})
    : {};
};

//Required from Crossref Schema for Published or Preprint date
const buildPublicationDate = (article: Article) => {
  switch (article.status) {
    case "publish":
      if (article.published) {
        const published = article.published;
        const month = published.getMonth() + 1;
        const day = published.getDate();

        return {
          month: {
            "#text": `${month < 10 ? `0${month}` : month}`,
          },
          day: {
            "#text": `${day < 10 ? `0${day}` : day}`,
          },
          year: {
            "#text": `${published.getFullYear()}`,
          },
        };
      } else {
        logger.error("Article has publish status but does not have a Published date");
      }
      break;
    case "preprint":
      if (article.preprint_date) {
        const preprint = article.preprint_date;
        return {
          year: {
            "#text": `${preprint.getFullYear()}`,
          },
        };
      } else {
        logger.error("Article has preprint status but does not have a Preprint date");
      }
      break;
    default:
      logger.error(
        `Article ${article.title} is status ${article.status} and should not be sent to Crossref`,
      );
      break;
  }

  //if default case, return out of this function
  //need this since ESlint6 is throwing a warning if we simply return in the default case above
  return {};
};

//Build citation object for the article if there are citations
const buildCitations = (publicationID: String, citations: String) => {
  //normalize whitespace
  let myCitations = citations.replace(/\s/g, " ").split("<li>");

  if (!myCitations || !myCitations.length) {
    logger.info(`----- No citations found for ${publicationID} -----`);
    return {};
  }

  myCitations.shift();
  let myReducedCitations = myCitations.reduce((acc, citation, index) => {
    let newCitation = citation;
    // strip html tags
    newCitation = newCitation.replace(/<[^>]+>/g, "");
    // str_citationp escape tags
    newCitation = newCitation.replace(/\\/g, "");

    return {
      ...acc,
      citation: {
        "@key": `key-${publicationID}-${index}`,
        unstructured_citation: {
          "#text": `${citation}`,
        },
      },
    };
  }, {});
  return { citation_list: { ...myReducedCitations } };
};

const buildBodyPublished = (article: Article, authors: any) => {
  return {
    journal: {
      journal_metadata: {
        full_title: {
          "#text": "Journal of Medical Insight",
        },
        abbrev_title: "JOMI",
        issn: {
          "@media_type": "electronic",
          "#text": "23736003",
        },
        doi_data: {
          doi: {
            "#text": "10.24296/jomi",
          },
          resource: {
            "#text": "https://jomi.com",
          },
        },
      },
      ...(article.status == "publish" || article.status == "preprint"
        ? buildPublicationYear(article)
        : {}),
      journal_article: {
        "@publication_type": "full_text",
        titles: {
          title: {
            "#text": `${article.title}`,
          },
        },
        contributors: buildAuthorTags(authors),
        publication_date: {
          "@media_type": "online",
          ...buildPublicationDate(article),
        },
        doi_data: {
          doi: {
            "#text": `10.24296/jomi/${article.publication_id}`,
          },
          resource: {
            "#text": `https://jomi.com/article/${article.publication_id}/${article.slug}`,
          },
        },
        ...(article.content.citations && article.publication_id
          ? buildCitations(article.publication_id, article.content.citations)
          : {}),
      },
    },
  };
};

const buildBodyPreprint = (article: Article, authors: any) => {
  return {
    posted_content: {
      contributors: buildAuthorTags(authors),
      //required
      titles: {
        title: {
          "#text": `${article.title}`,
        },
      },
      //required
      posted_date: {
        "@media_type": "online",
        ...buildPublicationDate(article),
      },
      //required
      doi_data: {
        doi: {
          "#text": `10.24296/jomi/${article.publication_id}`,
        },
        resource: {
          "#text": `https://jomi.com/article/${article.publication_id}/${article.slug}`,
        },
      },
      ...(article.content.citations && article.publication_id
        ? buildCitations(article.publication_id, article.content.citations)
        : {}),
    },
  };
};

//Create XML which holds the new relationship between a preprint and a published article
const generateCrossRefRelationship = (article: Article) => {
  const obj: Object = {
    doi_batch: {
      "@version": "4.4.2",
      "@xmlns": "http://www.crossref.org/doi_resources_schema/4.4.2",
      head: {
        doi_batch_id: {
          "#text": `${generateUniqueId()}`,
        },
        depositor: {
          depositor_name: {
            "#text": "jomi.com automation",
          },
          email_address: {
            "#text": "dev@jomi.com",
          },
        },
      },
      body: {
        doi_relations: {
          doi: {
            "#text": `10.24296/jomi/${article.publication_id}`,
          },
          program: {
            "@xmlns": "http://www.crossref.org/relations.xsd",
            related_item: {
              intra_work_relation: {
                "@relationship-type":
                  article.DOIStatus === "preprint" ? "isPreprintOf" : "hasPreprint",
                "@identifier-type": "doi",
                "#text": `10.24296/jomi/${article.publication_id}`,
              },
            },
          },
        },
      },
    },
  };
  const doc = create({ encoding: "UTF-8" }, obj);
  const xml = doc.end({ prettyPrint: true });
  return xml;
};

//Creates a JS object and converts it to XML
const generateCrossRef = async (article: Article) => {
  try {
    const popAuthors = await ArticleModel.findById({ _id: article._id }).populate("authors");
    let myAuthors: any[];
    if (popAuthors) {
      myAuthors = popAuthors.authors;
    } else {
      myAuthors = [];
    }

    const obj: Object = {
      doi_batch: {
        "@version": "5.3.1",
        "@xmlns": "http://www.crossref.org/schema/5.3.1",
        "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "@xsi:schemaLocation":
          "http://www.crossref.org/schema/5.3.1 https://data.crossref.org/schemas/crossref5.3.1.xsd",
        head: {
          doi_batch_id: {
            "#text": `${generateUniqueId()}`,
          },
          timestamp: {
            "#text": `${generateTimeStamp()}`,
          },
          depositor: {
            depositor_name: {
              "#text": "jomi.com automation",
            },
            email_address: {
              "#text": "dev@jomi.com",
            },
          },
          registrant: {
            "#text": "jomi",
          },
        },
        body: {
          ...(article.status === "publish"
            ? buildBodyPublished(article, myAuthors)
            : buildBodyPreprint(article, myAuthors)),
        },
      },
    };

    const doc = create({ encoding: "UTF-8" }, obj);
    const xml = doc.end({ prettyPrint: true });
    return xml;
  } catch (err) {
    throw err;
  }
};

//Create an XML file for a single article
//Update is asking whether or not the XMl will update a previous submission or not
export const generateSingleXML = async (article: Article, update: boolean) => {
  try {
    //Check if the path doesn't exist, create it if so
    if (!fs.existsSync(FULL_DOI_DIR)) {
      fs.mkdir(`${FULL_DOI_DIR}`, (err: any) => {
        if (err) throw err;
      });
    }

    //If the XML file doesn't already exist, make a new one and put it in the submissions folder
    if (!fs.existsSync(path.join(FULL_DOI_DIR, `${article.slug}.xml`))) {
      const myXML: string = await new Promise((resolve) => {
        !update
          ? resolve(generateCrossRef(article))
          : resolve(generateCrossRefRelationship(article));
      });

      fs.writeFileSync(path.join(FULL_DOI_DIR, `${article.slug}.xml`), myXML);

      logger.info(`----- CrossRef XML BUILT for: ${article.title} -----`);
    } else {
      logger.error("XML File already exists");
    }
  } catch (err) {
    throw err;
  }
};

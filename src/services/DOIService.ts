import fs from 'fs'
import FormData from 'form-data'
import path from 'path'
import { Article } from '../entities/Article/Article'
import { ArticleModel } from '../entities'
import Axios from 'axios'
import { generateSingleXML } from '../doi/crossrefDOIGen'

const CROSSREF_UN = process.env.CROSSREF_UN
const CROSSREF_PW = process.env.CROSSREF_PW
const SUBMISSIONS_DIR = path.join(__dirname, '..', 'doi', 'submissions')
const DOI_PRE = 'https://api.crossref.org/works/10.24296/jomi'

//Submits an xml file to Crossref for content-registration
//Update asks whether the submission is updating a previous submission or not
export const submitCrossrefDOI = async (filename: string, update: boolean, article: Article) => {
    try {
        if (!CROSSREF_UN || !CROSSREF_PW) {
            throw new Error(`*** [Crossref] Crossref username and password is missing! ***`);
        }

        let form = new FormData()
        if(update){
            form.append('operation', 'doDOICitUpload')
        } else {
            form.append('operation', 'doMDUpload')
        }
        form.append('login_id', CROSSREF_UN)
        form.append('login_passwd', CROSSREF_PW)
        form.append('fname', fs.createReadStream(path.join(SUBMISSIONS_DIR, `${filename}.xml`)))
        await new Promise((resolve) => {
            resolve(form.submit('https://doi.crossref.org/servlet/deposit', (err, res) => {
                if(err){
                    throw new Error(`Error when submitting DOI to Crossref: ${err}`)
                } else {
                    console.log(res.statusCode)
                    cleanupXML(filename)
                    res.resume()
                }
            }))
        })
        console.log(`*** [DOI] ${filename} was submitted to queue ***`)
        //logic to change DOIStatus to submitted only if not updating metadata that is already in Crossref
        if(!update){
            const myArticle = await ArticleModel.findByIdAndUpdate(article._id, {
                $set: {
                    DOIStatus: "submitted"
                },
            })
            if(!myArticle) {
                throw new Error("Article not found when submitting DOI and changing its status")
            }
        }
    } catch (err) {
        throw err;
    }
}

//Update the DOIStatus field of an article
const updateDOIStatus = async (article: Article) => {
    try {
        if(article.status === 'publish' && article.DOIStatus !== 'publish') {
            const res = await Axios.get(`${DOI_PRE}/${article.publication_id}/agency`)
            if(res.status == 200) {
                //If the article was a preprint, update the preprint's XMl data and send 
                //to crossref
                let wasPreprint = false
                if(article.DOIStatus === 'preprint'){
                    await generateSingleXML(article, true)
                        .then(() => submitCrossrefDOI(article.slug, true, article))
                    wasPreprint = true
                }

                const myArticle = await ArticleModel.findByIdAndUpdate(article._id, {
                    $set: {
                        DOIStatus: "publish"
                    },
                })
                //Need to also update the XML for the published journal_article if wasPreprint
                if (myArticle && wasPreprint) {
                    await generateSingleXML(myArticle, true)
                        .then(() => submitCrossrefDOI(myArticle.slug, true, myArticle))
                } else if (!myArticle) {
                    throw new Error("Article not found when updating DOIStatus to publish")
                }
            }
        } else if (article.status === 'preprint' && article.DOIStatus !== 'preprint') {
            const res = await Axios.get(`${DOI_PRE}/${article.publication_id}/agency`)
            if(res.status == 200) {
                const myArticle = await ArticleModel.findByIdAndUpdate(article._id, {
                    $set: {
                        DOIStatus: "preprint"
                    },
                })
                if (!myArticle) {
                    throw new Error("Article not found when updating DOIStatus to preprint")
                }
            }
        } else if (article.DOIStatus === "submitted") {
            const res = await Axios.get(`${DOI_PRE}/${article.publication_id}/agency`)
            if(res.status != 200) {
                const myArticle = await ArticleModel.findByIdAndUpdate(article._id, {
                    $set: {
                        DOIStatus: "false"
                    },
                })
                if (!myArticle) {
                    throw new Error("Article not found when updating DOIStatus to false")
                }
            }
        }
    } catch (err) {
        const myArticle = await ArticleModel.findByIdAndUpdate(article._id, {
            $set: {
                DOIStatus: "false"
            },
        })
        if (!myArticle) {
            throw new Error(`Article ${article.title} not found when updating DOIStatus`)
        }
        throw new Error(`Double check DOI submission. Could not find the article ${article.title} in Crossref when updating DOIStatus`)
    }
}

//Used in update_doi_articles job which is run once every day
export const updateDOIStatusAll = async () => {
    const articles = await ArticleModel.find({ $or: [{ status: 'preprint' }, { status: 'publish' }] })
    if (!articles) {
        throw new Error('No articles were found')
    }

    const articlesPromises = articles.map(async article => {
        await updateDOIStatus(article)
    })
    await Promise.all(articlesPromises)
    
    console.log(`*** [DOI] Checked ${articles.length} articles ***`)
}

//Remove an xml file from the submissions dir after it's been submitted to Crossref
export const cleanupXML = async (filename: string) => {
    fs.unlink(path.join(SUBMISSIONS_DIR, `${filename}.xml`), (err) => {
        if(err) {
            console.log(`Error removing file: ${filename}.xml`)
            console.error(err)
        } else {
            console.log(`Removed file: ${filename}.xml`)
        }
    })
}

import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { ArticleModel, ScienceOpenXmlModel, SiteSettingModel } from "../entities";
import { ScienceOpenXml } from "../entities/ScienceOpen/ScienceOpenXml";
import { ScienceOpenService } from "../services/ScienceOpenService";

@Resolver(ScienceOpenXml)
export class ScienceOpenResolver {
  @Query(() => [ScienceOpenXml])
  async getScienceOpenArticlesXml() {
    const article_ids = await ArticleModel.find(
      { status: { $in: ["publish", "preprint"] } },
      { _id: 1 },
    );
    const items = await ScienceOpenXmlModel.find({
      articleId: { $in: article_ids },
    }).sort({ generatedAt: -1 });
    return items;
  }

  @Query(() => ScienceOpenXml, { nullable: true })
  async getScienceOpenArticleByPubId(@Arg("publication_id") publication_id: string) {
    const article = await ArticleModel.findOne({ publication_id });
    if (!article) {
      throw new Error("Article Not Found");
    }

    if (!["publish", "preprint"].includes(article.status)) {
      throw new Error("Article status is not published or preprint");
    }

    const item = await ScienceOpenXmlModel.findOne({ articlePublicationId: publication_id });

    if (!item) {
      const xml = await ScienceOpenService.generateFromPublicationId(publication_id);
      const created = new ScienceOpenXmlModel({
        articleId: article._id,
        articlePublicationId: publication_id,
        generatedXml: xml,
      });

      await created.save();
      return created;
    }

    return item;
  }

  @Mutation(() => String)
  async generateScienceOpenXmlByArticle(@Arg("publication_id") publication_id: string) {
    const article = await ArticleModel.findOne({ publication_id })
    if (!article) {
      throw new Error("Article not found")
    }

    if (!["publish", "preprint"].includes(article.status)) {
      throw new Error("Article is not in publish or preprint status")
    }

    const xml = await ScienceOpenService.generateFromPublicationId(publication_id)
    const record = await ScienceOpenXmlModel.findOne({ articleId: article._id });

    if (!record) {
      const created = new ScienceOpenXmlModel({
        articleId: article._id,
        articlePublicationId: article.publication_id,
        generatedXml: xml,
      });

      await created.save();
    } else {
      record.generatedXml = xml;
      record.generatedAt = new Date();
      await record.save();
    }

    return `Successfully generated ${publication_id}.xml`
  }

  @Mutation(() => String)
  async generateAllScienceOpenXml() {
    await ScienceOpenService.generateAll()
    return "Successfully generated scienceopen.xml"
  }

  @Query(() => Date, { nullable: true })
  async scienceOpenLastGeneratedAt(): Promise<Date | undefined> {
    const settings = await SiteSettingModel.findOne()
    return settings?.scienceOpenXmlGeneratedAt;
  }

}

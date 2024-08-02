import Agenda from "agenda";
import { logger } from "../logger";
import { CheckRequestSubscriptionCount } from "./check-request-subscription-count";
import { CheckTriageRequestForNewUser } from "./check-triage-requests-for-user";
import { CreateArticlePurchaseProducts } from "./create-article-purchase-products";
import { GenerateScienceOpenXmlJob } from "./generate_science_open";
import { GenerateSitemapJob } from "./generate_sitemap";
import { JobDefinition } from "./JobDefinition";
import { UpdateInstSubscription } from "./update-inst-subscription";
import { UpdateInstUsersJob } from "./update-inst-users";
import { UpdateUserSubscription } from "./update-user-subscription";
import { UpdateWistiaMetadata } from "./update-wistia-metadata";
import { UpdateDOIsJob } from "./update_doi_articles";
import { UpdateAllInstStats } from "./update-all-inst-stats";
import { UpdateContentLengthJob } from "./update-article-contentlength";
import { UpdateLastSubType } from "./update-last-subtype";
import { CheckArticleTranslations } from "./CheckArticleTranslations";
import { UpdateAnnouncementsCacheId } from "./UpdateAnnouncementsCacheId";
import { UpdateArticleViews } from "./UpdateArticleViews";
import { FixAccessInstitutionId } from "./FixAccessInstitutionId";
import { CreateFeedbackQuestions } from "./CreateFeedbackQuestions";
import { AddEmailExpiryDate } from "./AddEmailExpiryDate";
import { CleanTemporaryAccesses } from "./CleanTemporaryAccesses";
import { AddMatchedInstitutionName } from "./AddMatchedInstitutionName";
import { UpdateOrderStatus } from "./UpdateOrderStatus";
import { AddPromoCodesToOrders } from "./AddPromoCodesToOrders";
import { UpdateInstAccessData } from "./UpdateInstAccessData";
import { UpdateInstAnonAccessData } from "./UpdateInstAnonAccessData";
import { UpdateFeedbackInstitution } from "./UpdateFeedbackInstitution";
import { FixInstitutionAccessData } from "./FixInstitutionAccessData";
import { MapNewPricesToUserTypes } from "./MapNewPricesToUserTypes";
import { CleanUpVideoBlockStats } from "./CleanUpVideoBlockStats";
import { UpdateOldPromoCodes } from "./UpdateOldPromoCodes";
import { TransferEmoryData } from "./TransferEmoryData";
import { SyncPaymentHistory } from "./SyncPaymentHistory";
import { AddAnonymousUserTypesToAccess } from "./AddAnonymousUserTypesToAccess";
import { FixAnonUserTypes } from "./FixAnonUserTypes";
import { FixAnonUserTypesScheduled } from "./FixAnonUserTypesScheduled";
import { FixUniversityOfTennesseeAccess } from "./FixUniversityOfTennesseeAccess";
import { TriggerCrmFirstNameNull } from "./TriggerCrmFirstNameNull";
import { TransferWMUtoStrykerJob } from "./TransferWMUtoStrykerJob";
import { CreateCountriesJob } from "./CreateCountriesJob";
import { CreatePricingByMatrix } from "./CreatePricingByMatrix";
import { AddTabSettings } from "./AddTabSettings";
import { RemoveFrequentArticleViewActivity } from "./RemoveFrequentArticleViewActivity";
import { GenerateMarcRecord } from "./GenerateMarcRecord";
import { SanitizeOldDBDocsCSV } from "./SanitizeDBDocsForCSV";
import { CheckInstUsersJob } from "./check-inst-users";
import { TransferIpsHinari } from "./TransferIpsHinari";
import { RemoveAnnouncementStats } from "./RemoveAnnouncementStats";

if (!process.env.MONGO_URL) {
  throw new Error("MONGO_URL is not defined");
}

export const jobDefinitions: JobDefinition[] = [
  new GenerateSitemapJob(),
  new UpdateUserSubscription(),
  new UpdateDOIsJob(),
  new UpdateWistiaMetadata(),
  new UpdateInstSubscription(),
  // new UpdateArticleStats(),
  new UpdateAllInstStats(),
  new GenerateScienceOpenXmlJob(),
  new UpdateInstUsersJob(),
  new CheckTriageRequestForNewUser(),
  new CheckRequestSubscriptionCount(),
  new UpdateContentLengthJob(),
  new UpdateLastSubType(),
  new CreateArticlePurchaseProducts(),
  new CheckArticleTranslations(),
  new UpdateAnnouncementsCacheId(),
  new UpdateArticleViews(),
  new FixAccessInstitutionId(),
  new CreateFeedbackQuestions(),
  new AddEmailExpiryDate(),
  new CleanTemporaryAccesses(),
  new AddMatchedInstitutionName(),
  new UpdateOrderStatus(),
  new AddPromoCodesToOrders(),
  new UpdateInstAccessData(),
  new UpdateInstAnonAccessData(),
  new UpdateFeedbackInstitution(),
  new FixInstitutionAccessData(),
  new MapNewPricesToUserTypes(),
  new CleanUpVideoBlockStats(),
  new UpdateOldPromoCodes(),
  new SyncPaymentHistory(),
  new TransferEmoryData(),
  new AddAnonymousUserTypesToAccess(),
  new FixAnonUserTypes(),
  new FixAnonUserTypesScheduled(),
  new FixUniversityOfTennesseeAccess(),
  new TriggerCrmFirstNameNull(),
  new TransferWMUtoStrykerJob(),
  new CreateCountriesJob(),
  new CreatePricingByMatrix(),
  new AddTabSettings(),
  new RemoveFrequentArticleViewActivity(),
  new GenerateMarcRecord(),
  new SanitizeOldDBDocsCSV(),
  new CheckInstUsersJob(),
  new TransferIpsHinari(),
  new RemoveAnnouncementStats(),
];

const agenda = new Agenda({
  db: {
    address: process.env.MONGO_URL,
    collection: "agendaJobs",
  },
});

export const manualJobsAgenda = new Agenda({
  db: {
    address: process.env.MONGO_URL,
    collection: "manual_jobs",
  },
});

/**
 * Define jobs here
 */
jobDefinitions.map((jobDefinition) => {
  agenda.define(jobDefinition.name, jobDefinition.execute);
});

/**
 * Define what jobs will be initialized
 */
const initializeJobs = async () => {
  logger.info("initializing Jobs");
  await agenda.start();

  //re-create existing jobs
  jobDefinitions.map(async (jobDefinition) => {
    try {
      await agenda.cancel({ name: jobDefinition.name });
    } catch (e) {
      logger.error(`Couldn't cancel job ${jobDefinition.name}`, {
        stack: e.stack,
      });
    }
    if (jobDefinition.schedule) {
      agenda.every(jobDefinition.schedule, jobDefinition.name);
    }
  });
  agenda.now("CreateCountriesJob", {});
  agenda.now("Generate marc record", {});
};

export { initializeJobs, agenda };

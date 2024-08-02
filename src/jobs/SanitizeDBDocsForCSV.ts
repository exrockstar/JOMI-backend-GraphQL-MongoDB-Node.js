import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { OrderModel, UserModel } from "../entities";
import { logger } from "../logger/logger";
import { UserRoles } from "../entities/User/Roles";
import { OrderType } from "../entities/Order/OrderType";

/**
 * One time job to update article views for preprints and publish
 */
export class SanitizeOldDBDocsCSV extends JobDefinition {
  constructor() {
    super("SanitizeOldDBDocsCSV");
  }
  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data ||= { progress: 0.5 };

    try{
      const usersWithoutEmail = await UserModel.find({
        email: null
      });
      console.log(usersWithoutEmail)

      const usersWithWrongRoles = await UserModel.find({
        role: {$nin: ['user', 'author', 'librarian', 'admin', 'superadmin']}
      });
      console.log(usersWithWrongRoles);

      const usersWithNullisSubscribed = await UserModel.find({
        isSubscribed: null,
      })
      console.log(usersWithNullisSubscribed.length)

      const ordersWithOldTypes = await OrderModel.find({
        type: {$nin: ['standard', 'trial', 'default', 'individual', 'purchase_article', 'rent_article']}
      })
      console.log(ordersWithOldTypes.length)

      for(const user of usersWithoutEmail){
        user.email = 'fodedac894@wikfee.com'
        await job.save()
      }

      await UserModel.bulkSave(usersWithoutEmail)

      for(const user of usersWithWrongRoles){
        user.role = UserRoles.user
        await job.save()
      }

      await UserModel.bulkSave(usersWithWrongRoles)

      for(const user of usersWithNullisSubscribed){
        user.isSubscribed = false
        await job.save()
      }

      await UserModel.bulkSave(usersWithNullisSubscribed)

      for(const order of ordersWithOldTypes){
        order.type = OrderType.individual
        await job.save()
      }

      await OrderModel.bulkSave(ordersWithOldTypes)

      await job.remove()
      logger.info(`Completed Job: ${job.attrs.name}`);
    } catch(e) {
      logger.error(`Error in job SanitizeOldDBDocsCSV: ${e}`)
    }
  }
}

import _ from "underscore";
import { AppContext } from "../api/apollo-server/AppContext";
import { InstitutionModel, OrderModel, UserModel } from "../entities";
import { OrderInputForLocation } from "../entities/Order/OrderInputForLocation";
import { Order } from "../entities/Order/Order";
import { OrderPaymentStatus } from "../entities/Order/OrderPaymentStatus";
import { OrderStatus } from "../entities/Order/OrderStatus";
import { StatusType } from "../entities/Institution/InstitutionSubscription";
import dayjs from "dayjs";
import { UpdateOrderInput } from "../entities/Order/UpdateOrderInput";
import { logger } from "../logger";
import { StripeUtils } from "../api/stripe/StripeUtils";
import { UserService } from "./UserService";
import { OrderNotFoundError } from "../errors/OrderNotFoundError";
import { OrderType } from "../entities/Order/OrderType";
import { agenda } from "../jobs";
import { user_access_cache } from "../api/cache";
import { FilterQuery } from "mongoose";
import { OrderListInput } from "../entities/Order/OrderListInput";
import { OrderListOutput } from "../entities/Order/OrderListOutput";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import stringifyObject from "../utils/stringifyObject";
import { ColumnFilter } from "../entities/Common/ColumnFilter";
import { User } from "../entities/User";
import { PipelineStage } from "mongoose";
import { Institution } from "../entities/Institution/Institution";
import { chunk } from "lodash";
import axios from "axios";
import { sleep } from "../utils/sleep";

export class OrderService {
  static async getOrder(_id?: string, plan_id?: string) {
    if (!_id) return null;

    let order = await OrderModel.findById(_id);
    if (!order && plan_id) {
      order = await OrderModel.findOne({ plan_id });
    }

    return order;
  }

  static async createOrder(
    input: OrderInputForLocation,
    ctx: AppContext,
  ): Promise<Order> {
    const order = new OrderModel({
      ...input,
      createdBy: ctx.user?._id,
      lastEditedBy: "N/A",
      status: OrderStatus.Active,
      payment_status: OrderPaymentStatus.Succeeded,
    });
    await order.save();

    await OrderService.updateInstitutionWithLatestOrder(input.institution);
    agenda.now("check-inst-users", { institutionId: input.institution });
    return order;
  }

  static async createOrderForUser(input: UpdateOrderInput, ctx: AppContext) {
    const order = new OrderModel({
      ...input,
      createdBy: ctx.user?._id,
      lastEditedBy: "N/A",
    });
    await order.save();

    //update user subscription field

    await OrderService.updateUserWithLatestOrder(order.user_id as string);
    return order;
  }

  static async updateOrderCms(
    id: string,
    input: UpdateOrderInput,
    ctx: AppContext,
  ) {
    const order = await OrderModel.findById(id);

    if (!order) {
      throw new Error("Order not found");
    }
    order.set({
      ...input,
    });
    order.lastEditedBy = ctx.user?._id;

    if (order?.plan_id && order.isCanceled) {
      try {
        await StripeUtils.unsubscribeOrder(order?.plan_id, order._id);
      } catch (e) {
        if (e instanceof OrderNotFoundError) {
          order.deleted = true;
          order.save();
        }
        throw e;
      }
    }

    order.save();
    await OrderService.updateUserWithLatestOrder(order.user_id as string);
    return order;
  }

  static async updateOrder(
    _id: string,
    input: OrderInputForLocation,
    ctx: AppContext,
  ): Promise<Order> {
    const { ...data } = input;
    if (!_id) {
      throw new Error("Order id is required for updating oder.");
    }

    const order = await OrderModel.findById(_id);

    if (!order) {
      throw new Error(`Order with id: ${_id} not found`);
    }

    order.set({
      ...data,
      lastEditedBy: ctx.user?.display_name || ctx.user?._id,
    });
    user_access_cache.flushAll();
    agenda.now("check-inst-users", { institutionId: input.institution });
    await order.save();

    //update institution subscription
    await OrderService.updateInstitutionWithLatestOrder(input.institution);

    return order;
  }

  static async deleteOrder(_id: string): Promise<Order | null> {
    const order = await OrderModel.findByIdAndRemove(_id);

    if (order?.institution) {
      await OrderService.updateInstitutionWithLatestOrder(
        order.institution as string,
      );
    }

    if (order?.user_id) {
      await OrderService.updateUserWithLatestOrder(order?.user_id as string);
    }
    if (order?.plan_id) {
      try {
        await StripeUtils.unsubscribeOrder(order?.plan_id, order._id);
      } catch (e) {}
    }
    return order;
  }

  /**
   * Gets the order based on institution id, user_type and specialization.
   */
  static async getOrdersByInstitutionId(
    id: string,
    user_type?: string,
    specialty?: string,
  ) {
    let query: FilterQuery<Order> = { institution: id };

    if (user_type || specialty) {
      query["$and"] = [
        {
          $or: [
            { restricted_user_types: { $size: 0 } },
            { restricted_user_types: user_type },
          ],
        },
        {
          $or: [
            { restricted_specialties: { $size: 0 } },
            { restricted_specialties: specialty },
          ],
        },
      ];
    }
    const orders = await OrderModel.find(query).sort({ end: -1 }).limit(5);
    return orders;
  }

  static async updateInstitutionWithLatestOrder(institutionId: string) {
    const [orders, institution] = await Promise.all([
      OrderService.getOrdersByInstitutionId(institutionId),
      InstitutionModel.findById(institutionId),
    ]);
    const latest_order = orders.shift();
    if (!institution) return;
    if (latest_order) {
      institution.subscription.order = latest_order.id;
      const now = new Date();
      const notExpired = dayjs(now).isBefore(latest_order.end);
      const status = latest_order.type as unknown as StatusType;
      institution.subscription.status = notExpired ? status : StatusType.none;
      institution.subscription.last_checked = "";
      institution.expiry_date_cached = latest_order.end;

      institution.subscription.expiredOrderStatus = notExpired
        ? undefined
        : latest_order.type;
      logger.info(
        `Updated ${institution.name} ${institution.expiry_date_cached}`,
      );
    } else {
      //if no order, just create a new subscription object.
      institution.subscription.status = StatusType.none;
      institution.subscription.last_checked = "";
      institution.expiry_date_cached = undefined;
      institution.subscription.expiredOrderStatus = undefined;
    }
    await institution.save();
  }

  /**
   * Should only be used in the CMS to display all orders for a user
   * @param id
   * @returns
   */
  static async getOrdersByUserId(id: string) {
    const orders = await OrderModel.find({
      $or: [{ user_id: id }, { db_user_id: id }],
    }).sort({ end: -1 });

    return orders;
  }

  /**
   * Get the active `OrderType.trial` or `OrderType.individual` type order
   * @param id
   * @returns
   */
  static async getActiveOrdersByUserId(id: string) {
    const orders = await OrderModel.find({
      $or: [{ user_id: id }, { db_user_id: id }],
      status: OrderStatus.Active,
      end: {
        $gt: new Date(),
      },
      $and: [
        {
          $nor: [
            { type: OrderType.rent_article },
            { type: OrderType.purchase_article },
          ],
        },
      ],
      deleted: { $ne: true },
    })
      .sort({ end: -1 })
      .limit(5);

    return orders;
  }

  static async updateUserWithLatestOrder(user_id: string) {
    const user = await UserModel.findById(user_id);
    if (!user) {
      logger.error("updateUserWithLatestOrder. Couldn't find user", {
        service: "OrderService",
      });
      return;
    }

    const access = await UserService.userAccessType(user, user.source_ip ?? "");
    await UserService.updateUserByAccess(user, access);
    await user.save();
  }

  static async hasIndividualOrder(id: string) {
    const now = new Date();
    const orders = await OrderModel.find({
      $or: [{ user_id: id }, { db_user_id: id }],
      end: { $gt: now },
      type: { $in: [OrderType.trial, OrderType.individual] },
      status: { $in: [OrderStatus.Active] },
      deleted: { $ne: true },
    }).sort({
      status: 1,
    });

    return orders.at(0);
  }

  private static getOrderQueries(
    filters: ColumnFilter[],
  ): FilterQuery<Order>[] {
    return filters
      ?.filter(
        (x) =>
          !x.columnName.startsWith("user.") &&
          !x.columnName.startsWith("_institution."),
      )
      .map((filter) => {
        const { value, operation, columnName } = filter;
        const query = getQueryFromOperation(operation, value);
        return {
          [columnName]: query,
        };
      }, {});
  }

  private static getUserQueries(filters: ColumnFilter[]): FilterQuery<User>[] {
    return filters
      ?.filter((x) => x.columnName.startsWith("user"))
      .map((filter) => {
        const { value, operation, columnName } = filter;
        return { [columnName]: getQueryFromOperation(operation, value) };
      }, {});
  }

  private static getInstitutionQueries(
    filters: ColumnFilter[],
  ): FilterQuery<Institution>[] {
    return filters
      ?.filter((x) => x.columnName.startsWith("_institution."))
      .map((filter) => {
        const { value, operation, columnName } = filter;
        /**
         * fix to query orders with `institution` property as institution name
         */
        if (columnName === "_institution.name") {
          return {
            $or: [
              { [columnName]: getQueryFromOperation(operation, value) },
              { institution: getQueryFromOperation(operation, value) },
            ],
          };
        }
        return { [columnName]: getQueryFromOperation(operation, value) };
      }, {});
  }

  private static getOrderSteps(input: OrderListInput): PipelineStage[] {
    const sort_by = input.sort_by;
    const orderQueries = this.getOrderQueries(input.filters);
    const userQueries = this.getUserQueries(input.filters);
    const institutionQueries = this.getInstitutionQueries(input.filters);
    let steps: PipelineStage[] = [];

    if (orderQueries.length) {
      steps.push({ $match: { $and: orderQueries } });
    }

    if (userQueries.length || sort_by.startsWith("user.")) {
      const userPipline: PipelineStage[] = [
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      if (!!userQueries.length) {
        userPipline.push({
          $match: { $and: userQueries },
        });
      }
      steps = steps.concat(userPipline);
    }

    if (institutionQueries.length || sort_by.includes("user.display_name")) {
      const institutionPipeline: PipelineStage[] = [
        {
          $lookup: {
            from: "institutions",
            localField: "institution",
            foreignField: "_id",
            as: "_institution",
          },
        },
        {
          $unwind: {
            path: "$_institution",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      if (!!institutionQueries.length) {
        institutionPipeline.push({
          $match: { $and: institutionQueries },
        });
      }
      steps = steps.concat(institutionPipeline);
    }

    return steps;
  }
  static async getOrders(input: OrderListInput): Promise<OrderListOutput> {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;

    let sort = {};

    if (sort_by) {
      //sorting for first column in CMS orders section
      if(sort_by === "user.display_name") {
        sort = { 
          'user.display_name': sort_order,
          '_institution.name': sort_order
        }
      } else {
        sort = { [sort_by]: sort_order };
      }
    } else {
      sort = { name: 1 };
    }

    let steps = this.getOrderSteps(input);

    type FacetResult = {
      orders: Order[];
      totalCount: {
        count: number;
      }[];
    };

    steps = steps.concat([
      {
        $sort: sort,
      },
      {
        $facet: {
          orders: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);
    const [result] = await OrderModel.aggregate<FacetResult>(steps);

    return {
      orders: result.orders,
      count: result.totalCount?.at(0)?.count ?? 0,
      dbQueryString: stringifyObject(steps),
    };
  }

  static async addCRMTagsToResultsPreview(input: OrderListInput) {
    const steps = this.getOrderSteps(input);
    type AggregateResult = {
      _id: string;
      count: number;
    };
    const results = await OrderModel.aggregate<AggregateResult>([
      ...steps,
      {
        $match: {
          user_id: { $ne: null },
        },
      },
      {
        $group: {
          _id: "ids",
          user_ids: { $addToSet: "$user_id" },
        },
      },

      {
        $addFields: {
          count: { $size: "$user_ids" },
        },
      },
      {
        $unset: "user_ids",
      },
    ]).allowDiskUse(true);

    console.log(JSON.stringify(results, null, 4));
    const count = results.at(0)?.count;
    return count ?? 0;
  }
  static async addCRMTagsToResults(input: OrderListInput, tags: string[]) {
    const steps = this.getOrderSteps(input);

    type AggregateResult = {
      _id: string;
      user_ids: string[];
    };
    const results = await OrderModel.aggregate<AggregateResult>([
      ...steps,
      {
        $group: {
          _id: "ids",
          user_ids: { $addToSet: "$user_id" },
        },
      },
    ]).allowDiskUse(true);

    const userIds = results.at(0)?.user_ids ?? [];
    const userIdChunks = chunk(userIds, 20);

    // // craft urls for crm
    const urls = userIdChunks.map((users) => {
      const userIds = users.map((userId) => userId).join(",");
      const isProduction = process.env.NODE_ENV === "production";
      const apiKey = isProduction ? process.env.CRM_API_KEY : "no api key";
      const baseUrl = `http://crm.jomi.com/api-lead-tag-update.stp`;
      const tagString = tags.join(",");
      const url = `${baseUrl}?api_key=${apiKey}&leads=${userIds}&tag=${tagString}`;
      return url;
    });

    // //limit calling crm api by 10 urls concurrency
    const urlChunks = chunk(urls, 10);
    for (const urlChunk of urlChunks) {
      try {
        const requests = urlChunk.map(async (url) => axios.get(url));
        await Promise.all(requests);
        await sleep(1000);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`ERROR addCRMTagsToUsers ${error.message}`);
        }
      }
    }

    return true;
  }
}

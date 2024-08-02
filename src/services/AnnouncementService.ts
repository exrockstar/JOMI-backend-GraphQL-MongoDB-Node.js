import { AnnouncementModel, AnnouncementViewModel } from "../entities";
import { Announcement } from "../entities/Announcement/Announcement";
import {
  FilterExpression,
  Operators,
} from "../entities/Announcement/FilterExpression";
import { UserViews } from "../entities/Announcement/UserViews";
export type AnnouncementForUserData = {
  user?: any;
  institution?: any;
  geography?: any;
};

export class AnnouncementService {
  static async getUserViews(announcement: Announcement): Promise<UserViews> {
    const result = await AnnouncementViewModel.aggregate([
      {
        $match: {
          announcement_id: announcement._id.toString(),
        },
      },
      {
        $group: {
          _id: "$user_id",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
        },
      },
      {
        $facet: {
          by_country: [
            {
              $addFields: {
                fixed: {
                  $ifNull: ["$user.countryCode", "Unknown"],
                },
              },
            },
            {
              $group: {
                _id: "$fixed",
                key: { $first: "$fixed" },
                views: { $sum: 1 },
              },
            },
          ],
          by_user_type: [
            {
              $addFields: {
                fixed: {
                  $ifNull: ["$user.user_type", "Unknown"],
                },
              },
            },
            {
              $group: {
                _id: "$fixed",
                key: { $first: "$fixed" },
                views: { $sum: 1 },
              },
            },
          ],
          by_institution: [
            {
              $group: {
                _id: { $ifNull: ["$user.matched_institution_name", "Unknown"] },
                key: {
                  $first: {
                    $ifNull: ["$user.matched_institution_name", "Unknown"],
                  },
                },
                views: { $sum: 1 },
              },
            },
          ],
          total: [
            {
              $addFields: {
                views: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const userViews = result.shift();
    userViews.total = userViews.total[0]?.views ?? 0;
    return userViews;
  }

  static async getAnnouncementsForUser(
    data: AnnouncementForUserData,
    excluded: string[] = [],
  ) {
    /**
     * evaluator - Used to check if an announcment should be shown for a user.
     * This function should not have any external depencendies, like imports otherwise it won't work.
     * @param expressions filterExpressions from Announcement
     * @param data - combination of user, institution, geography
     * @returns - true if announcement should be shown for a user or visitor
     */
    function evaluator(
      expressions: FilterExpression[] | null,
      data: AnnouncementForUserData,
    ): boolean {
      function flattenObject(ob: any) {
        var toReturn: any = {};
        for (var i in ob) {
          if (!ob.hasOwnProperty(i)) continue;

          if (ob[i] !== null && typeof ob[i] == "object") {
            const temp = ob[i];
            if (temp instanceof Date) {
              toReturn[i] = temp.toISOString();
            } else if (temp instanceof Array) {
              toReturn[i] = temp;
            } else {
              var flatObject = flattenObject(ob[i]);
              for (let x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;

                toReturn[i + "." + x] = flatObject[x];
              }
            }
          } else {
            toReturn[i] = ob[i];
          }
        }
        return toReturn;
      }

      const evaluateExpression = (
        operation: Operators,
        value: any,
        columnValue: any,
      ) => {
        switch (operation) {
          case "contains": {
            const _value = value as string;
            const _columnValue = columnValue as unknown;
            const regexp = new RegExp(_value, "i");
            if (typeof _columnValue === "string") {
              return regexp.test(_columnValue);
            }
            if (typeof _columnValue === "object") {
              if (_columnValue instanceof Array) {
                return _columnValue.some((val) => regexp.test(val));
              }
              return false;
            }
            return false;
          }
          case "notContains": {
            const _value = value as string;
            const _columnValue = columnValue as string;
            return new RegExp(_value, "i").test(_columnValue) != true;
          }
          case "equal":
            return value === columnValue;
          case "notEqual":
            return value !== columnValue;
          case "greaterThan":
            return columnValue > value;
          case "greaterThanOrEqual":
            return columnValue >= value;
          case "lessThan":
            return columnValue < value;
          case "lessThanOrEqual":
            return columnValue <= value;
          case "after":
            return new Date(columnValue).getTime() > new Date(value).getTime();
          case "before":
            return new Date(columnValue).getTime() < new Date(value).getTime();
          default:
            false;
        }
        return false;
      };
      const _data = flattenObject(data);

      //recursive function to evaluate the expressions
      function evaluate(
        expressions: FilterExpression[],
        data: AnnouncementForUserData,
        parentId: string | null = null,
      ) {
        const children = expressions.filter(
          (expr) => expr.parentId === parentId,
        );
        const parent = expressions.find((expr) => expr.id === parentId);

        const predicate = (child: FilterExpression): boolean => {
          if (["and", "or"].includes(child.operator)) {
            const result = evaluate(expressions, data, child.id);
            return result;
          } else {
            const key = child.columnName as keyof AnnouncementForUserData;
            const columnValue = data[key];
            const result = evaluateExpression(
              child.operator!,
              child.value!,
              columnValue,
            );
            return result;
          }
        };

        if (!parent || parent.operator === "and") {
          return children.every(predicate);
        } else {
          return children.some(predicate);
        }
      }
      if (!expressions?.length) return false;
      // console.log(_data);
      const result = evaluate(expressions, _data, null);

      return result;
    }

    // Next 3 lines are for debugging the evaluator function sicne we cant use console.log when using aggregate
    // const announcement = await AnnouncementModel.findById("64673c0b24bdbc830f472950");
    // const result = evaluator(announcement?.filters ?? null, data);
    // console.log(result);

    const announcements = await AnnouncementModel.aggregate([
      {
        $match: {
          $expr: {
            $function: {
              body: evaluator,
              args: ["$filters", data],
              lang: "js",
            },
          },
          enabled: true,
          deleted: false,
          content: { $ne: "" },
          cache_id: { $nin: excluded },
        },
      },
      // project to save queries
      {
        $project: {
          _id: 1,
          cache_id: 1,
          backgroundColor: 1,
          content: 1,
          title: 1,
        },
      },
    ]).sort({ created: -1 });

    return announcements;
  }

  /**
   * Not all fields are returned.
   * @returns
   */
  static async getSiteWideAnnouncements() {
    const announcements = await AnnouncementModel.find(
      {
        $or: [{ filters: { $size: 0 } }, { filters: null }],
        enabled: true,
      },
      {
        _id: 1,
        cache_id: 1,
        backgroundColor: 1,
        content: 1,
        isPermanent: 1,
        type: 1,
      },
    );

    return announcements;
  }
}

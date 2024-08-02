import { ObjectId } from "mongodb";
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import {
  AnnouncementModel,
  AnnouncementViewModel,
  ClosedAnnouncementsModel,
  InstitutionModel,
  UserModel,
} from "../entities";
import { Announcement } from "../entities/Announcement/Announcement";
import { User } from "../entities/User";
import { UserRoles } from "../entities/User/Roles";
import { logger } from "../logger";
import { isAdmin } from "../middleware/isAdmin";
import { AnnouncementInput } from "../entities/Announcement/AnnouncementInput";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { UserViews } from "../entities/Announcement/UserViews";
import { AnnouncementService } from "../services/AnnouncementService";
import axios from "axios";
import { nanoid } from "nanoid";
import { isAuthenticated } from "../middleware/isAuthenticated";

const VERCEL_DEPLOY_URL = process.env.VERCEL_DEPLOY_URL;
@Resolver(Announcement)
export class AnnouncementResolver {
  @Query(() => [Announcement])
  @UseMiddleware(isAdmin)
  async announcements() {
    const announcements = await AnnouncementModel.find({
      deleted: false,
      content: { $ne: "" },
    }).sort({ updatedAt: -1 });

    return announcements;
  }

  @Query(() => Announcement)
  @UseMiddleware(isAdmin, LogMiddleware)
  async announcement(@Arg("id") id: string) {
    const announcements = await AnnouncementModel.findById(id).lean();
    return announcements;
  }

  @Query(() => [Announcement], { nullable: true })
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async announcementForUser(@Ctx() ctx: AppContext) {
    const user = ctx.user!;
    const userId = user._id;
    const excluded = await ClosedAnnouncementsModel.find({
      userId,
    });

    const excludedIds = excluded.map((x) => x.announcement_cache_id);
    const institution = await InstitutionModel.findById(user?.institution);

    const announcements = AnnouncementService.getAnnouncementsForUser(
      {
        user: {
          ...user.toObject(),
          password: null, //fix for: https://app.clickup.com/t/8684tna8m
        },
        institution: institution?.toObject(),
        geography: ctx.geoLocation,
      },
      excludedIds,
    );
    //for now get latest announcement
    return announcements;
  }

  @Query(() => [Announcement], { nullable: true })
  @UseMiddleware(LogMiddleware)
  async getSiteWideAnnouncements() {
    return await AnnouncementService.getSiteWideAnnouncements();
  }

  @FieldResolver(() => User)
  async author(@Root() announcement: Announcement) {
    const author = await UserModel.findById(announcement.author).lean();

    return author;
  }

  @FieldResolver(() => UserViews)
  async user_views(@Root() announcement: Announcement) {
    return await AnnouncementService.getUserViews(announcement);
  }

  @FieldResolver(() => Int)
  async unique_views(@Root() announcement: Announcement) {
    return announcement.unique_views?.length;
  }

  @Mutation(() => Announcement)
  @UseMiddleware(isAdmin)
  async setEnabledAnnouncement(
    @Arg("_id") _id: string,
    @Arg("enabled") enabled: boolean,
    @Ctx() ctx: AppContext,
  ) {
    const announcement = await AnnouncementModel.findById(_id);
    if (!announcement) {
      throw new Error(`Announcement does not exist. _id: ${_id}`);
    }
    const user = ctx.user!;
    announcement.enabled = enabled;
    announcement.lastEditedBy = user.display_name ?? "N/A";
    await announcement.save();
    // site-wide announcements doesn't have filters that target users.
    const isSiteWide = !announcement.filters?.length;

    if (isSiteWide && VERCEL_DEPLOY_URL) {
      logger.info("Announcement has been updated...Triggering new deployment");
      await axios.post(VERCEL_DEPLOY_URL);
    }
    return announcement.toObject();
  }

  @Mutation(() => Announcement)
  @UseMiddleware(isAdmin, LogMiddleware)
  async createAnnouncement(@Ctx() ctx: AppContext) {
    const announcement = new AnnouncementModel({
      _id: new ObjectId(),
      title: "New Announcement",
      author: ctx.user!._id,
      createdAt: new Date(),
      cache_id: nanoid(),
    });
    const user = ctx.user!;
    announcement.lastEditedBy = user.display_name || "N/A";
    await announcement.save();

    return announcement.toObject();
  }

  @Mutation(() => Announcement)
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateAnnouncement(
    @Arg("input") input: AnnouncementInput,
    @Ctx() ctx: AppContext,
  ) {
    const announcement = await AnnouncementModel.findById(input._id);

    if (announcement) {
      const fullname = `${ctx.user?.name?.first} ${ctx.user?.name?.last}`;
      announcement.title = input.title;
      announcement.content = input.content;
      announcement.isPermanent = input.isPermanent;
      announcement.backgroundColor = input.backgroundColor;
      announcement.enabled = input.enabled;
      announcement.lastEditedBy = ctx.user!.display_name ?? fullname;
      announcement.filters = input.filters;
      await announcement.save();

      // site-wide announcements doesn't have filters that target users.
      const isSiteWide = !announcement.filters?.length;
      const shouldRedeploy = VERCEL_DEPLOY_URL && isSiteWide;
      if (shouldRedeploy) {
        logger.info(
          "Announcement has been updated...Triggering new deployment",
        );
        await axios.post(VERCEL_DEPLOY_URL);
      }
      return announcement.toObject();
    } else {
      throw new Error("Announcement does not exist");
    }
  }

  @Mutation(() => String)
  async deleteAnnouncement(@Arg("_id") _id: string) {
    const announcement = await AnnouncementModel.findById(_id);
    if (!announcement) {
      throw new Error(`Announcement does not exist. _id: ${_id}`);
    }
    announcement.deleted = true;
    await announcement.save();
    return _id;
  }

  @Mutation(() => [String])
  async markAnnouncementAsRead(
    @Arg("cacheId") cacheId: string,
    @Ctx() ctx: AppContext,
  ) {
    const announcement = await AnnouncementModel.findOne({ cache_id: cacheId });
    if (!announcement) {
      return [];
    }
    const userId = ctx.user?._id;
    const record = new ClosedAnnouncementsModel({
      userId,
      announcement_cache_id: announcement.cache_id,
    });
    await record.save();

    const closed_announcements = await ClosedAnnouncementsModel.find({
      userId,
    });

    return closed_announcements.map((x) => x.announcement_cache_id);
  }

  @Mutation(() => Boolean)
  async trackAnnouncements(
    @Arg("_ids", () => [String]) _ids: string[],
    @Ctx() ctx: AppContext,
  ) {
    const user = ctx.user;
    const announcements = await AnnouncementModel.find(
      {
        _id: { $in: _ids },
      },
      { _id: 1 },
    );

    for (let announcement of announcements) {
      if (
        (user && user.role !== UserRoles.admin) ||
        (user && user.role !== UserRoles.superadmin)
      ) {
        await announcement.updateOne({
          $inc: { views: 1 },
        });
        AnnouncementViewModel.create({
          announcement_id: announcement._id,
          ip_address_v4: ctx.visitor_ip,
          user_id: user.id,
        });
      } else {
        await announcement.updateOne({
          $inc: { views: 1 },
        });
        AnnouncementViewModel.create({
          announcement_id: announcement._id,
          ip_address_v4: ctx.visitor_ip,
        });
      }
    }
    return true;
  }
}

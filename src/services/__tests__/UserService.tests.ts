import { describe, expect, test, beforeEach } from "@jest/globals";
import { User } from "../../entities/User";
import { UserRoles } from "../../entities/User/Roles";
import { UserService } from "../UserService";
import { nanoid } from "nanoid";
import { AccessTypeEnum } from "../../entities/User/AccessType";
import {
  CountryModel,
  InstitutionModel,
  IpRangeModel,
  OrderModel,
  UserModel,
} from "../../entities";
import dayjs from "dayjs";
import { OrderType } from "../../entities/Order/OrderType";
import { OrderStatus } from "../../entities/Order/OrderStatus";
import { MatchedBy } from "../../enums/MatchedBy";
import { Doc } from "../../types/UserDoc";
import { Institution } from "../../entities/Institution/Institution";
import { Order } from "../../entities/Order/Order";
import { ipv4ToLong } from "../../utils/ipv4ToLong";
import { user_access_cache } from "../../api/cache";
describe("UserService", () => {
  describe("userAccessType", () => {
    it("Countries should be initialized", async () => {
      const countries = await CountryModel.count();
      expect(countries).not.toBe(0);
    });

    describe("Free Access", () => {
      const user: User = new User();
      beforeEach(() => {
        user._id = nanoid();
        user.role = UserRoles.user;
        user.countryCode = "UA"; //Ukraine
      });
      test("Given user is accessing from free countries, it should return `FreeAccess` AccessType", async () => {
        const access = await UserService.userAccessType(user, "");
        expect(access.accessType).toBe(AccessTypeEnum.FreeAccess);
        expect(access.institution_id).toBeUndefined();
      });
    });

    describe("Restricted Access", () => {
      const user: User = new User();
      beforeEach(async () => {
        user._id = nanoid();
        user.role = UserRoles.user;
        user.countryCode = "US";
      });
      test("Given user is accessing from a restricted country, it should return `RequireSubscription` AccessType", async () => {
        const access = await UserService.userAccessType(user, "");
        expect(access.accessType).toBe(AccessTypeEnum.RequireSubscription);
        expect(access.institution_id).toBeUndefined();
      });
    });

    describe("Evaluation Access", () => {
      const user: User = new User();
      beforeEach(async () => {
        user._id = nanoid();
        user.role = UserRoles.user;
        user.countryCode = "PH";
      });
      test("Given user is accessing from an evaluation, it should return `Evaluation` AccessType", async () => {
        const access = await UserService.userAccessType(user, "");
        expect(access.accessType).toBe(AccessTypeEnum.Evaluation);
        expect(access.institution_id).toBeUndefined();
      });
    });
    describe("Admin Access", () => {
      const user = new UserModel({
        _id: nanoid(),
        email: "john.doe@institution.edu",
        role: UserRoles.admin,
        institution_name: "Institution A",
      });
      const institution = new InstitutionModel({
        _id: nanoid(),
        domains: ["institution.edu"],
        name: "Institution A",
        restrictMatchByName: false,
      });
      beforeAll(async () => {
        await user.save();
        await institution.save();
      });
      test("Admin user should have `AdminAccess` accessType", async () => {
        const access = await UserService.userAccessType(user, "");
        expect(access.accessType).toBe(AccessTypeEnum.AdminAccess);
      });
      test("Admin user should still be matched with an institution if applicable", async () => {
        const access = await UserService.userAccessType(user, "");
        expect(access.institution_id).toBe(institution._id);
      });

      afterAll(async () => {
        await institution.remove();
        await user.remove();
      });
    });

    describe("Individual Subscription Access", () => {
      const user = new UserModel({
        _id: nanoid(),
        email: "john.doe@institution.edu",
        role: UserRoles.user,
      });
      const order = new OrderModel({
        _id: nanoid(),
        user_id: user._id,
        end: dayjs().add(1, "day").toDate(),
        start: dayjs().toDate(),
        type: OrderType.individual,
        amount: 3000,
        description: "Test subscription",
        status: OrderStatus.Active,
        deleted: false,
      });
      beforeAll(async () => {
        await user.save();
        await order.save();
      });
      test("User with individual subscription should get `IndividualSubscription` accessType", async () => {
        const access = await UserService.userAccessType(user, "");
        expect(access.accessType).toBe(AccessTypeEnum.IndividualSubscription);
        expect(access.institution_id).toBeUndefined();
      });
      test("User with individual trial should get `IndividualTrial` accessType", async () => {
        order.type = OrderType.trial;
        await order.save();
        const access = await UserService.userAccessType(user, "");
        expect(access.accessType).toBe(AccessTypeEnum.IndividualTrial);
        expect(access.institution_id).toBeUndefined();
      });
      afterAll(async () => {
        await order.remove();
        await user.remove();
      });
    });

    describe("Individual Subscription Access Matched to an Institution", () => {
      const user = new UserModel({
        _id: nanoid(),
        email: "john.doe@institution.edu",
        role: UserRoles.user,
        emailVerifiedAt: dayjs().toDate(),
      });
      const order = new OrderModel({
        _id: nanoid(),
        user_id: user._id,
        end: dayjs().add(1, "day").toDate(),
        start: dayjs().toDate(),
        type: OrderType.individual,
        amount: 3000,
        description: "Test subscription",
        status: OrderStatus.Active,
        deleted: false,
      });

      const institution = new InstitutionModel({
        _id: nanoid(),
        domains: ["institution.edu"],
        name: "Institution A",
      });
      beforeAll(async () => {
        await user.save();
        await order.save();
        await institution.save();
      });
      test("User with individual subscription should still be matched to an Institution if applicable", async () => {
        const access = await UserService.userAccessType(user, "");
        expect(access.accessType).toBe(AccessTypeEnum.IndividualSubscription);
        expect(access.institution_id).toBe(institution._id);
      });
      test("User with individual trial should still be matched to an Institution if applicable", async () => {
        order.type = OrderType.trial;
        await order.save();
        const access = await UserService.userAccessType(user, "");
        expect(access.accessType).toBe(AccessTypeEnum.IndividualTrial);
        expect(access.institution_id).toBe(institution._id);
      });
      afterAll(async () => {
        await order.remove();
        await user.remove();
        await institution.remove();
      });
    });

    describe("Awaiting Email Confirmation access", () => {
      let user: Doc<User> | null = null;
      let institution: Doc<Institution> | null = null;
      let order: Doc<Order> | null = null;
      beforeEach(async () => {
        user = new UserModel({
          _id: nanoid(),
          email: "john.doe@institution.edu",
          role: UserRoles.user,
        });
        institution = new InstitutionModel({
          _id: nanoid(),
          domains: ["institution.edu"],
          name: "Institution A",
        });
        order = new OrderModel({
          institution: institution._id,
          end: dayjs().add(1, "day").toDate(),
          start: dayjs().toDate(),
          type: OrderType.standard,
          amount: 3000,
          description: "Test subscription",
          status: OrderStatus.Active,
          deleted: false,
        });
        await user.save();
        await institution.save();
        await order.save();
      });

      afterEach(async () => {
        await user!.remove();
        await institution!.remove();
        await order!.remove();
      });

      test("If user is matched via email, email is not verified it should give `AwaitingEmailConfirmation` accessType", async () => {
        const access = await UserService.userAccessType(user!, "");

        expect(access.matchedBy).toBe(MatchedBy.Email);
        expect(access.accessType).toBe(
          AccessTypeEnum.AwaitingEmailConfirmation,
        );
        expect(access.institution_id).toBe(institution!._id);
      });

      test("If user is matched via email, email confirmation expired it should give `EmailExpired` accessType", async () => {
        user!.emailVerifiedAt = dayjs().subtract(367, "day").toDate();
        await user?.save();
        const access = await UserService.userAccessType(user!, "");

        expect(access.matchedBy).toBe(MatchedBy.Email);
        expect(access.accessType).toBe(AccessTypeEnum.EmailConfirmationExpired);
        expect(access.institution_id).toBe(institution!._id);
      });

      test("If user is matched via inst email, email is not verified it should give `AwaitingEmailConfirmation` accessType", async () => {
        user!.email = "test@gmail.com";
        user!.inst_email = "john.doe@institution.edu";
        await user!.save();
        const access = await UserService.userAccessType(user!, "");

        expect(access.matchedBy).toBe(MatchedBy.InstitutionalEmail);
        expect(access.accessType).toBe(
          AccessTypeEnum.AwaitingEmailConfirmation,
        );
        expect(access.institution_id).toBe(institution!._id);
      });
      test("If user is matched via inst email, email confirmation expired it should give `EmailExpired` accessType", async () => {
        user!.email = "test@gmail.com";
        user!.inst_email = "john.doe@institution.edu";
        user!.instEmailVerifiedAt = dayjs().subtract(367, "day").toDate();
        await user!.save();
        const access = await UserService.userAccessType(user!, "");

        expect(access.matchedBy).toBe(MatchedBy.InstitutionalEmail);
        expect(access.accessType).toBe(AccessTypeEnum.EmailConfirmationExpired);
        expect(access.institution_id).toBe(institution!._id);
      });
    });
    describe("Institutional Access", () => {
      let user: Doc<User> | null = null;
      let institution: Doc<Institution> | null = null;
      let order: Doc<Order> | null = null;
      beforeEach(async () => {
        user = new UserModel({
          _id: nanoid(),
          email: "john.doe@institution.edu",
          role: UserRoles.user,
          emailVerifiedAt: new Date(),
          instEmailVerifiedAt: new Date(),
        });
        institution = new InstitutionModel({
          _id: nanoid(),
          domains: ["institution.edu"],
          name: "Institution A",
        });
        order = new OrderModel({
          institution: institution._id,
          end: dayjs().add(1, "day").toDate(),
          start: dayjs().toDate(),
          type: OrderType.standard,
          amount: 3000,
          description: "Test subscription",
          status: OrderStatus.Active,
          deleted: false,
        });
        await user.save();
        await institution.save();
        await order.save();
      });

      afterEach(async () => {
        await user!.remove();
        await institution!.remove();
        await order!.remove();
      });

      test("If user is matched via email, it should give `InstitutionalAccess` accessType", async () => {
        const access = await UserService.userAccessType(user!, "");
        expect(access.accessType).toBe(
          AccessTypeEnum.InstitutionalSubscription,
        );
        expect(access.matchedBy).toBe(MatchedBy.Email);
        expect(access.institution_id).toBe(institution!._id);
      });
      test("If user is matched via inst email, it should give `InstitutionalAccess` accessType", async () => {
        user!.email = "test@gmail.com";
        user!.inst_email = "john.doe@institution.edu";
        await user!.save();
        const access = await UserService.userAccessType(user!, "");
        expect(access.accessType).toBe(
          AccessTypeEnum.InstitutionalSubscription,
        );
        expect(access.matchedBy).toBe(MatchedBy.InstitutionalEmail);
        expect(access.institution_id).toBe(institution!._id);
      });

      test("If user is matched via Institution name, it should give `InstitutionalAccess` accessType", async () => {
        institution!.restrictMatchByName = false;
        user!.institution_name = "Institution A";
        await institution?.save();
        await user?.save();
        const access = await UserService.userAccessType(user!, "");
        expect(access.accessType).toBe(
          AccessTypeEnum.InstitutionalSubscription,
        );
        expect(access.matchedBy).toBe(MatchedBy.InstitutionName);
        expect(access.institution_id).toBe(institution!._id);
      });

      test("If user is matched via IP, it should give `InstitutionalAccess` accessType", async () => {
        const test_ip = "23.81.0.5";
        const iprange = new IpRangeModel({
          institution: institution?._id,
          start: ipv4ToLong(test_ip),
          end: ipv4ToLong(test_ip),
        });

        await iprange.save();
        await institution?.save();
        await user?.save();
        const access = await UserService.userAccessType(user!, test_ip);
        expect(access.accessType).toBe(
          AccessTypeEnum.InstitutionalSubscription,
        );
        expect(access.matchedBy).toBe(MatchedBy.IP);
        expect(access.institution_id).toBe(institution!._id);
      });
      test("If user is matched via OffsiteAccess, it should give `InstitutionalAccess` accessType", async () => {
        const test_ip = "23.81.0.6";
        const offsite_ip = "144.1.11.1";
        const iprange = new IpRangeModel({
          institution: institution?._id,
          start: ipv4ToLong(test_ip),
          end: ipv4ToLong(test_ip),
        });

        await iprange.save();
        await institution?.save();
        const access = await UserService.userAccessType(user!, test_ip);
        expect(access.accessType).toBe(
          AccessTypeEnum.InstitutionalSubscription,
        );
        expect(access.matchedBy).toBe(MatchedBy.IP);
        expect(access.institution_id).toBe(institution!._id);

        // simulate ip change in next session
        user!.prev_source_ip = test_ip;
        //delete memory cache
        UserService.updateUserByAccess(user!, access);
        await user!.save();
        user_access_cache.del(user!._id);

        const newAccess = await UserService.userAccessType(user!, offsite_ip);
        expect(newAccess.matchedBy).toBe(MatchedBy.OffsiteAccess);
        expect(newAccess.viaTemporaryIp).toBe(true);
        expect(dayjs(newAccess.expiry).format("MM-DD-YYYY")).toBe(
          dayjs().add(14, "day").format("MM-DD-YYYY"),
        );
      });

      test("If user is matched via Admin manualy, it should give `InstitutionalAccess` accessType", async () => {
        user!.institution = institution?._id;
        user!.matchedBy = MatchedBy.Admin;
        const access = await UserService.userAccessType(user!, "");
        expect(access.accessType).toBe(
          AccessTypeEnum.InstitutionalSubscription,
        );
        expect(access.matchedBy).toBe(MatchedBy.Admin);
        expect(access.institution_id).toBe(institution!._id);
      });

      //TODO: write test if the user is matched with multiple institutions.
    });

    describe("User ismatched to an institution but no order", () => {
      let user: Doc<User> | null = null;
      let institution: Doc<Institution> | null = null;
      beforeEach(async () => {
        user = new UserModel({
          _id: nanoid(),
          email: "john.doe@institution.edu",
          role: UserRoles.user,
          emailVerifiedAt: dayjs().toDate(),
        });
        institution = new InstitutionModel({
          _id: nanoid(),
          domains: ["institution.edu"],
          name: "Institution A",
        });

        await user.save();
        await institution.save();
      });

      afterEach(async () => {
        await user?.remove();
        await institution!.remove();
      });

      test("If user is matched via email, it should give `RequireSubscription` accessType", async () => {
        const access = await UserService.userAccessType(user!, "");
        expect(access.accessType).toBe(AccessTypeEnum.RequireSubscription);
        expect(access.matchedBy).toBe(MatchedBy.Email);
        expect(access.institution_id).toBe(institution!._id);
      });

      test("If user is matched via Institution name, it should give `RequireSubscription` accessType", async () => {
        institution!.restrictMatchByName = false;
        user!.institution_name = "Institution A";
        user!.email = "john.doe@x.edu";
        await institution?.save();
        await user?.save();
        const access = await UserService.userAccessType(user!, "");
        expect(access.accessType).toBe(AccessTypeEnum.RequireSubscription);
        expect(access.matchedBy).toBe(MatchedBy.InstitutionName);
        expect(access.institution_id).toBe(institution!._id);
      });

      test("If user is matched via IP, it should give RequireSubscription accessType", async () => {
        const test_ip = "23.81.0.10";
        const iprange = new IpRangeModel({
          institution: institution?._id,
          start: ipv4ToLong(test_ip),
          end: ipv4ToLong(test_ip),
        });

        await iprange.save();
        await institution?.save();
        user!.email = "john.doe@x.edu";
        await user?.save();
        const access = await UserService.userAccessType(user!, test_ip);
        expect(access.accessType).toBe(AccessTypeEnum.RequireSubscription);
        expect(access.institution_id).toBe(institution!._id);
        expect(access.matchedBy).toBe(MatchedBy.IP);
      });
      test("If user is matched via OffsiteAccess, it should give RequireSubscription accessType", async () => {
        const test_ip = "23.81.0.11";
        const offsite_ip = "144.1.11.1";
        const iprange = new IpRangeModel({
          institution: institution?._id,
          start: ipv4ToLong(test_ip),
          end: ipv4ToLong(test_ip),
        });

        user!.email = "john.doe@x.edu";
        await iprange.save();
        await institution?.save();
        const access = await UserService.userAccessType(user!, test_ip);

        expect(access.accessType).toBe(AccessTypeEnum.RequireSubscription);
        expect(access.institution_id).toBe(institution!._id);
        expect(access.matchedBy).toBe(MatchedBy.IP);

        // simulate ip change in next session
        user!.prev_source_ip = test_ip;
        //delete memory cache
        UserService.updateUserByAccess(user!, access);
        await user!.save();
        user_access_cache.del(user!._id);

        const newAccess = await UserService.userAccessType(user!, offsite_ip);
        expect(newAccess.matchedBy).toBe(MatchedBy.NotMatched);
        expect(newAccess.viaTemporaryIp).toBeUndefined();
      });

      test("If user is matched via Admin manualy, it should give `RequireSubscription` accessType", async () => {
        user!.institution = institution?._id;
        user!.matchedBy = MatchedBy.Admin;
        user!.email = "john.doe@x.edu";
        const access = await UserService.userAccessType(user!, "");
        expect(access.accessType).toBe(AccessTypeEnum.RequireSubscription);
        expect(access.matchedBy).toBe(MatchedBy.Admin);
        expect(access.institution_id).toBe(institution!._id);
      });

      //TODO: write test if the user is matched with multiple institutions.
    });
  });
});

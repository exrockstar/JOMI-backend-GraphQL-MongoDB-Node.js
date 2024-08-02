import { CountryModel, UserTypeModel } from "../../entities";
import { PriceService } from "../PriceService";

describe("PriceService", () => {
  it("Countries should be initialized", async () => {
    const countries = await CountryModel.count();
    expect(countries).not.toBe(0);
  });

  describe("PriceService.getPricesForUserType for United States", () => {
    let countryCode = "US";
    it("Attending Products Should have the Correct Price", async () => {
      const userTypes = await UserTypeModel.find({
        pricinAGracket: {
          $in: [
            "prod_surgical_attending",
            "prod_other_physician",
            "prod_rural_surgeon",
            "prod_corporate",
          ],
        },
      });

      for (const userType of userTypes) {
        const prices = await PriceService.getPricesByUserType(
          userType.type,
          countryCode,
        );
        const attendingProducts = [
          "prod_surgical_attending",
          "prod_other_physician",
          "prod_rural_surgeon",
          "prod_corporate",
        ];
        for (const price of prices) {
          if (attendingProducts.includes(price.product)) {
            if (price.interval == "year") {
              expect(price.unit_amount).toBe(100000);
            } else {
              expect(price.unit_amount).toBe(10000);
            }
          }
        }
      }
    });

    it("PA/Resident Products Should have the Correct Price", async () => {
      const userTypes = await UserTypeModel.find({
        pricingBracket: {
          $in: ["prod_physician_assistant", "prod_surgical_resident"],
        },
      });

      for (const userType of userTypes) {
        const prices = await PriceService.getPricesByUserType(
          userType.type,
          countryCode,
        );

        for (const price of prices) {
          if (price.interval == "year") {
            expect(price.unit_amount).toBe(25000);
          } else {
            expect(price.unit_amount).toBe(5000);
          }
        }
      }
    });
    it("Trainee Products Should have the Correct Price", async () => {
      const userTypes = await UserTypeModel.find({
        pricingBracket: {
          $in: [
            "prod_nursing_student",
            "prod_surgical_tech",
            "prod_operating_room_nurse",
            "prod_surgical_assistant",
            "prod_medical_student",
            "prod_other_medical_professional",
            "prod_other",
            "prod_surgical_tech_student",
            "prod_pre-med",
          ],
        },
      });

      for (const userType of userTypes) {
        const prices = await PriceService.getPricesByUserType(
          userType.type,
          countryCode,
        );

        for (const price of prices) {
          if (price.interval == "year") {
            expect(price.unit_amount).toBe(25000);
          } else {
            expect(price.unit_amount).toBe(3000);
          }
        }
      }
    });
  });

  describe("PriceService.getPricesForUserType for UK", () => {
    const countryCode = "GB";
    it("Country United Kingdom should exist", async () => {
      const uk = await CountryModel.findOne({ code: countryCode });
      expect(uk?.code).toBe(countryCode);
    });
    it("Attending Products Should have the Correct Price", async () => {
      const userTypes = await UserTypeModel.find({
        pricingBracket: {
          $in: [
            "prod_surgical_attending",
            "prod_other_physician",
            "prod_rural_surgeon",
            "prod_corporate",
          ],
        },
      });

      for (const userType of userTypes) {
        const prices = await PriceService.getPricesByUserType(
          userType.type,
          countryCode,
        );
        const attendingProducts = [
          "prod_surgical_attending",
          "prod_other_physician",
          "prod_rural_surgeon",
          "prod_corporate",
        ];
        for (const price of prices) {
          if (attendingProducts.includes(price.product)) {
            if (price.interval == "year") {
              expect(price.unit_amount).toBe(84000);
            } else {
              expect(price.unit_amount).toBe(8400);
            }
          }
        }
      }
    });

    it("PA/Resident Products Should have the Correct Price", async () => {
      const userTypes = await UserTypeModel.find({
        pricingBracket: {
          $in: ["prod_physician_assistant", "prod_surgical_resident"],
        },
      });

      for (const userType of userTypes) {
        const prices = await PriceService.getPricesByUserType(
          userType.type,
          countryCode,
        );

        for (const price of prices) {
          if (price.interval == "year") {
            expect(price.unit_amount).toBe(21000);
          } else {
            expect(price.unit_amount).toBe(4200);
          }
        }
      }
    });
    it("Trainee Products Should have the Correct Price", async () => {
      const userTypes = await UserTypeModel.find({
        pricingBracket: {
          $in: [
            "prod_nursing_student",
            "prod_surgical_tech",
            "prod_operating_room_nurse",
            "prod_surgical_assistant",
            "prod_medical_student",
            "prod_other_medical_professional",
            "prod_other",
            "prod_surgical_tech_student",
            "prod_pre-med",
          ],
        },
      });

      for (const userType of userTypes) {
        const prices = await PriceService.getPricesByUserType(
          userType.type,
          countryCode,
        );

        for (const price of prices) {
          if (price.interval == "year") {
            expect(price.unit_amount).toBe(21000);
          } else {
            expect(price.unit_amount).toBe(2520);
          }
        }
      }
    });
  });

  describe("When calculating prices for countries with multiplier", () => {
    let countryCode = "GB";
    beforeAll(async () => {
      const country = await CountryModel.findOne({ code: countryCode });
      if (country) {
        country.multiplier = 5;
        await country.save();
      }
    });

    it("Country should exist", async () => {
      const country = await CountryModel.findOne({ code: countryCode });
      expect(country?.code).toBe(countryCode);
    });

    it("Attending Products Should have the Correct Price", async () => {
      const userTypes = await UserTypeModel.find({
        pricingBracket: {
          $in: [
            "prod_surgical_attending",
            "prod_other_physician",
            "prod_rural_surgeon",
            "prod_corporate",
          ],
        },
      });

      for (const userType of userTypes) {
        const prices = await PriceService.getPricesByUserType(
          userType.type,
          countryCode,
        );
        const attendingProducts = [
          "prod_surgical_attending",
          "prod_other_physician",
          "prod_rural_surgeon",
          "prod_corporate",
        ];
        for (const price of prices) {
          if (attendingProducts.includes(price.product)) {
            if (price.interval == "year") {
              expect(price.unit_amount).toBe(42000);
            } else {
              expect(price.unit_amount).toBe(8400);
            }
          }
        }
      }
    });

    it("PA/Resident Products Should have the Correct Price", async () => {
      const userTypes = await UserTypeModel.find({
        pricingBracket: {
          $in: ["prod_physician_assistant", "prod_surgical_resident"],
        },
      });

      for (const userType of userTypes) {
        const prices = await PriceService.getPricesByUserType(
          userType.type,
          countryCode,
        );

        for (const price of prices) {
          if (price.interval == "year") {
            expect(price.unit_amount).toBe(21000);
          } else {
            expect(price.unit_amount).toBe(4200);
          }
        }
      }
    });
    it("Trainee Products Should have the Correct Price", async () => {
      const userTypes = await UserTypeModel.find({
        pricingBracket: {
          $in: [
            "prod_nursing_student",
            "prod_surgical_tech",
            "prod_operating_room_nurse",
            "prod_surgical_assistant",
            "prod_medical_student",
            "prod_other_medical_professional",
            "prod_other",
            "prod_surgical_tech_student",
            "prod_pre-med",
          ],
        },
      });

      for (const userType of userTypes) {
        const prices = await PriceService.getPricesByUserType(
          userType.type,
          countryCode,
        );

        for (const price of prices) {
          if (price.interval == "year") {
            expect(price.unit_amount).toBe(12600);
          } else {
            expect(price.unit_amount).toBe(2520);
          }
        }
      }
    });
  });
});

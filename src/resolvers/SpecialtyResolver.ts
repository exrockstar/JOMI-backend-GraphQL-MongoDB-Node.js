import { Query, UseMiddleware } from "type-graphql";
import { SpecialtyModel } from "../entities";
import { Specialty } from "../entities/Specialty/Specialty";
import { LogMiddleware } from "../middleware/LogMiddleware";

export class SpecialtyResolver {
  @Query(() => [Specialty], { nullable: true })
  @UseMiddleware(LogMiddleware)
  async specialties(): Promise<Specialty[] | null> {
    const specialties = await SpecialtyModel.find({});
    return specialties;
  }
}

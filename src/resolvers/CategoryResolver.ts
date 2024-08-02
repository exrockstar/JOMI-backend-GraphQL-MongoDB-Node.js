import { Query, Resolver, UseMiddleware } from "type-graphql";
import { CategoryModel } from "../entities";
import { Category } from "../entities/Category/CategoryEntity";
import { LogMiddleware } from "../middleware/LogMiddleware";

@Resolver()
export class CategoryResolver {
  @Query(() => [Category], { nullable: true })
  @UseMiddleware(LogMiddleware)
  async categories() {
    return CategoryModel.find({}).sort({ displayName: 1 }).lean();
  }
}

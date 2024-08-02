import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class InstitutionAccessStats {
  @Field()
  users: number;

  @Field()
  activeUsers: number;

  @Field()
  totalLogins: number;

  @Field()
  totalArticleViews: number;

  @Field()
  articleViewsByUser: number;

  @Field()
  anonymousArticleViews: number;

  @Field()
  videoBlocks: number;

  @Field()
  uniqueVideoBlocks: number;

  @Field()
  anonUserCount: number;
}

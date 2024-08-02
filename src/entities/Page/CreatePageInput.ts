import { Field, InputType } from "type-graphql";

@InputType()
export class CreatePageInput {
    @Field(() => String, {nullable: true})
    author: string;
  
    @Field(() => String, {nullable: true})
    content: string;
  
    @Field(() => String, {nullable: true})
    status: any;
  
    @Field(() => String)
    title: string;
  
    @Field(() => String, {nullable: true})
    slug: string;

    @Field(() => String, {nullable: true})
    password: string;

    @Field(() => [String], {nullable: true})
    scripts: [string];
}

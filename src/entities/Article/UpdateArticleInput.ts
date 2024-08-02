import { Field, InputType, ID } from "type-graphql";
import { UpdateContentInput } from "./UpdateContentInput";

@InputType()
export class UpdateArticleInput {
    @Field(() => ID)
    id: string;

    @Field(() => String, { nullable: true })
    title: string;

    @Field(() => String, { nullable: true })
    publication_id: string;

    @Field(() => String, { nullable: true })
    production_id: string;

    @Field(() => String, { nullable: true })
    status: string;

    @Field(() => Date, { nullable: true })
    published: Date;

    @Field(() => Date, { nullable: true })
    preprint_date: Date;

    @Field(() => Boolean, { nullable: true })
    has_complete_abstract: boolean;

    @Field(() => String, { nullable: true })
    restrictions?: any;

    @Field(() => String, { nullable: true })
    DOIStatus?: string;

    @Field(() => UpdateContentInput, { nullable: true })
    content?: string;
}

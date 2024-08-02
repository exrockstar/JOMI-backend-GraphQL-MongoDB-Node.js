import { Field, InputType } from "type-graphql";
import { RedirectStatus } from "./RedirectStatus";

@InputType()
export class CreateRedirectInput {
    @Field(() => String, { nullable: true})
    name: string;
  
    @Field(() => String)
    from: string;
  
    @Field(() => String)
    to: string;
  
    @Field(() => String, {nullable: true})
    type: RedirectStatus;
  
    @Field(() => Boolean, {nullable: true})
    track: boolean;
}

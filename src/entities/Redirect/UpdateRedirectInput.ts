import { Field, InputType, ID } from "type-graphql";
import { RedirectStatus } from "./RedirectStatus";

@InputType()
export class UpdateRedirectInput {
    @Field(()=> ID)
    id: string;
  
    @Field(() => String, { nullable: true })
    name: string;
  
    @Field(() => String, {nullable: true})
    from: string;
  
    @Field(() => String, {nullable: true})
    to: string;
  
    @Field(() => String, {nullable: true})
    type: RedirectStatus;
  
    @Field(() => Boolean, {nullable: true})
    track: boolean;
}

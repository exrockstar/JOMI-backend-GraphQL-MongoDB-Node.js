import { prop } from "@typegoose/typegoose";
import { Field, InputType, ObjectType } from "type-graphql";

@ObjectType()
export class ContactPerson {
  @Field(() => String)
  @prop({ default: "" })
  name: string;

  @Field(() => String)
  @prop({ default: "" })
  email: string;

  @Field(() => String)
  @prop({ default: "N/A" })
  role: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "Request this article with your library to gain access." })
  notes?: string;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isMainContact?: boolean;
}

@InputType()
export class ContactPersonInput extends ContactPerson {
  @Field(() => String)
  name: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  role: string;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => Boolean)
  isMainContact: boolean;
}

@ObjectType()
export class InstitutionContacts {
  /**
   * Ideally we should drop this field once v4 is fully replaced
   * since it creates extra data and complexity in updating points of contact.
   */
  @Field(() => ContactPerson)
  @prop({ type: () => ContactPerson, _id: false, default: () => new ContactPerson() })
  main: ContactPerson;
}

import { prop } from "@typegoose/typegoose";

export class Affiliation {
  @prop()
  affiliation_id: string;
  @prop()
  name: string;
}

export class AuthorAffiliations {
  @prop()
  author_id: string;
  @prop()
  display_name: string;

  @prop()
  name_last: string;

  @prop({ type: Affiliation })
  affiliations: Affiliation[];
}

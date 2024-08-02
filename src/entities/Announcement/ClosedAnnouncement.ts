import { ModelOptions, prop } from "@typegoose/typegoose";

@ModelOptions({
  schemaOptions: {
    collection: "closed_announcements",
  },
})
export class ClosedAnnouncement {
  @prop({ index: true })
  userId: string;

  @prop({ index: true })
  anon_link_id: string;

  @prop()
  announcement_cache_id: string;
}

import { Field, Float, InputType, Int } from "type-graphql";

@InputType()
export class TrackVideoTimeInput {
  @Field(() => String)
  vidWatchId: string;

  @Field(() => Float)
  time_watched: number;

  @Field(() => Int)
  increment: number;
}

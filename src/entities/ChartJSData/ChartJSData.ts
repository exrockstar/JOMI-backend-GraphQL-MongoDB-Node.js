import { Field, Float, ObjectType } from "type-graphql";

@ObjectType()
export class ChartDataset {
  @Field(() => [Float])
  data: number[];

  @Field()
  label: string;
}

@ObjectType()
export class ChartData {
  @Field(() => [ChartDataset])
  datasets: ChartDataset[] = [];

  @Field(() => [String])
  labels: string[];
}

import { Job } from "agenda";

export abstract class JobDefinition {
  constructor(public name: string, public schedule?: string) {}

  abstract execute(job: Job): Promise<any>;
}

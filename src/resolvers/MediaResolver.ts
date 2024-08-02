import { Arg, Query, Mutation } from "type-graphql";
import { MediaModel } from "../entities";

import { Media } from "../entities/Media/Media";
import { MediaInput } from "../entities/Media/MediaInput";
import { MediaOutput } from "../entities/Media/MediaOutput";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import { UpdateMediaLibraryInput } from "../entities/Media/UpdateMediaLibraryInput";

export class MediaResolver {
  @Query(() => MediaOutput)
  async files(@Arg("input", { nullable: true }) input: MediaInput) {
    const { skip, limit, filters, sort_by, sort_order } =
      input ?? new MediaInput();

    let sort = {};
    let query: any = {};
    let queries: any[] = [];

    queries =
      filters?.map((filter) => {
        const { value, operation, columnName } = filter;
        const query = {
          [columnName]: getQueryFromOperation(operation, value),
        };
        return query;
      }) ?? [];
    queries.push({
      filename: { $not: { $regex: /\.xml$/ } },
    });
    if (queries?.length) {
      query = { $and: queries };
    }

    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { uploadDate: -1 };
    }

    const [files, count] = await Promise.all([
      //*NOTE: for some reason directly calling mongoose function such as MediaModel.where does not work
      MediaModel.collection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      MediaModel.collection.countDocuments(query),
    ]);

    return {
      count,
      files,
    };
  }

  @Mutation(() => String)
  async deleteMedia(@Arg("_id") _id: string) {
    const media = await MediaModel.findByIdAndRemove(_id);
    if (!media) {
      throw new Error(`Media does not exist. _id: ${_id}`);
    }

    return _id;
  }

  @Mutation(() => Media, { nullable: true })
  async updateMediaLibrary(
    @Arg("input") input: UpdateMediaLibraryInput,
  ): Promise<Media | null> {
    const id = input.id;
    const data = {
      metadata: {
        title: input.title,
        description: input.description,
      },
    };
    const media = await MediaModel.findByIdAndUpdate(id, {
      $set: {
        ...data,
      },
    });

    if (!media) {
      throw new Error("Media not found.");
    }
    return media;
  }
}

import { registerEnumType } from "type-graphql";

export enum FileExtensions {
  png = "png",
  jpeg = "jpeg",
  jpg = "jpg",
  webp = "webp",
  svg = "svg",
}

export type FileFormat = Uppercase<FileExtensions>;

registerEnumType(FileExtensions, {
  name: "FileExtensions",
});

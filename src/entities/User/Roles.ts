// role on the website
// user - default visitor, customer, etc.
// admin - allows access to CMS and other internal tools hosted on the site
// author - special user with affiliations, biography, and linked to articles
// librarian - special user with access to usage statistics
// superadmin - tasks done by client or software

import { registerEnumType } from "type-graphql";

export enum UserRoles {
  user = "user",
  author = "author",
  librarian = "librarian",
  admin = "admin",
  superadmin = "superadmin",
}

registerEnumType(UserRoles, {
  name: "UserRoles",
});

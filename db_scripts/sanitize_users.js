//update all users that are not from jomi to have sanitized emails
db.users.updateMany({ email: { $not: { $regex: /@jomi.com/ } } }, [
  {
    $set: {
      email: {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
      inst_email: {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
      "name.last": "Doe",
      display_name: "John Doe",
      phone: "+1 XXX XXX XXX",
    },
  },
]);

db.users.updateMany({ role: { $nin: ["admin", "author"] } }, [
  {
    $set: {
      email: {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
      inst_email: {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
      "name.last": "Doe",
      display_name: "John Doe",
      phone: "+1 XXX XXX XXX",
    },
  },
]);

//update social emails if it exists
db.users.updateMany({ "social.google": { $exists: true }, role: "user" }, [
  {
    $set: {
      "social.google.email": {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
      "social.google.familyName": "Doe",
    },
  },
]);

db.users.updateMany({ "social.facebook": { $exists: true }, role: "user" }, [
  {
    $set: {
      "social.facebook.email": {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
      "social.facebook.familyName": "Doe",
    },
  },
]);

db.users.updateMany({ "social.linkedin": { $exists: true }, role: "user" }, [
  {
    $set: {
      "social.linkedin.email": {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
      "social.linkedin.familyName": "Doe",
    },
  },
]);

db.users.updateMany({ "social.email": { $exists: true }, role: "user" }, [
  {
    $set: {
      "social.email": {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
      "social.familyName": "Doe",
    },
  },
]);

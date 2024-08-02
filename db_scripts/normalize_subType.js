/**
 * Normalize the database so that all users has a subType being set
 */
db.users.updateMany(
  { "subscription.subType": { $eq: null } },
  { $set: { "subscription.subType": "notCreated" } },
);

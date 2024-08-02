//updates institution poc to be sanitized
db.institutions.updateMany({}, [
  {
    $set: {
      "contacts.main.email": {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
    },
  },
]);

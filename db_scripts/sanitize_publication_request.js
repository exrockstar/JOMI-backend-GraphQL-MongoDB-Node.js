db.publicationrequests.updateMany({}, [
  {
    $set: {
      email: {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
    },
  },
]);

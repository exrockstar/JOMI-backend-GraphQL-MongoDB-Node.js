//Update triage queue contact info
db.triagequeues.updateMany({}, [
  {
    $set: {
      "additional_info.response": {
        $concat: [
          `Dear Administration,
           I would like to request that our institution subscribes to JOMI Surgical Video Journal (https://jomi.com).
           JOMI helps me prepare for cases: I am able to watch procedures from incision to closure with step-by-step narration by the operating surgeon.
           The cases are peer-reviewed, professionally produced, and are effectively a shadowing experience that I cannot get anywhere else.This is unique and very valuable.
           If you have any questions, I can be reached at `,
          "dev+",
          "$user",
          "@jomi.com",
        ],
      },
      "additional_info.contactInfo": {
        $concat: ["dev+", { $toLower: "$_id" }, "@jomi.com"],
      },
    },
  },
]);

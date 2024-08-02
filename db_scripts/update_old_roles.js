/**
 * Users created way back have roles like medical student. which is not in the current schema. this script will normalize those to users.
 */
db.users.updateMany(
  {
    role: {
      $in: [
        "Medical Student",
        "Other",
        "Other Medical Professional",
        "Other Physician",
        "Patient",
        "Pre-Med",
        "Surgical Attending",
        "Surgical Resident",
      ],
    },
  },
  { $set: { role: "user" } },
);

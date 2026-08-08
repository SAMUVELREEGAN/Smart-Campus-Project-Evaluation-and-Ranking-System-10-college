const User = require("./models/User");

const defaultUsers = [
  {
    name: "System Admin",
    email: "test@gamil.com",
    password: "123",
    role: "admin",
    department: "Administration",
    phone: "9999999999",
  },
  {
    name: "Demo Student",
    email: "student@campus.com",
    password: "123",
    role: "student",
    department: "Computer Science",
    studentId: "STU001",
    phone: "8888888888",
  },
  {
    name: "Demo Staff",
    email: "staff@campus.com",
    password: "123",
    role: "staff",
    department: "Computer Science",
    phone: "7777777777",
  },
];

async function seedDatabase() {
  console.log("Running seed...");
  let created = 0;
  let skipped = 0;

  for (const userData of defaultUsers) {
    const existing = await User.findOne({ email: userData.email.toLowerCase() });
    if (existing) {
      skipped += 1;
      continue;
    }
    await User.create(userData);
    created += 1;
    console.log(`Seeded ${userData.role}: ${userData.email}`);
  }

  console.log(`Seed complete. Created: ${created}, Skipped (existing): ${skipped}`);
}

module.exports = seedDatabase;

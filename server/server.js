const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const app = require("./app");

dotenv.config();

// Default Seed Accounts for Testing
const seedDefaultUsers = async () => {
  try {
    const adminExists = await User.findOne({ email: "admin@system.com" });
    if (!adminExists) {
      await User.create({
        name: "Admin User",
        email: "admin@system.com",
        password: "admin123",
        role: "Administrator",
        department: "IT & Admin",
        phone: "+1 555-0101",
      });
      console.log("Seeded Default Administrator: admin@system.com / admin123");
    }

    const receptionistExists = await User.findOne({ email: "receptionist@system.com" });
    if (!receptionistExists) {
      await User.create({
        name: "Sarah Receptionist",
        email: "receptionist@system.com",
        password: "receptionist123",
        role: "Receptionist",
        department: "Front Desk",
        phone: "+1 555-0102",
      });
      console.log("Seeded Default Receptionist: receptionist@system.com / receptionist123");
    }

    const employeeExists = await User.findOne({ email: "employee@system.com" });
    if (!employeeExists) {
      await User.create({
        name: "David Employee",
        email: "employee@system.com",
        password: "employee123",
        role: "Employee",
        department: "Engineering",
        phone: "+1 555-0103",
      });
      console.log("Seeded Default Employee: employee@system.com / employee123");
    }

    const employee2Exists = await User.findOne({ email: "john.employee@system.com" });
    if (!employee2Exists) {
      await User.create({
        name: "John Miller (Employee)",
        email: "john.employee@system.com",
        password: "employee123",
        role: "Employee",
        department: "Human Resources",
        phone: "+1 555-0104",
      });
      console.log("Seeded Second Employee: john.employee@system.com / employee123");
    }
  } catch (err) {
    console.warn("User seeding info:", err.message);
  }
};

// Connect DB & Seed
connectDB().then(() => {
  seedDefaultUsers();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on Port ${PORT}`);
});

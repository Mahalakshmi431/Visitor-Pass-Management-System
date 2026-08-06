const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const Visitor = require("./models/Visitor");
const ActivityLog = require("./models/ActivityLog");

dotenv.config();

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const users = [
  {
    name: "Admin User",
    email: "admin@system.com",
    password: "admin123",
    role: "Administrator",
    department: "IT & Admin",
    phone: "+1 555-0101",
  },
  {
    name: "Sarah Receptionist",
    email: "receptionist@system.com",
    password: "receptionist123",
    role: "Receptionist",
    department: "Front Desk",
    phone: "+1 555-0102",
  },
  {
    name: "David Employee",
    email: "employee@system.com",
    password: "employee123",
    role: "Employee",
    department: "Engineering",
    phone: "+1 555-0103",
  },
  {
    name: "John Miller",
    email: "john.employee@system.com",
    password: "employee123",
    role: "Employee",
    department: "Human Resources",
    phone: "+1 555-0104",
  },
];

const sampleVisitors = [
  {
    fullName: "Michael Scott",
    email: "michael.scott@dundermifflin.com",
    phone: "+1 555-0190",
    company: "Dunder Mifflin",
    govtIdType: "Driving License",
    govtIdNumber: "DL-1990-0231",
    purpose: "Client meeting to discuss paper supply contract",
    expectedTime: "10:30",
    status: "CHECKED_OUT",
  },
  {
    fullName: "Pam Beesly",
    email: "pam.beesly@dundermifflin.com",
    phone: "+1 555-0191",
    company: "Dunder Mifflin",
    govtIdType: "Aadhaar Card",
    govtIdNumber: "XXXX-1234-5678",
    purpose: "Interview for the Administrative Assistant position",
    expectedTime: "11:00",
    status: "CHECKED_IN",
  },
  {
    fullName: "Jim Halpert",
    email: "jim.halpert@dundermifflin.com",
    phone: "+1 555-0192",
    company: "Staples Inc.",
    govtIdType: "Passport",
    govtIdNumber: "P-9821-4455",
    purpose: "Vendor demo of office supplies",
    expectedTime: "12:15",
    status: "APPROVED",
  },
  {
    fullName: "Dwight Schrute",
    email: "dwight.schrute@schrutefarms.com",
    phone: "+1 555-0193",
    company: "Schrute Farms",
    govtIdType: "Voter ID",
    govtIdNumber: "VID-778812",
    purpose: "Partnership discussion for beet supply",
    expectedTime: "13:45",
    status: "PENDING",
  },
  {
    fullName: "Angela Martin",
    email: "angela.martin@dundermifflin.com",
    phone: "+1 555-0194",
    company: "Dunder Mifflin",
    govtIdType: "Aadhaar Card",
    govtIdNumber: "XXXX-4433-2211",
    purpose: "Audit document submission",
    expectedTime: "14:00",
    status: "REJECTED",
  },
];

const seed = async () => {
  await connectDB();

  const createdUsers = {};

  for (const u of users) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create(u);
      console.log(`Created user: ${u.email} (${u.role})`);
    } else {
      if (!user.demoPassword) {
        user.demoPassword = u.password;
        await user.save();
        console.log(`Backfilled demoPassword: ${u.email}`);
      }
      console.log(`User exists: ${u.email} (${u.role})`);
    }
    createdUsers[u.role + "_" + u.department] = user;
  }

  const employeeEng = createdUsers["Employee_Engineering"];
  const employeeHr = createdUsers["Employee_Human Resources"];
  const receptionist = createdUsers["Receptionist_Front Desk"];
  const admin = createdUsers["Administrator_IT & Admin"];

  const today = getTodayDateString();

  let created = 0;
  for (const v of sampleVisitors) {
    const existing = await Visitor.findOne({ email: v.email, visitDate: today });
    if (existing) {
      console.log(`Visitor exists for today: ${v.email} (${existing.passCode})`);
      continue;
    }

    const count = await Visitor.countDocuments();
    const nextNum = String(count + 1).padStart(3, "0");
    const passCode = `VP-${today.replace(/-/g, "")}-${nextNum}`;

    const employee = v.fullName === "Angela Martin" ? employeeHr : employeeEng;
    const createdBy = receptionist || admin;

    const visitor = await Visitor.create({
      passCode,
      fullName: v.fullName,
      email: v.email,
      phone: v.phone,
      company: v.company,
      govtIdType: v.govtIdType,
      govtIdNumber: v.govtIdNumber,
      employee: employee._id,
      employeeName: employee.name,
      visitDate: today,
      expectedTime: v.expectedTime,
      purpose: v.purpose,
      status: v.status,
      createdBy: createdBy._id,
      createdByName: createdBy.name,
      remarks: v.status === "REJECTED" ? "Host unavailable on requested date" : "",
      checkInTime: v.status === "CHECKED_IN" || v.status === "CHECKED_OUT" ? new Date() : null,
      checkOutTime: v.status === "CHECKED_OUT" ? new Date() : null,
    });

    await ActivityLog.create({
      visitorId: visitor._id,
      passCode: visitor.passCode,
      action: "CREATED",
      performedBy: createdBy.name,
      performedById: createdBy._id,
      performedByRole: createdBy.role,
      remarks: `Seeded sample visitor ${v.fullName}`,
    });

    created += 1;
    console.log(`Created visitor: ${visitor.passCode} (${v.fullName} - ${v.status})`);
  }

  console.log(`\nSeed complete. Users: 4, Sample visitors created today: ${created}`);
  console.log("\nLogin credentials:");
  console.log("  Admin:        admin@system.com       / admin123");
  console.log("  Receptionist: receptionist@system.com / receptionist123");
  console.log("  Employee 1:   employee@system.com     / employee123");
  console.log("  Employee 2:   john.employee@system.com / employee123");

  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});

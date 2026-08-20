const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const Visitor = require("./models/Visitor");
const ActivityLog = require("./models/ActivityLog");
const app = require("./app");

dotenv.config();

const hoursAgo = (h) => new Date(Date.now() - h * 3600000);

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sampleVisitors = [
  { fullName: "Michael Scott", email: "michael.scott@dundermifflin.com", phone: "+1 555-0190", company: "Dunder Mifflin", govtIdType: "Driving License", govtIdNumber: "DL-1990-0231", purpose: "Client meeting to discuss paper supply contract", expectedTime: "10:30", status: "CHECKED_OUT" },
  { fullName: "Pam Beesly", email: "pam.beesly@dundermifflin.com", phone: "+1 555-0191", company: "Dunder Mifflin", govtIdType: "Aadhaar Card", govtIdNumber: "XXXX-1234-5678", purpose: "Interview for the Administrative Assistant position", expectedTime: "11:00", status: "CHECKED_IN" },
  { fullName: "Jim Halpert", email: "jim.halpert@dundermifflin.com", phone: "+1 555-0192", company: "Staples Inc.", govtIdType: "Passport", govtIdNumber: "P-9821-4455", purpose: "Vendor demo of office supplies", expectedTime: "12:15", status: "APPROVED" },
  { fullName: "Dwight Schrute", email: "dwight.schrute@schrutefarms.com", phone: "+1 555-0193", company: "Schrute Farms", govtIdType: "Voter ID", govtIdNumber: "VID-778812", purpose: "Partnership discussion for beet supply", expectedTime: "13:45", status: "PENDING" },
  { fullName: "Angela Martin", email: "angela.martin@dundermifflin.com", phone: "+1 555-0194", company: "Dunder Mifflin", govtIdType: "Aadhaar Card", govtIdNumber: "XXXX-4433-2211", purpose: "Audit document submission", expectedTime: "14:00", status: "REJECTED" },
  { fullName: "Stanley Hudson", email: "stanley.hudson@dundermifflin.com", phone: "+1 555-0195", company: "Dunder Mifflin", govtIdType: "Driving License", govtIdNumber: "DL-1965-0088", purpose: "Monthly sales review presentation", expectedTime: "09:00", status: "CHECKED_OUT" },
  { fullName: "Phyllis Vance", email: "phyllis.vance@vance-refrigeration.com", phone: "+1 555-0196", company: "Vance Refrigeration", govtIdType: "Passport", govtIdNumber: "P-5567-1122", purpose: "HVAC maintenance annual contract renewal", expectedTime: "09:30", status: "CHECKED_IN" },
  { fullName: "Kevin Malone", email: "kevin.malone@dundermifflin.com", phone: "+1 555-0197", company: "Dunder Mifflin", govtIdType: "Aadhaar Card", govtIdNumber: "XXXX-9988-7766", purpose: "Warehouse inventory check", expectedTime: "10:00", status: "APPROVED" },
  { fullName: "Oscar Martinez", email: "oscar.martinez@dundermifflin.com", phone: "+1 555-0198", company: "Dunder Mifflin", govtIdType: "Voter ID", govtIdNumber: "VID-334455", purpose: "Quarterly financial audit walkthrough", expectedTime: "11:30", status: "PENDING" },
  { fullName: "Creed Bratton", email: "creed.bratton@creedthoughts.com", phone: "+1 555-0199", company: "Creed Thoughts", govtIdType: "Passport", govtIdNumber: "P-1100-9988", purpose: "Quality assurance compliance review", expectedTime: "14:30", status: "REJECTED" },
  { fullName: "Meredith Palmer", email: "meredith.palmer@vendor.net", phone: "+1 555-0200", company: "Vendor Relations LLC", govtIdType: "Driving License", govtIdNumber: "DL-1988-5566", purpose: "Supplier agreement renegotiation", expectedTime: "15:00", status: "CANCELLED" },
  { fullName: "Ryan Howard", email: "ryan.howard@dundermifflin.com", phone: "+1 555-0201", company: "WUPHF.com", govtIdType: "Aadhaar Card", govtIdNumber: "XXXX-5544-3322", purpose: "Startup pitch meeting for WUPHF integration", expectedTime: "15:30", status: "PENDING" },
  { fullName: "Toby Flenderson", email: "toby.flenderson@dundermifflin.com", phone: "+1 555-0202", company: "Dunder Mifflin", govtIdType: "Passport", govtIdNumber: "P-7744-2211", purpose: "HR policy review and employee handbook update", expectedTime: "16:00", status: "CHECKED_OUT" },
];

// Default Seed Accounts + Visitors for Testing
const seedDefaults = async () => {
  try {
    const usersData = [
      { name: "Admin User", email: "admin@system.com", password: "admin123", role: "Administrator", department: "IT & Admin", phone: "+1 555-0101" },
      { name: "Sarah Receptionist", email: "receptionist@system.com", password: "receptionist123", role: "Receptionist", department: "Front Desk", phone: "+1 555-0102" },
      { name: "David Employee", email: "employee@system.com", password: "employee123", role: "Employee", department: "Engineering", phone: "+1 555-0103" },
      { name: "John Miller", email: "john.employee@system.com", password: "employee123", role: "Employee", department: "Human Resources", phone: "+1 555-0104" },
    ];

    const seeded = {};
    for (const u of usersData) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create(u);
        console.log(`Seeded user: ${u.email} (${u.role})`);
      }
      seeded[u.role + "_" + u.department] = user;
    }

    const employeeEng = seeded["Employee_Engineering"];
    const employeeHr = seeded["Employee_Human Resources"];
    const receptionist = seeded["Receptionist_Front Desk"];
    const admin = seeded["Administrator_IT & Admin"];
    const today = getTodayDateString();

    for (const v of sampleVisitors) {
      const existing = await Visitor.findOne({ email: v.email, visitDate: today });
      if (existing) continue;

      const count = await Visitor.countDocuments();
      const nextNum = String(count + 1).padStart(3, "0");
      const passCode = `VP-${today.replace(/-/g, "")}-${nextNum}`;

      const employee = v.fullName === "Angela Martin" || v.fullName === "Toby Flenderson" ? employeeHr : employeeEng;
      const createdBy = receptionist || admin;
      const isCheckedIn = v.status === "CHECKED_IN" || v.status === "CHECKED_OUT";
      const isCheckedOut = v.status === "CHECKED_OUT";

      const visitor = await Visitor.create({
        passCode, fullName: v.fullName, email: v.email, phone: v.phone,
        company: v.company, govtIdType: v.govtIdType, govtIdNumber: v.govtIdNumber,
        employee: employee._id, employeeName: employee.name,
        visitDate: today, expectedTime: v.expectedTime, purpose: v.purpose,
        status: v.status, createdBy: createdBy._id, createdByName: createdBy.name,
        remarks: v.status === "REJECTED" ? "Host unavailable on requested date" : v.status === "CANCELLED" ? "Visit no longer needed" : "",
        checkInTime: isCheckedIn ? hoursAgo(3) : null,
        checkOutTime: isCheckedOut ? hoursAgo(1) : null,
      });

      const logBase = { visitorId: visitor._id, passCode: visitor.passCode, performedBy: createdBy.name, performedById: createdBy._id, performedByRole: createdBy.role };

      await ActivityLog.create({ ...logBase, action: "CREATED", remarks: `Seeded visitor ${v.fullName}`, timestamp: hoursAgo(5) });

      if (["APPROVED", "CHECKED_IN", "CHECKED_OUT"].includes(v.status)) {
        await ActivityLog.create({ ...logBase, action: "APPROVED", performedBy: employee.name, performedById: employee._id, performedByRole: employee.role, remarks: "Approved by host", timestamp: hoursAgo(4) });
      }
      if (v.status === "REJECTED") {
        await ActivityLog.create({ ...logBase, action: "REJECTED", performedBy: employee.name, performedById: employee._id, performedByRole: employee.role, remarks: "Host unavailable on requested date", timestamp: hoursAgo(4) });
      }
      if (v.status === "CANCELLED") {
        await ActivityLog.create({ ...logBase, action: "CANCELLED", remarks: "Visit no longer needed", timestamp: hoursAgo(2) });
      }
      if (isCheckedIn) {
        await ActivityLog.create({ ...logBase, action: "CHECKED_IN", remarks: `Checked in at ${visitor.checkInTime.toLocaleTimeString()}`, timestamp: hoursAgo(3) });
      }
      if (isCheckedOut) {
        await ActivityLog.create({ ...logBase, action: "CHECKED_OUT", remarks: `Checked out at ${visitor.checkOutTime.toLocaleTimeString()}`, timestamp: hoursAgo(1) });
      }

      console.log(`Seeded visitor: ${passCode} (${v.fullName} - ${v.status})`);
    }
  } catch (err) {
    console.warn("Seed info:", err.message);
  }
};

const PORT = process.env.PORT || 5000;

// Connect DB, Seed, then Start Server
connectDB().then(async (connected) => {
  if (connected) {
    await seedDefaults();
  }
  app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
  });
});

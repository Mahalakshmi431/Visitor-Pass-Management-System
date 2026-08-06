const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get("/", (req, res) => {
  res.send("Visitor Pass Management System API Running...");
});

// API Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/visitors", require("./routes/visitorRoutes"));
app.use("/api", require("./routes/reportRoutes"));

// Error Handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;

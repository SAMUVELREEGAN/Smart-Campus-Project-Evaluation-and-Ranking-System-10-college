const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const config = require("./config");
const seedDatabase = require("./seed");
const { migrateOrphanProjects } = require("./utils/session");

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const staffRoutes = require("./routes/staff");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, config.UPLOAD_DIR)));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Smart Campus Project Evaluation and Ranking System",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }
  if (err.message && err.message.includes("File type")) {
    return res.status(400).json({ message: err.message });
  }
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

async function start() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("MongoDB connected");

    await seedDatabase();
    await migrateOrphanProjects();

    app.listen(config.PORT, () => {
      console.log(`Server running on http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

module.exports = app;

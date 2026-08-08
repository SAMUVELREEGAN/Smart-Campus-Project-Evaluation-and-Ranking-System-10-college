const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config");
const { authenticate } = require("../middleware/auth");
const { logActivity } = require("../utils/activity");

const router = express.Router();

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, department, studentId, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 3) {
      return res.status(400).json({ message: "Password must be at least 3 characters" });
    }

    const accountRole = (role || "student").toLowerCase().trim();
    if (!["student", "staff"].includes(accountRole)) {
      return res.status(400).json({
        message: "Only student or staff registration is allowed here",
      });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: accountRole,
      department: department || "",
      studentId: accountRole === "student" ? studentId || "" : "",
      phone: phone || "",
    });

    await logActivity({
      actor: user._id,
      actorRole: accountRole,
      action: `${accountRole}_registered`,
      entityType: "user",
      entityId: user._id,
      details: `${user.name} registered as ${accountRole}`,
    });

    const token = generateToken(user);
    res.status(201).json({
      message: `${accountRole === "staff" ? "Staff" : "Student"} registration successful`,
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    // Role-based login gate
    if (role) {
      if (role === "admin" && user.role !== "admin") {
        return res.status(403).json({ message: "Not an admin account" });
      }
      if (role === "staff" && user.role !== "staff") {
        return res.status(403).json({ message: "Not a staff account" });
      }
      if (role === "student" && user.role !== "student") {
        return res.status(403).json({ message: "Not a student account" });
      }
      if (role === "user" && !["student", "staff"].includes(user.role)) {
        return res.status(403).json({ message: "Use the Admin login for admin accounts" });
      }
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);

    await logActivity({
      actor: user._id,
      actorRole: user.role,
      action: "login",
      entityType: "user",
      entityId: user._id,
      details: `${user.name} logged in as ${user.role}`,
    });

    res.json({
      message: "Login successful",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    res.json({ user: req.user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
});

router.put("/profile", authenticate, async (req, res) => {
  try {
    const { name, department, phone, studentId } = req.body;
    if (name) req.user.name = name.trim();
    if (department !== undefined) req.user.department = department;
    if (phone !== undefined) req.user.phone = phone;
    if (studentId !== undefined && req.user.role === "student") {
      req.user.studentId = studentId;
    }
    await req.user.save();
    res.json({ message: "Profile updated", user: req.user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ message: "Profile update failed", error: error.message });
  }
});

module.exports = router;

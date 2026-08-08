const express = require("express");
const User = require("../models/User");
const Project = require("../models/Project");
const Activity = require("../models/Activity");
const { authenticate, authorize } = require("../middleware/auth");
const { recalculateRankings } = require("../utils/ranking");
const { logActivity } = require("../utils/activity");

const router = express.Router();

router.use(authenticate, authorize("admin"));

router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalStudents,
      totalStaff,
      totalAdmins,
      totalProjects,
      pendingReview,
      verifiedProjects,
      publishedProjects,
      recentActivities,
      recentProjects,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "staff" }),
      User.countDocuments({ role: "admin" }),
      Project.countDocuments(),
      Project.countDocuments({
        isVerified: false,
        status: { $in: ["auto_evaluated", "under_review", "submitted"] },
      }),
      Project.countDocuments({ isVerified: true }),
      Project.countDocuments({ isPublished: true }),
      Activity.find()
        .populate("actor", "name email role")
        .sort({ createdAt: -1 })
        .limit(15),
      Project.find()
        .populate("student", "name email studentId")
        .sort({ updatedAt: -1 })
        .limit(8),
    ]);

    res.json({
      stats: {
        totalStudents,
        totalStaff,
        totalAdmins,
        totalProjects,
        pendingReview,
        verifiedProjects,
        publishedProjects,
      },
      recentActivities,
      recentProjects,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load admin dashboard", error: error.message });
  }
});

// —— Users ——
router.get("/users", async (req, res) => {
  try {
    const { role, q } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { studentId: { $regex: q, $options: "i" } },
      ];
    }
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ users: users.map((u) => u.toSafeObject()) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { name, email, password, role, department, studentId, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role are required" });
    }

    if (!["student", "staff", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      department: department || "",
      studentId: studentId || "",
      phone: phone || "",
    });

    await logActivity({
      actor: req.user._id,
      actorRole: "admin",
      action: "user_created",
      entityType: "user",
      entityId: user._id,
      details: `Admin created ${role} account for ${user.name}`,
    });

    res.status(201).json({ message: `${role} created successfully`, user: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ message: "Failed to create user", error: error.message });
  }
});

router.post("/admins", async (req, res) => {
  try {
    const { name, email, password, department, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "admin",
      department: department || "Administration",
      phone: phone || "",
    });

    await logActivity({
      actor: req.user._id,
      actorRole: "admin",
      action: "admin_created",
      entityType: "user",
      entityId: user._id,
      details: `Admin added new admin ${user.name}`,
    });

    res.status(201).json({ message: "Admin created successfully", user: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ message: "Failed to create admin", error: error.message });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, department, phone, studentId, isActive, password } = req.body;
    if (name) user.name = name.trim();
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;
    if (studentId !== undefined) user.studentId = studentId;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;

    await user.save();

    await logActivity({
      actor: req.user._id,
      actorRole: "admin",
      action: "user_updated",
      entityType: "user",
      entityId: user._id,
      details: `Admin updated user ${user.name}`,
    });

    res.json({ message: "User updated", user: user.toSafeObject() });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin" });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    await logActivity({
      actor: req.user._id,
      actorRole: "admin",
      action: "user_deleted",
      entityType: "user",
      entityId: user._id,
      details: `Admin deleted ${user.role} ${user.name}`,
    });

    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
});

// —— Projects / Evaluations ——
router.get("/projects", async (req, res) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status) {
      if (status === "pending") {
        filter.isVerified = false;
        filter.status = { $in: ["auto_evaluated", "under_review", "submitted"] };
      } else if (status === "verified") {
        filter.isVerified = true;
      } else if (status === "published") {
        filter.isPublished = true;
      } else {
        filter.status = status;
      }
    }

    let projects = await Project.find(filter)
      .populate("student", "name email studentId department")
      .populate("evaluatedBy", "name email")
      .sort({ updatedAt: -1 });

    if (q) {
      const term = q.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          (p.student?.name || "").toLowerCase().includes(term) ||
          (p.student?.email || "").toLowerCase().includes(term)
      );
    }

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects", error: error.message });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("student", "name email studentId department phone")
      .populate("evaluatedBy", "name email")
      .populate("lastEditedByAdmin", "name email");

    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project", error: error.message });
  }
});

router.put("/projects/:id/mark", async (req, res) => {
  try {
    const { finalMark, staffMark, comments, isVerified } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (staffMark !== undefined && staffMark !== null && staffMark !== "") {
      const mark = Number(staffMark);
      if (Number.isNaN(mark) || mark < 0 || mark > 100) {
        return res.status(400).json({ message: "Staff mark must be between 0 and 100" });
      }
      project.staffMark = mark;
    }

    if (finalMark !== undefined && finalMark !== null && finalMark !== "") {
      const mark = Number(finalMark);
      if (Number.isNaN(mark) || mark < 0 || mark > 100) {
        return res.status(400).json({ message: "Final mark must be between 0 and 100" });
      }
      project.finalMark = mark;
      if (project.staffMark == null) project.staffMark = mark;
    }

    if (comments !== undefined) project.staffComments = comments;

    if (isVerified === true || isVerified === "true") {
      project.isVerified = true;
      project.verifiedAt = project.verifiedAt || new Date();
      project.status = project.isPublished ? "published" : "verified";
      if (project.finalMark == null) {
        project.finalMark = project.staffMark ?? project.automaticMark;
      }
    }

    project.lastEditedByAdmin = req.user._id;
    await project.save();
    await recalculateRankings();

    const refreshed = await Project.findById(project._id)
      .populate("student", "name email studentId department")
      .populate("evaluatedBy", "name email");

    await logActivity({
      actor: req.user._id,
      actorRole: "admin",
      action: "admin_edited_mark",
      entityType: "project",
      entityId: project._id,
      details: `Admin edited marks for "${project.title}"`,
      metadata: {
        finalMark: project.finalMark,
        staffMark: project.staffMark,
      },
    });

    res.json({ message: "Marks updated by admin", project: refreshed });
  } catch (error) {
    res.status(500).json({ message: "Failed to update marks", error: error.message });
  }
});

router.post("/projects/:id/publish", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!project.isVerified || project.finalMark == null) {
      return res.status(400).json({ message: "Only verified projects with final marks can be published" });
    }

    project.isPublished = true;
    project.status = "published";
    await project.save();
    await recalculateRankings();

    await logActivity({
      actor: req.user._id,
      actorRole: "admin",
      action: "project_published",
      entityType: "project",
      entityId: project._id,
      details: `Admin published result for "${project.title}"`,
    });

    res.json({ message: "Project result published", project });
  } catch (error) {
    res.status(500).json({ message: "Failed to publish project", error: error.message });
  }
});

router.post("/rankings/publish", async (req, res) => {
  try {
    await recalculateRankings();
    const result = await Project.updateMany(
      { isVerified: true, finalMark: { $ne: null } },
      { $set: { isPublished: true, status: "published" } }
    );

    await logActivity({
      actor: req.user._id,
      actorRole: "admin",
      action: "rankings_published",
      entityType: "ranking",
      details: `Admin published rankings for ${result.modifiedCount} projects`,
    });

    const rankings = await Project.find({ isPublished: true, rank: { $ne: null } })
      .populate("student", "name email studentId department")
      .sort({ rank: 1 });

    res.json({
      message: "Rankings recalculated and published",
      publishedCount: result.modifiedCount,
      rankings,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to publish rankings", error: error.message });
  }
});

router.get("/rankings", async (req, res) => {
  try {
    await recalculateRankings();
    const rankings = await Project.find({
      isVerified: true,
      finalMark: { $ne: null },
    })
      .populate("student", "name email studentId department")
      .sort({ rank: 1, finalMark: -1 });

    res.json({ rankings });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rankings", error: error.message });
  }
});

router.post("/rankings/recalculate", async (req, res) => {
  try {
    const count = await recalculateRankings();
    await logActivity({
      actor: req.user._id,
      actorRole: "admin",
      action: "rankings_recalculated",
      entityType: "ranking",
      details: `Admin recalculated rankings for ${count} projects`,
    });
    res.json({ message: "Rankings recalculated", count });
  } catch (error) {
    res.status(500).json({ message: "Failed to recalculate rankings", error: error.message });
  }
});

router.get("/activities", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const activities = await Activity.find()
      .populate("actor", "name email role")
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ activities });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities", error: error.message });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const byStatus = await Project.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const byDepartment = await Project.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },
      {
        $group: {
          _id: "$studentInfo.department",
          count: { $sum: 1 },
          avgFinalMark: { $avg: "$finalMark" },
        },
      },
    ]);
    const markStats = await Project.aggregate([
      { $match: { finalMark: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgMark: { $avg: "$finalMark" },
          maxMark: { $max: "$finalMark" },
          minMark: { $min: "$finalMark" },
          count: { $sum: 1 },
        },
      },
    ]);

    const topProjects = await Project.find({
      isVerified: true,
      finalMark: { $ne: null },
    })
      .populate("student", "name studentId department")
      .sort({ finalMark: -1 })
      .limit(10);

    res.json({
      byStatus,
      byDepartment,
      markStats: markStats[0] || { avgMark: 0, maxMark: 0, minMark: 0, count: 0 },
      topProjects,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate report", error: error.message });
  }
});

module.exports = router;

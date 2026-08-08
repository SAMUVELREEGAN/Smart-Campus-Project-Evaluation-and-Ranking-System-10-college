const express = require("express");
const Project = require("../models/Project");
const EvaluationSession = require("../models/EvaluationSession");
const { authenticate, authorize } = require("../middleware/auth");
const { recalculateRankings } = require("../utils/ranking");
const { logActivity } = require("../utils/activity");
const {
  getOpenSession,
  getSessionProgress,
} = require("../utils/session");

const router = express.Router();

router.use(authenticate, authorize("staff"));

function sanitizeForStaff(project) {
  const obj = project.toObject ? project.toObject() : { ...project };
  if (!obj.isVerified) {
    obj.student = {
      _id: obj.student?._id || obj.student,
      name: "Hidden until verification",
      email: "hidden",
      studentId: "****",
      department: obj.student?.department || "N/A",
    };
  }
  return obj;
}

router.get("/dashboard", async (req, res) => {
  try {
    const openSession = await getOpenSession();
    let sessionProgress = null;
    let sessionFilter = {};

    if (openSession) {
      sessionProgress = await getSessionProgress(openSession._id);
      sessionFilter = { session: openSession._id };
    }

    const pending = await Project.countDocuments({
      ...sessionFilter,
      status: { $in: ["auto_evaluated", "under_review", "submitted"] },
      isVerified: false,
    });
    const verifiedByMe = await Project.countDocuments({
      ...sessionFilter,
      evaluatedBy: req.user._id,
      isVerified: true,
    });
    const totalEvaluated = await Project.countDocuments({
      ...sessionFilter,
      isVerified: true,
    });
    const awaiting = await Project.find({
      ...sessionFilter,
      status: { $in: ["auto_evaluated", "under_review", "submitted"] },
      isVerified: false,
    })
      .populate("student", "name email studentId department")
      .populate("session", "name sessionNumber status")
      .sort({ updatedAt: -1 })
      .limit(10);

    const completedSessions = await EvaluationSession.find({ status: "completed" })
      .sort({ sessionNumber: -1 })
      .limit(5);

    res.json({
      stats: { pending, verifiedByMe, totalEvaluated },
      openSession,
      sessionProgress,
      completedSessions,
      awaitingReview: awaiting.map(sanitizeForStaff),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load staff dashboard", error: error.message });
  }
});

router.get("/session", async (req, res) => {
  try {
    const openSession = await getOpenSession();
    if (!openSession) {
      return res.json({
        openSession: null,
        sessionProgress: {
          total: 0,
          pending: 0,
          verified: 0,
          distributed: 0,
          canDistribute: false,
        },
      });
    }
    const sessionProgress = await getSessionProgress(openSession._id);
    res.json({ openSession, sessionProgress });
  } catch (error) {
    res.status(500).json({ message: "Failed to load session", error: error.message });
  }
});

router.post("/session/distribute", async (req, res) => {
  try {
    const openSession = await getOpenSession();
    if (!openSession) {
      return res.status(400).json({ message: "No open evaluation session to distribute" });
    }

    const progress = await getSessionProgress(openSession._id);
    if (progress.total === 0) {
      return res.status(400).json({ message: "No submitted projects in the current session" });
    }
    if (progress.pending > 0) {
      return res.status(400).json({
        message: `Cannot distribute yet. ${progress.pending} project(s) still pending verification.`,
      });
    }
    if (progress.verified !== progress.total) {
      return res.status(400).json({
        message: "All submitted projects must be verified before distributing marks.",
      });
    }

    await recalculateRankings(openSession._id);

    const distributeResult = await Project.updateMany(
      {
        session: openSession._id,
        isVerified: true,
        status: { $ne: "draft" },
      },
      {
        $set: {
          isDistributed: true,
          isPublished: true,
          status: "published",
        },
      }
    );

    openSession.status = "completed";
    openSession.distributedAt = new Date();
    openSession.distributedBy = req.user._id;
    openSession.projectCount = progress.total;
    await openSession.save();

    await logActivity({
      actor: req.user._id,
      actorRole: "staff",
      action: "session_distributed",
      entityType: "ranking",
      entityId: openSession._id,
      details: `${req.user.name} distributed marks for ${openSession.name} (${progress.total} projects). Session marked completed.`,
      metadata: {
        sessionNumber: openSession.sessionNumber,
        distributedCount: distributeResult.modifiedCount,
      },
    });

    const projects = await Project.find({ session: openSession._id, isDistributed: true })
      .populate("student", "name email studentId department")
      .sort({ rank: 1 });

    res.json({
      message: `Marks distributed to all students. ${openSession.name} is now completed. A new session will start when students upload again.`,
      session: openSession,
      distributedCount: distributeResult.modifiedCount,
      projects,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to distribute marks", error: error.message });
  }
});

router.get("/projects", async (req, res) => {
  try {
    const { status, q, scope } = req.query;
    const openSession = await getOpenSession();
    const filter = {
      status: { $in: ["auto_evaluated", "under_review", "verified", "published", "submitted"] },
    };

    if (scope !== "all" && openSession) {
      filter.session = openSession._id;
    }

    if (status === "pending") {
      filter.isVerified = false;
      filter.status = { $in: ["auto_evaluated", "under_review", "submitted"] };
    } else if (status === "verified") {
      filter.isVerified = true;
    }

    let projects = await Project.find(filter)
      .populate("student", "name email studentId department")
      .populate("evaluatedBy", "name email")
      .populate("session", "name sessionNumber status")
      .sort({ updatedAt: -1 });

    if (q) {
      const term = q.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          (p.technology || "").toLowerCase().includes(term) ||
          (p.category || "").toLowerCase().includes(term)
      );
    }

    const sessionProgress = openSession ? await getSessionProgress(openSession._id) : null;

    res.json({
      projects: projects.map(sanitizeForStaff),
      openSession,
      sessionProgress,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects", error: error.message });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("student", "name email studentId department phone")
      .populate("evaluatedBy", "name email")
      .populate("session", "name sessionNumber status");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (["draft"].includes(project.status)) {
      return res.status(404).json({ message: "Project not available for review" });
    }

    res.json({ project: sanitizeForStaff(project) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project", error: error.message });
  }
});

router.put("/projects/:id/mark", async (req, res) => {
  try {
    const { staffMark, comments, verifyDirectly } = req.body;
    const project = await Project.findById(req.params.id)
      .populate("student", "name email studentId department")
      .populate("session");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.isDistributed || project.session?.status === "completed") {
      return res.status(400).json({
        message: "This evaluation session is completed. Marks can no longer be changed by staff.",
      });
    }

    if (project.isVerified) {
      return res.status(400).json({
        message: "Verified marks cannot be edited by staff. Contact admin.",
      });
    }

    if (!["auto_evaluated", "under_review", "submitted"].includes(project.status)) {
      return res.status(400).json({ message: "Project is not ready for evaluation" });
    }

    project.status = "under_review";
    project.staffComments = comments || project.staffComments;
    project.evaluatedBy = req.user._id;

    if (verifyDirectly === true || verifyDirectly === "true") {
      project.staffMark = project.automaticMark;
      project.finalMark = project.automaticMark;
      project.isVerified = true;
      project.verifiedAt = new Date();
      project.status = "verified";
    } else {
      if (staffMark === undefined || staffMark === null || staffMark === "") {
        return res.status(400).json({ message: "Staff mark is required" });
      }
      const mark = Number(staffMark);
      if (Number.isNaN(mark) || mark < 0 || mark > 100) {
        return res.status(400).json({ message: "Staff mark must be between 0 and 100" });
      }
      project.staffMark = mark;
      project.finalMark = mark;
      project.isVerified = true;
      project.verifiedAt = new Date();
      project.status = "verified";
    }

    await project.save();
    if (project.session) {
      await recalculateRankings(project.session._id || project.session);
    }

    const refreshed = await Project.findById(project._id)
      .populate("student", "name email studentId department")
      .populate("evaluatedBy", "name email")
      .populate("session", "name sessionNumber status");

    await logActivity({
      actor: req.user._id,
      actorRole: "staff",
      action: "evaluation_verified",
      entityType: "project",
      entityId: project._id,
      details: `${req.user.name} verified evaluation for "${project.title}" with final mark ${project.finalMark}`,
      metadata: {
        automaticMark: project.automaticMark,
        staffMark: project.staffMark,
        finalMark: project.finalMark,
      },
    });

    res.json({
      message:
        "Evaluation verified successfully. Student identity is now visible. Marks will reach students after Distribute All.",
      project: sanitizeForStaff(refreshed),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update evaluation", error: error.message });
  }
});

router.get("/evaluated", async (req, res) => {
  try {
    const projects = await Project.find({
      evaluatedBy: req.user._id,
      isVerified: true,
    })
      .populate("student", "name email studentId department")
      .populate("session", "name sessionNumber status")
      .sort({ verifiedAt: -1 });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch evaluated projects", error: error.message });
  }
});

module.exports = router;

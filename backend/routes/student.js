const express = require("express");
const Project = require("../models/Project");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { classifyFile, evaluateProject } = require("../utils/evaluate");
const { logActivity } = require("../utils/activity");
const { getOrCreateOpenSession } = require("../utils/session");

const router = express.Router();

router.use(authenticate, authorize("student"));

function mapUploadedFiles(files) {
  return (files || []).map((file) => ({
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    mimetype: file.mimetype,
    size: file.size,
    fileType: classifyFile(file.originalname),
  }));
}

function shapeStudentProject(project) {
  const obj = project.toObject ? project.toObject() : { ...project };
  // Hide staff/final marks from students until session marks are distributed
  if (!obj.isDistributed) {
    obj.staffMark = null;
    obj.finalMark = null;
    obj.rank = null;
    obj.awaitingDistribution = obj.isVerified;
  }
  return obj;
}

router.get("/dashboard", async (req, res) => {
  try {
    const projects = await Project.find({ student: req.user._id })
      .populate("session", "name sessionNumber status")
      .sort({ createdAt: -1 });
    const shaped = projects.map(shapeStudentProject);
    const submitted = shaped.filter((p) => p.status !== "draft").length;
    const verified = shaped.filter((p) => p.isVerified).length;
    const distributed = shaped.filter((p) => p.isDistributed).length;
    const bestRank = shaped
      .filter((p) => p.rank != null)
      .reduce((best, p) => (best === null || p.rank < best ? p.rank : best), null);

    res.json({
      stats: {
        totalProjects: shaped.length,
        submitted,
        verified,
        published: distributed,
        bestRank,
      },
      recentProjects: shaped.slice(0, 5),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load dashboard", error: error.message });
  }
});

router.get("/projects", async (req, res) => {
  try {
    const projects = await Project.find({ student: req.user._id })
      .populate("session", "name sessionNumber status")
      .sort({ createdAt: -1 });
    res.json({ projects: projects.map(shapeStudentProject) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects", error: error.message });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      student: req.user._id,
    })
      .populate("evaluatedBy", "name email")
      .populate("session", "name sessionNumber status");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ project: shapeStudentProject(project) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project", error: error.message });
  }
});

router.post(
  "/projects",
  upload.fields([
    { name: "documentation", maxCount: 5 },
    { name: "sourceFiles", maxCount: 20 },
    { name: "otherFiles", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const { title, description, technology, category, submit } = req.body;

      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
      }

      const files = [
        ...mapUploadedFiles(req.files?.documentation),
        ...mapUploadedFiles(req.files?.sourceFiles),
        ...mapUploadedFiles(req.files?.otherFiles),
      ];

      // New uploads always join the current open session (creates one if previous was completed)
      const session = await getOrCreateOpenSession();

      let project = new Project({
        title: title.trim(),
        description: description.trim(),
        technology: technology || "",
        category: category || "General",
        student: req.user._id,
        session: session._id,
        files,
        status: "draft",
        isDistributed: false,
      });

      if (submit === "true" || submit === true) {
        if (files.length === 0) {
          return res.status(400).json({ message: "Upload at least one file to submit" });
        }
        const evaluation = await evaluateProject(project);
        project.automaticMark = evaluation.automaticMark;
        project.automaticBreakdown = evaluation.automaticBreakdown;
        project.status = "auto_evaluated";
      }

      await project.save();
      session.projectCount = await Project.countDocuments({
        session: session._id,
        status: { $ne: "draft" },
      });
      await session.save();

      await logActivity({
        actor: req.user._id,
        actorRole: "student",
        action: submit === "true" || submit === true ? "project_submitted" : "project_created",
        entityType: "project",
        entityId: project._id,
        details: `${req.user.name} ${submit === "true" || submit === true ? "submitted" : "created"} project "${project.title}" in ${session.name}`,
        metadata: { automaticMark: project.automaticMark, sessionId: session._id },
      });

      const populated = await Project.findById(project._id).populate(
        "session",
        "name sessionNumber status"
      );

      res.status(201).json({
        message:
          submit === "true" || submit === true
            ? "Project submitted and auto-evaluated"
            : "Project saved as draft",
        project: shapeStudentProject(populated),
        session,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create project", error: error.message });
    }
  }
);

router.put(
  "/projects/:id",
  upload.fields([
    { name: "documentation", maxCount: 5 },
    { name: "sourceFiles", maxCount: 20 },
    { name: "otherFiles", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const project = await Project.findOne({
        _id: req.params.id,
        student: req.user._id,
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.isVerified || project.isDistributed || ["under_review", "verified", "published"].includes(project.status)) {
        return res.status(400).json({
          message: "Cannot update project after staff review has started or verification is done. Upload a new project for the next session.",
        });
      }

      if (!project.session) {
        const session = await getOrCreateOpenSession();
        project.session = session._id;
      }

      const { title, description, technology, category, submit } = req.body;
      if (title) project.title = title.trim();
      if (description) project.description = description.trim();
      if (technology !== undefined) project.technology = technology;
      if (category !== undefined) project.category = category;

      const newFiles = [
        ...mapUploadedFiles(req.files?.documentation),
        ...mapUploadedFiles(req.files?.sourceFiles),
        ...mapUploadedFiles(req.files?.otherFiles),
      ];
      if (newFiles.length > 0) {
        project.files = [...project.files, ...newFiles];
      }

      if (submit === "true" || submit === true) {
        if (project.files.length === 0) {
          return res.status(400).json({ message: "Upload at least one file to submit" });
        }
        const evaluation = await evaluateProject(project);
        project.automaticMark = evaluation.automaticMark;
        project.automaticBreakdown = evaluation.automaticBreakdown;
        project.status = "auto_evaluated";
      }

      await project.save();

      await logActivity({
        actor: req.user._id,
        actorRole: "student",
        action: submit === "true" || submit === true ? "project_submitted" : "project_updated",
        entityType: "project",
        entityId: project._id,
        details: `${req.user.name} updated project "${project.title}"`,
        metadata: { automaticMark: project.automaticMark },
      });

      res.json({ message: "Project updated", project });
    } catch (error) {
      res.status(500).json({ message: "Failed to update project", error: error.message });
    }
  }
);

router.post("/projects/:id/submit", async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      student: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.isVerified || project.isDistributed) {
      return res.status(400).json({
        message:
          "This project was already evaluated. Upload a new project to join the next evaluation session.",
      });
    }

    if (project.files.length === 0) {
      return res.status(400).json({ message: "Upload at least one file before submitting" });
    }

    if (!project.session) {
      const session = await getOrCreateOpenSession();
      project.session = session._id;
    }

    const evaluation = await evaluateProject(project);
    project.automaticMark = evaluation.automaticMark;
    project.automaticBreakdown = evaluation.automaticBreakdown;
    project.status = "auto_evaluated";
    project.staffMark = null;
    project.finalMark = null;
    project.isVerified = false;
    project.isDistributed = false;
    project.verifiedAt = null;
    project.evaluatedBy = null;
    await project.save();

    await logActivity({
      actor: req.user._id,
      actorRole: "student",
      action: "project_submitted",
      entityType: "project",
      entityId: project._id,
      details: `${req.user.name} submitted project "${project.title}" for evaluation`,
      metadata: { automaticMark: project.automaticMark },
    });

    const populated = await Project.findById(project._id).populate(
      "session",
      "name sessionNumber status"
    );

    res.json({
      message: "Project submitted. Automatic mark generated.",
      project: shapeStudentProject(populated),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit project", error: error.message });
  }
});

router.delete("/projects/:id/files/:filename", async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      student: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.isVerified || project.status === "under_review") {
      return res.status(400).json({ message: "Cannot remove files during/after review" });
    }

    project.files = project.files.filter((f) => f.filename !== req.params.filename);
    await project.save();
    res.json({ message: "File removed", project });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove file", error: error.message });
  }
});

router.get("/rankings", async (req, res) => {
  try {
    const rankings = await Project.find({
      isDistributed: true,
      isVerified: true,
      rank: { $ne: null },
    })
      .populate("student", "name studentId department")
      .populate("session", "name sessionNumber")
      .sort({ rank: 1, finalMark: -1 })
      .select("title finalMark rank student category technology session");

    res.json({ rankings });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rankings", error: error.message });
  }
});

router.get("/results", async (req, res) => {
  try {
    const projects = await Project.find({
      student: req.user._id,
      $or: [{ isDistributed: true }, { isVerified: true }],
    })
      .populate("session", "name sessionNumber status")
      .sort({ verifiedAt: -1 });

    res.json({ results: projects.map(shapeStudentProject) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch results", error: error.message });
  }
});

module.exports = router;

const EvaluationSession = require("../models/EvaluationSession");
const Project = require("../models/Project");

async function getOpenSession() {
  return EvaluationSession.findOne({ status: "open" }).sort({ sessionNumber: -1 });
}

async function getOrCreateOpenSession() {
  let session = await getOpenSession();
  if (session) return session;

  const last = await EvaluationSession.findOne().sort({ sessionNumber: -1 });
  const nextNumber = last ? last.sessionNumber + 1 : 1;

  session = await EvaluationSession.create({
    name: `Evaluation Session ${nextNumber}`,
    sessionNumber: nextNumber,
    status: "open",
  });

  return session;
}

async function getSessionProgress(sessionId) {
  const base = { session: sessionId, status: { $ne: "draft" } };
  const [total, pending, verified, distributed] = await Promise.all([
    Project.countDocuments(base),
    Project.countDocuments({
      ...base,
      isVerified: false,
      status: { $in: ["submitted", "auto_evaluated", "under_review"] },
    }),
    Project.countDocuments({ ...base, isVerified: true }),
    Project.countDocuments({ ...base, isDistributed: true }),
  ]);

  return {
    total,
    pending,
    verified,
    distributed,
    canDistribute: total > 0 && pending === 0 && verified === total && distributed < total,
  };
}

async function migrateOrphanProjects() {
  const orphans = await Project.countDocuments({ session: null });
  if (!orphans) return;

  const session = await getOrCreateOpenSession();
  await Project.updateMany(
    { session: null },
    {
      $set: {
        session: session._id,
        isDistributed: false,
      },
    }
  );
  session.projectCount = await Project.countDocuments({ session: session._id, status: { $ne: "draft" } });
  await session.save();
}

module.exports = {
  getOpenSession,
  getOrCreateOpenSession,
  getSessionProgress,
  migrateOrphanProjects,
};

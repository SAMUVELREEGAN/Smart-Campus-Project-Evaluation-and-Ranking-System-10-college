const Project = require("../models/Project");

async function recalculateRankings(sessionId = null) {
  const filter = {
    isVerified: true,
    finalMark: { $ne: null },
  };

  if (sessionId) {
    filter.session = sessionId;
  }

  const projects = await Project.find(filter).sort({
    finalMark: -1,
    verifiedAt: 1,
    createdAt: 1,
  });

  let currentRank = 0;
  let lastMark = null;
  const updates = [];

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    if (lastMark === null || project.finalMark !== lastMark) {
      currentRank = i + 1;
      lastMark = project.finalMark;
    }
    if (project.rank !== currentRank) {
      project.rank = currentRank;
      updates.push(project.save());
    }
  }

  const clearFilter = sessionId
    ? {
        session: sessionId,
        $or: [{ isVerified: false }, { finalMark: null }],
      }
    : { $or: [{ isVerified: false }, { finalMark: null }] };

  await Project.updateMany(clearFilter, { $set: { rank: null } });
  await Promise.all(updates);
  return projects.length;
}

module.exports = { recalculateRankings };

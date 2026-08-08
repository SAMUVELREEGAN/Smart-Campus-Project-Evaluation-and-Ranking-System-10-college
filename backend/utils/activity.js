const Activity = require("../models/Activity");

async function logActivity({ actor, actorRole, action, entityType, entityId, details, metadata }) {
  try {
    await Activity.create({
      actor,
      actorRole,
      action,
      entityType: entityType || "system",
      entityId: entityId || null,
      details: details || "",
      metadata: metadata || {},
    });
  } catch (err) {
    console.error("Activity log failed:", err.message);
  }
}

module.exports = { logActivity };

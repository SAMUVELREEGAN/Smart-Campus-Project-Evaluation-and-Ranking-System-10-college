const fs = require("fs");
const path = require("path");
const config = require("../config");

const DOC_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".md"];
const SOURCE_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".html",
  ".css",
  ".sql",
  ".json",
  ".xml",
];
const ARCHIVE_EXTENSIONS = [".zip", ".rar"];

function classifyFile(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (DOC_EXTENSIONS.includes(ext)) return "documentation";
  if (SOURCE_EXTENSIONS.includes(ext) || ARCHIVE_EXTENSIONS.includes(ext)) return "source";
  return "other";
}

function readTextPreview(filePath, maxBytes = 50000) {
  try {
    if (!fs.existsSync(filePath)) return "";
    const buffer = Buffer.alloc(maxBytes);
    const fd = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0);
    fs.closeSync(fd);
    return buffer.slice(0, bytesRead).toString("utf8");
  } catch {
    return "";
  }
}

function scoreDocumentation(files) {
  const docs = files.filter((f) => f.fileType === "documentation");
  const max = config.EVALUATION_CRITERIA.documentation;
  if (docs.length === 0) return 0;

  let score = Math.min(docs.length * 8, max * 0.6);
  docs.forEach((doc) => {
    const content = readTextPreview(doc.path);
    if (content.length > 500) score += 4;
    if (content.length > 2000) score += 3;
    if (/abstract|introduction|conclusion|methodology|objective/i.test(content)) {
      score += 3;
    }
  });
  return Math.min(Math.round(score), max);
}

function scoreSourceCode(files) {
  const sources = files.filter((f) => f.fileType === "source");
  const max = config.EVALUATION_CRITERIA.sourceCode;
  if (sources.length === 0) return 0;

  let score = Math.min(sources.length * 5, max * 0.5);
  sources.forEach((src) => {
    const ext = path.extname(src.originalName).toLowerCase();
    if (ARCHIVE_EXTENSIONS.includes(ext)) {
      score += 8;
      return;
    }
    const content = readTextPreview(src.path);
    if (content.length > 200) score += 3;
    if (content.length > 1000) score += 3;
    if (/function|class|def |public |import |require\(|module\.exports/i.test(content)) {
      score += 4;
    }
    if (/\/\/|#|\/\*|"""|'''/i.test(content)) score += 2;
  });
  return Math.min(Math.round(score), max);
}

function scoreProjectStructure(files, project) {
  const max = config.EVALUATION_CRITERIA.projectStructure;
  let score = 0;
  const hasDoc = files.some((f) => f.fileType === "documentation");
  const hasSource = files.some((f) => f.fileType === "source");
  if (hasDoc) score += 8;
  if (hasSource) score += 8;
  if (hasDoc && hasSource) score += 4;
  if (project.title && project.title.length > 5) score += 2;
  if (project.description && project.description.length > 50) score += 3;
  if (project.technology) score += 2;
  if (files.length >= 3) score += 3;
  return Math.min(Math.round(score), max);
}

function scoreCompleteness(files, project) {
  const max = config.EVALUATION_CRITERIA.completeness;
  let score = 0;
  if (project.title) score += 3;
  if (project.description && project.description.length > 30) score += 4;
  if (project.technology) score += 2;
  if (project.category) score += 1;
  if (files.length >= 1) score += 2;
  if (files.length >= 2) score += 2;
  if (files.some((f) => f.fileType === "documentation")) score += 1;
  return Math.min(Math.round(score), max);
}

function scoreFileQuality(files) {
  const max = config.EVALUATION_CRITERIA.fileQuality;
  if (files.length === 0) return 0;
  let score = 0;
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  if (totalSize > 1024) score += 3;
  if (totalSize > 10 * 1024) score += 3;
  if (totalSize < 20 * 1024 * 1024) score += 2;
  const uniqueTypes = new Set(files.map((f) => f.fileType));
  score += uniqueTypes.size * 1;
  return Math.min(Math.round(score), max);
}

function evaluateProject(project) {
  const files = project.files || [];
  const breakdown = {
    documentation: scoreDocumentation(files),
    sourceCode: scoreSourceCode(files),
    projectStructure: scoreProjectStructure(files, project),
    completeness: scoreCompleteness(files, project),
    fileQuality: scoreFileQuality(files),
  };

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return {
    automaticMark: Math.min(100, Math.max(0, total)),
    automaticBreakdown: breakdown,
  };
}

module.exports = {
  classifyFile,
  evaluateProject,
};

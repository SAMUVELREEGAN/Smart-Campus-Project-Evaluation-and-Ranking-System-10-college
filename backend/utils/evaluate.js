const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const AdmZip = require("adm-zip");
const { PDFParse } = require("pdf-parse");
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
const TEXT_LIKE_IN_ZIP = new Set([
  ...DOC_EXTENSIONS.filter((e) => e !== ".pdf" && e !== ".doc" && e !== ".docx"),
  ...SOURCE_EXTENSIONS,
  ".md",
  ".txt",
]);

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "into",
  "using",
  "based",
  "system",
  "project",
  "app",
  "application",
  "smart",
  "campus",
  "via",
  "over",
  "under",
  "is",
  "are",
  "was",
  "were",
  "be",
  "this",
  "that",
  "these",
  "those",
  "as",
  "it",
  "its",
]);

const STRUCTURE_PATTERNS = [
  /abstract/i,
  /introduction/i,
  /literature\s+review/i,
  /methodology|method(s)?/i,
  /objective(s)?|aim(s)?/i,
  /conclusion|future\s+work/i,
  /result(s)?|discussion/i,
  /implementation|architecture/i,
  /requirement(s)?|scope/i,
  /reference(s)?|bibliography/i,
];

const CODE_PATTERNS = [
  /\bfunction\b|\bconst\b|\blet\b|\bvar\b/,
  /\bclass\b|\bdef\b|\bpublic\b|\bprivate\b/,
  /\bimport\b|\brequire\s*\(|\bfrom\s+['"]/,
  /\bmodule\.exports\b|\bexport\s+(default|const|function)/,
  /\/\/|#|\/\*|\*\//,
  /\bif\s*\(|\bfor\s*\(|\bwhile\s*\(|\breturn\b/,
];

function classifyFile(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (DOC_EXTENSIONS.includes(ext)) return "documentation";
  if (SOURCE_EXTENSIONS.includes(ext) || ARCHIVE_EXTENSIONS.includes(ext)) return "source";
  return "other";
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function uniqueTokens(text) {
  return [...new Set(tokenize(text))];
}

function printableRatio(text) {
  if (!text || !text.length) return 0;
  let printable = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127)) printable += 1;
  }
  return printable / text.length;
}

function cleanExtractedText(text) {
  if (!text) return "";
  const cleaned = String(text).replace(/\u0000/g, "").trim();
  if (!cleaned) return "";
  if (printableRatio(cleaned) < 0.7) return "";
  return cleaned;
}

async function extractPdfText(filePath) {
  const data = fs.readFileSync(filePath);
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return cleanExtractedText(result?.text || "");
  } finally {
    if (typeof parser.destroy === "function") {
      await parser.destroy();
    }
  }
}

async function extractDocxText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return cleanExtractedText(result?.value || "");
}

function extractPlainText(filePath, maxBytes = 200000) {
  try {
    if (!fs.existsSync(filePath)) return "";
    const buffer = Buffer.alloc(Math.min(maxBytes, fs.statSync(filePath).size || maxBytes));
    const fd = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    return cleanExtractedText(buffer.slice(0, bytesRead).toString("utf8"));
  } catch {
    return "";
  }
}

function extractZipText(filePath, maxFiles = 40, maxBytesPerFile = 40000) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries().filter((e) => !e.isDirectory);
    const chunks = [];
    let used = 0;

    for (const entry of entries) {
      if (used >= maxFiles) break;
      const ext = path.extname(entry.entryName).toLowerCase();
      if (!TEXT_LIKE_IN_ZIP.has(ext)) continue;
      if (entry.header.size > 500000) continue;
      try {
        const text = cleanExtractedText(entry.getData().toString("utf8").slice(0, maxBytesPerFile));
        if (text.length > 40) {
          chunks.push(text);
          used += 1;
        }
      } catch {
        // skip unreadable entry
      }
    }
    return chunks.join("\n\n");
  } catch {
    return "";
  }
}

async function extractFileText(file) {
  const filePath = file.path;
  const ext = path.extname(file.originalName || file.filename || "").toLowerCase();
  if (!filePath || !fs.existsSync(filePath)) return "";

  try {
    if (ext === ".pdf") return await extractPdfText(filePath);
    if (ext === ".docx") return await extractDocxText(filePath);
    if (ext === ".doc") {
      // Legacy .doc has no reliable free parser here; try plain read, usually empty.
      return extractPlainText(filePath);
    }
    if (ext === ".zip") return extractZipText(filePath);
    if (ext === ".rar") return ""; // binary archive without free extractor
    if (DOC_EXTENSIONS.includes(ext) || SOURCE_EXTENSIONS.includes(ext)) {
      return extractPlainText(filePath);
    }
    return "";
  } catch {
    return "";
  }
}

function countPatternHits(text, patterns) {
  if (!text) return 0;
  return patterns.reduce((count, pattern) => (pattern.test(text) ? count + 1 : count), 0);
}

function titleRelevanceScore(title, description, technology, content) {
  const titleWords = uniqueTokens(title);
  const descWords = uniqueTokens(description).slice(0, 25);
  const techWords = uniqueTokens(technology);
  const contentLower = String(content || "").toLowerCase();

  if (!contentLower || contentLower.length < 40) return 0;

  const matchRatio = (words) => {
    if (!words.length) return 0;
    const hits = words.filter((w) => contentLower.includes(w)).length;
    return hits / words.length;
  };

  const titleRatio = matchRatio(titleWords);
  const descRatio = matchRatio(descWords);
  const techRatio = matchRatio(techWords);

  // Title alignment matters most for "completely different" detection.
  let score = titleRatio * 0.65 + descRatio * 0.2 + techRatio * 0.15;

  // If title has meaningful words and almost none appear in content, treat as unrelated.
  if (titleWords.length >= 2 && titleRatio < 0.15) {
    score = Math.min(score, 0.12);
  }

  return Math.max(0, Math.min(1, score));
}

function contentQualityScore(content, hasSourceFiles, hasDocFiles) {
  const length = (content || "").length;
  if (length < 30) return 0;

  let score = 0;

  // Depth / substance
  if (length > 200) score += 0.12;
  if (length > 800) score += 0.14;
  if (length > 2500) score += 0.16;
  if (length > 8000) score += 0.1;
  if (length > 20000) score += 0.05;

  const structureHits = countPatternHits(content, STRUCTURE_PATTERNS);
  score += Math.min(structureHits, 6) * 0.05;

  const codeHits = countPatternHits(content, CODE_PATTERNS);
  score += Math.min(codeHits, 5) * 0.04;

  const words = tokenize(content);
  const unique = new Set(words);
  const vocabularyRichness = words.length ? unique.size / Math.min(words.length, 500) : 0;
  score += Math.min(0.12, vocabularyRichness * 0.2);

  if (hasDocFiles && structureHits >= 2) score += 0.06;
  if (hasSourceFiles && codeHits >= 2) score += 0.06;

  // Very short / repetitive fluff stays low
  if (length < 250 || unique.size < 20) {
    score = Math.min(score, 0.28);
  }

  return Math.max(0, Math.min(1, score));
}

function roundMark(value) {
  return Math.round(Math.max(0, Math.min(99, value)));
}

function buildBreakdown(weights, proportions) {
  const keys = Object.keys(weights);
  const breakdown = {};
  keys.forEach((key) => {
    breakdown[key] = Math.round(weights[key] * proportions[key]);
  });
  return breakdown;
}

function finalizeBreakdown(rawBreakdown, targetMark) {
  const weights = config.EVALUATION_CRITERIA;
  const capped = {};
  Object.keys(weights).forEach((key) => {
    capped[key] = Math.max(0, Math.min(weights[key], Math.round(rawBreakdown[key] || 0)));
  });

  const current = Object.values(capped).reduce((a, b) => a + b, 0);
  if (current === 0) {
    return {
      documentation: Math.min(weights.documentation, Math.max(0, Math.min(5, targetMark))),
      sourceCode: 0,
      projectStructure: Math.min(weights.projectStructure, Math.max(0, Math.min(5, targetMark - 5))),
      completeness: Math.min(weights.completeness, Math.max(0, Math.min(5, targetMark - 10))),
      fileQuality: Math.min(weights.fileQuality, Math.max(0, targetMark - 15)),
    };
  }

  // Keep criterion scores within configured max; nudge toward the final mark without exceeding caps.
  if (current === targetMark) return capped;

  const keys = Object.keys(capped);
  let diff = targetMark - current;

  if (diff > 0) {
    const boostKeys = keys.filter((key) => capped[key] > 0);
    const targets = boostKeys.length ? boostKeys : keys;
    for (const key of targets) {
      if (diff <= 0) break;
      const room = weights[key] - capped[key];
      if (room <= 0) continue;
      const add = Math.min(room, diff);
      capped[key] += add;
      diff -= add;
    }
  } else if (diff < 0) {
    for (const key of keys.slice().reverse()) {
      if (diff >= 0) break;
      const reduce = Math.min(capped[key], -diff);
      capped[key] -= reduce;
      diff += reduce;
    }
  }

  return capped;
}

async function analyzeProject(project) {
  const files = project.files || [];
  const texts = [];

  for (const file of files) {
    const text = await extractFileText(file);
    if (text) texts.push(text);
  }

  const combined = texts.join("\n\n");
  const hasDocFiles = files.some((f) => f.fileType === "documentation");
  const hasSourceFiles = files.some((f) => f.fileType === "source");
  const quality = contentQualityScore(combined, hasSourceFiles, hasDocFiles);
  const relevance = titleRelevanceScore(
    project.title,
    project.description,
    project.technology,
    combined
  );

  const isEmpty = combined.length < 80;
  const isIrrelevant = !isEmpty && relevance < 0.18;
  const isLowLevel = !isEmpty && !isIrrelevant && quality < 0.35;
  const isStrong = !isEmpty && !isIrrelevant && !isLowLevel && quality >= 0.35 && relevance >= 0.25;

  return {
    combined,
    quality,
    relevance,
    isEmpty,
    isIrrelevant,
    isLowLevel,
    isStrong,
    hasDocFiles,
    hasSourceFiles,
    fileCount: files.length,
  };
}

function computeAutomaticMark(analysis, project) {
  const { quality, relevance, isEmpty, isIrrelevant, isLowLevel, isStrong } = analysis;
  const weights = config.EVALUATION_CRITERIA;

  // Criterion proportions driven by real content signals (not flat file counts).
  const docSignal = analysis.hasDocFiles
    ? Math.min(1, quality * 0.7 + (countPatternHits(analysis.combined, STRUCTURE_PATTERNS) / 6) * 0.3)
    : 0;
  const sourceSignal = analysis.hasSourceFiles
    ? Math.min(1, quality * 0.55 + (countPatternHits(analysis.combined, CODE_PATTERNS) / 5) * 0.45)
    : 0;
  const structureSignal = Math.min(
    1,
    (analysis.hasDocFiles ? 0.35 : 0) +
      (analysis.hasSourceFiles ? 0.35 : 0) +
      (project.description && project.description.length > 40 ? 0.15 : 0) +
      quality * 0.15
  );
  const completenessSignal = Math.min(
    1,
    (project.title ? 0.2 : 0) +
      (project.description && project.description.length > 30 ? 0.25 : 0) +
      (project.technology ? 0.15 : 0) +
      (analysis.fileCount >= 1 ? 0.15 : 0) +
      (analysis.fileCount >= 2 ? 0.1 : 0) +
      quality * 0.15
  );
  const fileQualitySignal = Math.min(1, quality * 0.75 + relevance * 0.25);

  let breakdown = buildBreakdown(weights, {
    documentation: docSignal,
    sourceCode: sourceSignal,
    projectStructure: structureSignal,
    completeness: completenessSignal,
    fileQuality: fileQualitySignal,
  });

  let mark;

  if (isEmpty) {
    // No readable content at all
    mark = roundMark(8 + completenessSignal * 12 + structureSignal * 8); // ~8–28
  } else if (isIrrelevant) {
    // Content exists but does not match title/topic
    mark = roundMark(12 + quality * 25 + relevance * 10); // capped well below 50
    mark = Math.min(mark, 45);
  } else if (isLowLevel) {
    // Thin / weak content
    mark = roundMark(18 + quality * 40 + relevance * 15); // typically 20–45
    mark = Math.min(mark, 49);
  } else if (isStrong) {
    // Strong, relevant content: 50–99 based on quality + title fit
    const strength = quality * 0.65 + relevance * 0.35;
    mark = roundMark(50 + strength * 49); // 50–99
    mark = Math.max(50, Math.min(99, mark));
  } else {
    // Borderline: some substance but not clearly strong
    mark = roundMark(30 + quality * 25 + relevance * 20);
    mark = Math.min(mark, 49);
  }

  breakdown = finalizeBreakdown(breakdown, mark);

  return {
    automaticMark: mark,
    automaticBreakdown: breakdown,
  };
}

async function evaluateProject(project) {
  const analysis = await analyzeProject(project);
  return computeAutomaticMark(analysis, project);
}

module.exports = {
  classifyFile,
  evaluateProject,
};

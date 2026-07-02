'use strict';

/**
 * modelArtifactLoader
 *
 * Loads product-owned model artifacts (the markdown files under `model/`) as
 * raw strings, for use by scoring/report code, scripts, and tests.
 *
 * Infrastructure only: this module does NOT parse markdown, inject artifact
 * text into prompts, or change any behavior. It is not imported anywhere yet.
 *
 * Node built-ins only (fs, path). CommonJS.
 */

const fs = require('fs');
const path = require('path');

// Stable snake_case keys -> repo-relative markdown paths.
// Keep keys stable: downstream code will reference these, not the file paths.
const MODEL_ARTIFACTS = {
  foundation: 'model/foundation.md',
  product_philosophy: 'model/product-philosophy.md',
  company_context: 'model/company-context.md',
  investor_framework: 'model/investor-framework.md',
  scoring_rubric: 'model/scoring-rubric.md',
  report_spec: 'model/report-spec.md',
  calibration_examples: 'model/calibration-examples.md',
  sample_report_format: 'model/sample-report-format.md',
  sample_report_proxy_market_validation: 'model/sample-report-proxy-market-validation.md',
  sample_report_clear_deck_weak_opportunity: 'model/sample-report-clear-deck-weak-opportunity.md',
  improvement_framework: 'model/improvement-framework.md',
};

// In-memory cache of already-read artifact strings, keyed by artifact key.
const _cache = new Map();

/**
 * Candidate project roots, tried in order.
 *
 * Primary: process.cwd(). In Netlify functions the working directory is the
 * project base (repo root); the same holds for local scripts and most test
 * runners, so cwd resolves `model/...` correctly in those contexts.
 *
 * Fallback: one level up from this file's directory. This module lives at
 * `<root>/lib/`, so `path.resolve(__dirname, '..')` is the repo root. This
 * covers cases where cwd is not the repo root (e.g. a script invoked from a
 * subdirectory).
 *
 * Note on Netlify bundling: esbuild inlines this module into each function
 * that requires it, so `__dirname` at runtime points at the bundled function
 * location rather than `<root>/lib`. That is why cwd is the primary strategy
 * and why the artifacts must also be listed under `[functions].included_files`
 * in netlify.toml so the markdown files ship alongside the functions.
 */
function _candidateRoots() {
  return [process.cwd(), path.resolve(__dirname, '..')];
}

// Resolve a repo-relative artifact path to an absolute path by probing the
// candidate roots. Returns the first path that exists; otherwise returns the
// primary-root path so any error message is concrete.
function _resolveArtifactPath(relPath) {
  for (const root of _candidateRoots()) {
    const abs = path.join(root, relPath);
    if (fs.existsSync(abs)) return abs;
  }
  return path.join(process.cwd(), relPath);
}

/**
 * Load a single artifact's markdown as a string.
 * Caches in memory. Throws on unknown key or unreadable file.
 * @param {string} key one of the keys in MODEL_ARTIFACTS
 * @returns {string} raw markdown
 */
function loadModelArtifact(key) {
  if (!Object.prototype.hasOwnProperty.call(MODEL_ARTIFACTS, key)) {
    throw new Error(
      `Unknown model artifact key: "${key}". Known keys: ${Object.keys(MODEL_ARTIFACTS).join(', ')}`
    );
  }
  if (_cache.has(key)) return _cache.get(key);

  const relPath = MODEL_ARTIFACTS[key];
  const absPath = _resolveArtifactPath(relPath);

  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch (err) {
    throw new Error(
      `Failed to read model artifact "${key}" at ${absPath}: ${err.message}`
    );
  }

  _cache.set(key, content);
  return content;
}

/**
 * Load multiple artifacts by key.
 * @param {string[]} keys
 * @returns {Object<string,string>} map of key -> markdown string
 */
function loadModelArtifacts(keys) {
  if (!Array.isArray(keys)) {
    throw new Error('loadModelArtifacts(keys) expects an array of keys.');
  }
  const out = {};
  for (const key of keys) {
    out[key] = loadModelArtifact(key);
  }
  return out;
}

/**
 * Load every known artifact.
 * @returns {Object<string,string>} map of key -> markdown string
 */
function loadAllModelArtifacts() {
  return loadModelArtifacts(Object.keys(MODEL_ARTIFACTS));
}

/**
 * List available artifacts without reading their contents.
 * @returns {Array<{key:string, path:string}>}
 */
function listModelArtifacts() {
  return Object.entries(MODEL_ARTIFACTS).map(([key, relPath]) => ({
    key,
    path: relPath,
  }));
}

module.exports = {
  MODEL_ARTIFACTS,
  loadModelArtifact,
  loadModelArtifacts,
  loadAllModelArtifacts,
  listModelArtifacts,
};

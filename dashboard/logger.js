const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "data", "runs.json");

function ensureFile() {
  if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "[]");
  }
}

function logRun(entry) {
  ensureFile();
  const runs = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  runs.unshift({
    timestamp: new Date().toISOString(),
    ...entry,
  });
  fs.writeFileSync(LOG_FILE, JSON.stringify(runs.slice(0, 200), null, 2));
  return runs[0];
}

function getRuns() {
  ensureFile();
  return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
}

function clearRuns() {
  ensureFile();
  fs.writeFileSync(LOG_FILE, "[]");
}

module.exports = { logRun, getRuns, clearRuns };

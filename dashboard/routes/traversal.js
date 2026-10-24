const express = require("express");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const { logRun } = require("../logger");

const router = express.Router();
const JUICE_SHOP_URL = process.env.JUICE_SHOP_URL || "http://localhost:3000";

// Simulated public folder for files
const PUBLIC_DOCS_DIR = path.resolve(__dirname, "..", "public");

// Mock files accessible in the system
const MOCK_FILES = {
  "announcements.txt": "Welcome to OWASP Juice Shop! All deliveries are contactless this week.",
  "legal.md": "# Legal Notice\nJuice Shop is an open-source educational project maintained under Apache 2.0.",
  "eastere.gg": "🎉 CONGRATULATIONS! You found the Juice Shop Easter Egg: 'JuiceShop{Tr4v3rs4l_M4st3r_2026}'",
  "package.json": JSON.stringify(
    {
      name: "juice-shop-target",
      version: "16.0.0",
      description: "Deliberately insecure web application",
      private: true,
      secrets: { jwtKey: "super-secret-juice-jwt-salt", dbAdminPassword: "admin_juice_sql_pass!" }
    },
    null,
    2
  ),
  "/etc/passwd": "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\njuice:x:1000:1000:Juice Shop App:/home/juice:/bin/sh",
  ".env": "PORT=3000\nDB_PASS=juicy_production_pass_9981\nAWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE\nSESSION_SECRET=super_secret_cookie_token_999"
};

// ATTACK: Request a file using path traversal sequences (e.g. ../../package.json or /etc/passwd)
router.post("/attack", async (req, res) => {
  const filepath = req.body.filepath || "../../package.json";
  const containsTraversal = filepath.includes("..") || filepath.startsWith("/") || filepath.includes("%2e%2e");

  try {
    // Try requesting Juice Shop's /ftp/ or static file route
    const sanitizedName = encodeURIComponent(filepath);
    const r = await fetch(`${JUICE_SHOP_URL}/ftp/${sanitizedName}`);
    if (r.ok) {
      const text = await r.text();
      const entry = logRun({
        module: "traversal",
        mode: "attack",
        payload: `GET /ftp/${filepath}`,
        result: `Arbitrary file read succeeded (${filepath.slice(0, 30)})`,
        vulnerable: true,
      });

      return res.json({
        filepath,
        status: r.status,
        vulnerable: true,
        content: text.slice(0, 1000),
        explanation: "Path traversal confirmed: Target server served file from outside the designated directory.",
        logged: entry,
      });
    }
    throw new Error("Target static route did not serve directly");
  } catch (err) {
    // Standalone lab simulation
    const key = Object.keys(MOCK_FILES).find((k) => filepath.includes(k)) || "package.json";
    const fileContent = MOCK_FILES[key];

    const entry = logRun({
      module: "traversal",
      mode: "attack",
      payload: `File request: "${filepath}" (Relative Traversal)`,
      result: containsTraversal
        ? `Path Traversal succeeded: Retrieved contents of ${filepath}`
        : `Read standard document: ${filepath}`,
      vulnerable: containsTraversal,
    });

    res.json({
      filepath,
      status: 200,
      vulnerable: containsTraversal,
      filePreview: fileContent,
      detectedEscape: containsTraversal,
      explanation: containsTraversal
        ? `VULNERABILITY CONFIRMED: The application concatenated untrusted path '${filepath}' without canonicalization, escaping the web root and leaking sensitive system/application files.`
        : "File served within normal bounds.",
      tip: "In OWASP Juice Shop, requesting /ftp/eastere.gg or traversing to /ftp/package.json solves a key CTF challenge.",
      logged: entry,
      notice: "Executed in simulated lab target mode.",
    });
  }
});

// DEFENSE: Canonical path validation & strict whitelisting
// 1. Resolve path using path.resolve
// 2. Verify that resolved path begins with the designated SAFE directory
// 3. Reject relative sequences, null bytes (%00), and path separators
router.post("/defend", (req, res) => {
  const filepath = req.body.filepath || "../../package.json";

  // Check for traversal attempts
  const hasTraversalChars = filepath.includes("..") || filepath.includes("\0") || filepath.includes("%00");

  // Defense implementation: resolve and verify boundary
  const safeBase = path.resolve(__dirname, "..", "public", "docs");
  const requestedAbsolute = path.resolve(safeBase, path.basename(filepath));
  const isWithinSafeDir = requestedAbsolute.startsWith(safeBase) && !hasTraversalChars;

  const entry = logRun({
    module: "traversal",
    mode: "defend",
    payload: `Safe File Fetch: "${filepath}" with Canonical Verification`,
    result: isWithinSafeDir
      ? `Access granted to valid whitelisted file: ${path.basename(filepath)}`
      : `BLOCKED: Directory traversal pattern rejected -> ${filepath}`,
    vulnerable: false,
  });

  if (!isWithinSafeDir) {
    return res.status(403).json({
      status: 403,
      error: "Forbidden",
      message: `Access Denied: Path Traversal attempt detected for '${filepath}'.`,
      safePathCalculated: requestedAbsolute,
      defenseDetails: {
        canonicalBase: safeBase,
        traversalTokensDetected: hasTraversalChars,
        boundaryCheckPassed: false,
      },
      explanation:
        "Defense pattern: Always resolve paths canonicalized (e.g. path.resolve), verify path.startsWith(ALLOWED_BASE_DIRECTORY), strip null bytes, and prefer strict basename whitelisting over raw path concatenation.",
      logged: entry,
    });
  }

  res.json({
    status: 200,
    allowed: true,
    message: `File '${path.basename(filepath)}' is verified within safe directory.`,
    logged: entry,
  });
});

module.exports = router;

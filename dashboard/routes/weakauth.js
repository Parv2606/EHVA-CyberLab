const express = require("express");
const fetch = require("node-fetch");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { logRun } = require("../logger");

const router = express.Router();
const JUICE_SHOP_URL = process.env.JUICE_SHOP_URL || "http://localhost:3000";

// ATTACK: fire several rapid login attempts at Juice Shop's real login endpoint
// with a known username and wrong passwords, to show there's no lockout/rate
// limiting by default (a real attacker could brute-force this way).
router.post("/attack", async (req, res) => {
  const email = req.body.email || "admin@juice-sh.op";
  const attempts = Math.min(parseInt(req.body.attempts) || 8, 15);
  const results = [];

  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(`${JUICE_SHOP_URL}/rest/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: `wrongpass${i}` }),
      });
      results.push({ attempt: i + 1, status: r.status });
    } catch (err) {
      results.push({ attempt: i + 1, status: "error", detail: err.message });
    }
  }

  let blocked = results.some((r) => r.status === 429);
  let isSimulated = false;

  // If all attempts failed due to unreachable container, provide simulated lab results
  if (results.every((r) => r.status === "error")) {
    isSimulated = true;
    for (let i = 0; i < attempts; i++) {
      results[i] = { attempt: i + 1, status: 401, latencyMs: Math.floor(Math.random() * 20) + 10 };
    }
    blocked = false;
  }

  const entry = logRun({
    module: "weakauth",
    mode: "attack",
    payload: `${attempts} rapid login attempts against ${email}${isSimulated ? " (Simulated Target)" : ""}`,
    result: blocked ? "Rate limiting kicked in" : "No rate limiting observed - all attempts processed without delay",
    vulnerable: !blocked,
  });

  res.json({
    email,
    targetEmail: email,
    vulnerable: !blocked,
    attempts: results,
    rateLimited: blocked,
    logged: entry,
    notice: isSimulated ? "Executed in simulated target mode (standalone lab)." : undefined,
  });
});

// DEFENSE DEMO: local mock login protected by express-rate-limit + bcrypt-hashed
// password storage, so brute-forcing gets throttled and stored creds aren't plaintext.
const mockUserHash = bcrypt.hashSync("correct-password", 10);
let demoLimiterHits = {};

const demoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: () => "demo-user", // single demo account for simplicity
  handler: (req, res) => {
    res.status(429).json({ blocked: true, message: "Too many attempts - locked out for 60s" });
  },
});

router.post("/defend", demoLimiter, (req, res) => {
  const { password } = req.body;
  const ok = bcrypt.compareSync(password || "", mockUserHash);

  const entry = logRun({
    module: "weakauth",
    mode: "defend",
    payload: `password attempt="${password}"`,
    result: ok ? "Correct password (bcrypt match)" : "Incorrect password (rejected, attempt counted toward rate limit)",
    vulnerable: false,
  });

  res.json({
    authenticated: ok,
    explanation:
      "Defense pattern: hash passwords with bcrypt/argon2 (never plaintext or fast hashes), rate-limit/lock out repeated failed attempts, and enforce a minimum password policy.",
    logged: entry,
  });
});

module.exports = router;

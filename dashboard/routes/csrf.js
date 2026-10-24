const express = require("express");
const { logRun } = require("../logger");

const router = express.Router();

// This module is self-contained (not against Juice Shop's live session, since
// scripting a real cross-origin browser flow against Juice Shop's cookies is
// out of scope for a backend-only demo). It demonstrates the CSRF mechanism
// and fix pattern using a small mock "account" endpoint inside the dashboard.
// Juice Shop DOES have its own real CSRF challenge (changing a user's profile
// picture URL via a forged request) - try it manually in the Juice Shop UI
// to see the same concept against a real app.

let mockAccountEmail = "victim@example.com";
let csrfTokens = new Set(); // valid tokens issued to "legitimate" pages

router.get("/state", (req, res) => {
  res.json({ currentEmail: mockAccountEmail });
});

// Simulates a legitimate page loading a form + CSRF token
router.get("/legit-token", (req, res) => {
  const token = Math.random().toString(36).slice(2);
  csrfTokens.add(token);
  res.json({ token });
});

// VULNERABLE endpoint: no CSRF token required, just needs the request to arrive.
// Represents a forged <form> auto-submitting from an attacker-controlled page.
router.post("/attack", (req, res) => {
  const newEmail = req.body.newEmail || "attacker@evil.com";
  mockAccountEmail = newEmail; // no origin/token check at all
  const entry = logRun({
    module: "csrf",
    mode: "attack",
    payload: `forged request -> newEmail=${newEmail}`,
    result: `Account email changed to ${newEmail} with no token/origin check`,
    vulnerable: true,
  });
  res.json({
    newEmail: mockAccountEmail,
    explanation:
      "This endpoint changed account state just because a POST arrived, with no CSRF token and no origin check. A forged auto-submitting form on any other site could trigger this for a logged-in victim.",
    logged: entry,
  });
});

// DEFENSE: requires a valid, single-use token tied to a legitimately loaded page.
router.post("/defend", (req, res) => {
  const { newEmail, token } = req.body;
  const valid = token && csrfTokens.has(token);
  if (valid) {
    csrfTokens.delete(token); // single-use
    mockAccountEmail = newEmail || mockAccountEmail;
  }

  const entry = logRun({
    module: "csrf",
    mode: "defend",
    payload: `newEmail=${newEmail}, token=${token || "(none)"}`,
    result: valid ? `Change accepted (valid token) -> ${mockAccountEmail}` : "Request rejected - missing/invalid CSRF token",
    vulnerable: false,
  });

  res.status(valid ? 200 : 403).json({
    accepted: valid,
    currentEmail: mockAccountEmail,
    explanation:
      "Defense pattern: anti-CSRF tokens tied to the user's session, verified server-side and rejected if missing/mismatched, plus SameSite=Lax/Strict cookies and origin/referer checks as defense-in-depth.",
    logged: entry,
  });
});

module.exports = router;

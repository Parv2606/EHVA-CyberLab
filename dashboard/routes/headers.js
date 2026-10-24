const express = require("express");
const fetch = require("node-fetch");
const { logRun } = require("../logger");

const router = express.Router();
const JUICE_SHOP_URL = process.env.JUICE_SHOP_URL || "http://localhost:3000";

const EXPECTED_HEADERS = [
  "content-security-policy",
  "x-frame-options",
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

function checkHeaders(headerObj) {
  return EXPECTED_HEADERS.map((h) => ({
    header: h,
    present: Object.prototype.hasOwnProperty.call(headerObj, h),
    value: headerObj[h] || null,
  }));
}

// ATTACK (inspection): fetch Juice Shop's real response headers and report which
// standard security headers are missing.
router.get("/attack", async (req, res) => {
  try {
    const r = await fetch(`${JUICE_SHOP_URL}/`);
    const headerObj = Object.fromEntries(r.headers.entries());
    const checklist = checkHeaders(headerObj);
    const missingCount = checklist.filter((c) => !c.present).length;

    const entry = logRun({
      module: "headers",
      mode: "attack",
      payload: "GET / on Juice Shop",
      result: `${missingCount}/${EXPECTED_HEADERS.length} expected security headers missing`,
      vulnerable: missingCount > 0,
    });

    res.json({ target: JUICE_SHOP_URL, checklist, allHeaders: headerObj, logged: entry });
  } catch (err) {
    // Standard unhardened server headers (missing the security headers)
    const mockHeaders = {
      "x-powered-by": "Express",
      "content-type": "text/html; charset=utf-8",
      "etag": 'W/"123-abc"',
      "date": new Date().toUTCString(),
      "connection": "close",
    };
    const checklist = checkHeaders(mockHeaders);
    const missingCount = checklist.filter((c) => !c.present).length;

    const entry = logRun({
      module: "headers",
      mode: "attack",
      payload: "GET / on Juice Shop (Simulated Target)",
      result: `${missingCount}/${EXPECTED_HEADERS.length} expected security headers missing`,
      vulnerable: missingCount > 0,
    });

    res.json({
      target: JUICE_SHOP_URL,
      checklist,
      allHeaders: mockHeaders,
      logged: entry,
      notice: "Executed in simulated target mode (standalone lab).",
    });
  }
});

// DEFENSE DEMO: a local endpoint with helmet applied (see server.js), so its
// headers can be compared directly against Juice Shop's.
router.get("/defend", (req, res) => {
  const headerObj = res.getHeaders();
  const checklist = checkHeaders(headerObj);

  const entry = logRun({
    module: "headers",
    mode: "defend",
    payload: "GET /api/headers/defend (helmet-protected)",
    result: `${checklist.filter((c) => c.present).length}/${EXPECTED_HEADERS.length} expected security headers present`,
    vulnerable: false,
  });

  res.json({
    checklist,
    explanation:
      "Defense pattern: use a middleware like helmet (Node) to set CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy by default instead of hand-rolling each one.",
    logged: entry,
  });
});

module.exports = router;

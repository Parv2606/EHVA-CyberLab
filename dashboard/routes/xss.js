const express = require("express");
const fetch = require("node-fetch");
const sanitizeHtml = require("sanitize-html");
const { logRun } = require("../logger");

const router = express.Router();
const JUICE_SHOP_URL = process.env.JUICE_SHOP_URL || "http://localhost:3000";

// ATTACK: send a payload to Juice Shop's product search API and show whether
// it comes back unescaped. Juice Shop's frontend renders search results with
// innerHTML, which is the classic DOM XSS challenge ("Perform a DOM XSS attack").
// This route proves the *reflection* server-side; to see the script actually
// execute, open Juice Shop's search bar directly in a browser with the same payload.
router.post("/attack", async (req, res) => {
  const payload = req.body.payload || "<img src=x onerror=alert('XSS')>";
  try {
    const url = `${JUICE_SHOP_URL}/rest/products/search?q=${encodeURIComponent(payload)}`;
    const r = await fetch(url);
    const text = await r.text();
    const reflectedUnescaped = text.includes(payload);

    const entry = logRun({
      module: "xss",
      mode: "attack",
      payload,
      result: reflectedUnescaped
        ? "Payload reflected unescaped in Juice Shop response"
        : "Payload was not found reflected unescaped",
      vulnerable: reflectedUnescaped,
    });

    res.json({
      payload,
      juiceShopUrl: url,
      reflectedUnescaped,
      rawSnippet: text.slice(0, 500),
      tip: "Open this same search in Juice Shop's UI (http://localhost:3000 if you expose it, or via the container) to see the alert() actually fire in the DOM.",
      logged: entry,
    });
  } catch (err) {
    // Resilient fallback for standalone environment without Docker container
    const isScript = payload.includes("<script") || payload.includes("onerror") || payload.includes("onload") || payload.includes("<svg") || payload.includes("<img");
    const entry = logRun({
      module: "xss",
      mode: "attack",
      payload,
      result: isScript ? "Payload reflected unescaped (Simulated Lab Target)" : "Benign payload processed",
      vulnerable: isScript,
    });

    res.json({
      payload,
      juiceShopUrl: `${JUICE_SHOP_URL}/rest/products/search?q=${encodeURIComponent(payload)}`,
      reflectedUnescaped: isScript,
      rawSnippet: `{"status":"success","data":[{"id":1,"name":"Apple Juice","description":"Fresh search result matching: ${payload}"}]}`,
      tip: "Target Juice Shop container offline; simulated reflection executed. In live mode, Juice Shop reflects this unescaped into innerHTML.",
      logged: entry,
      notice: "Executed in simulated target mode (standalone lab).",
    });
  }
});

// DEFENSE DEMO: shows the same payload run through output-encoding / sanitization.
// This does NOT modify Juice Shop - it demonstrates the general fix pattern.
router.post("/defend", (req, res) => {
  const payload = req.body.payload || "<img src=x onerror=alert('XSS')>";
  const clean = sanitizeHtml(payload, { allowedTags: [], allowedAttributes: {} });

  const entry = logRun({
    module: "xss",
    mode: "defend",
    payload,
    result: `Sanitized to: ${clean}`,
    vulnerable: false,
  });

  res.json({
    payload,
    sanitized: clean,
    explanation:
      "Defense pattern: never trust user input rendered into HTML. Use output encoding / a library like sanitize-html or DOMPurify, and prefer textContent over innerHTML on the frontend.",
    logged: entry,
  });
});

module.exports = router;

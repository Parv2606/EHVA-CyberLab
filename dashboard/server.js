const express = require("express");
const path = require("path");
const helmet = require("helmet");
const fetch = require("node-fetch");

const xssRoutes = require("./routes/xss");
const sqliRoutes = require("./routes/sqli");
const csrfRoutes = require("./routes/csrf");
const weakauthRoutes = require("./routes/weakauth");
const headersRoutes = require("./routes/headers");
const scannerRoutes = require("./routes/scanner");
const cmdiRoutes = require("./routes/cmdi");
const reportRoutes = require("./routes/report");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// NOTE: helmet is deliberately NOT applied globally. It's applied only to the
// /api/headers/defend route below, so the dashboard can show a real, visible
// contrast between an "unprotected" response and a "protected" one.
app.use("/api/headers/defend", helmet());

app.use("/api/xss", xssRoutes);
app.use("/api/sqli", sqliRoutes);
app.use("/api/csrf", csrfRoutes);
app.use("/api/weakauth", weakauthRoutes);
app.use("/api/headers", headersRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/api/cmdi", cmdiRoutes);
app.use("/api/report", reportRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", juiceShop: process.env.JUICE_SHOP_URL || "http://localhost:3000" });
});

app.get("/api/juice-status", async (req, res) => {
  let juiceUrl = process.env.JUICE_SHOP_URL || "http://localhost:3000";
  try {
    let signal = undefined;
    if (typeof AbortController !== "undefined") {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 2000);
      signal = controller.signal;
    }
    const r = await fetch(juiceUrl, { signal });
    return res.json({ reachable: true, status: r.status, url: juiceUrl });
  } catch (err) {
    // If running with docker default url but on host, try localhost:3000 as fallback
    if (juiceUrl.includes("juice-shop:3000")) {
      try {
        const r2 = await fetch("http://localhost:3000");
        return res.json({ reachable: true, status: r2.status, url: "http://localhost:3000" });
      } catch (e) {
        // Fall through
      }
    }
    res.json({ reachable: false, error: err.message, url: juiceUrl });
  }
});

const { startJuiceTarget } = require("./juice-target");

// If not running in docker internal network, ensure target on port 3000 is active
if (!process.env.JUICE_SHOP_HOST || process.env.JUICE_SHOP_HOST === "localhost") {
  startJuiceTarget(3000);
}

app.listen(PORT, () => {
  console.log(`Security dashboard running on http://localhost:${PORT}`);
});

const express = require("express");
const { getRuns, clearRuns } = require("../logger");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getRuns());
});

router.delete("/", (req, res) => {
  clearRuns();
  res.json({ cleared: true });
});

module.exports = router;

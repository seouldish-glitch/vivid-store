const express = require("express");
const router = express.Router();

// Simple in-memory cart storage (for serverless, you'd want to use MongoDB)
// For now, just return empty cart to prevent errors
router.get("/", (req, res) => {
  // Return empty cart for now
  res.json([]);
});

router.post("/", (req, res) => {
  // Accept cart updates but don't store (temporary fix)
  res.json({ ok: true });
});

module.exports = router;

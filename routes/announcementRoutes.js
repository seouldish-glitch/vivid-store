const express = require("express");
const router = express.Router();

// Temporary announcements route to prevent 404 errors
router.get("/active", (req, res) => {
  // Return empty array for now (no active announcements)
  res.json([]);
});

module.exports = router;

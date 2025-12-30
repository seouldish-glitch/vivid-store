const express = require("express");
const router = express.Router();
const Announcement = require("../models/Announcement");

// GET /api/announcements/active
router.get("/active", async (req, res) => {
  try {
    const active = await Announcement.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(1);
    res.json(active);
  } catch (err) {
    console.error("Fetch active announcements failed", err);
    res.json([]);
  }
});

module.exports = router;

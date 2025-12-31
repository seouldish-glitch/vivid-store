const express = require("express");
const Category = require("../models/Category");

const router = express.Router();

// GET /api/categories - list all public categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({}).sort("name");
    res.json(categories);
  } catch (err) {
    console.error("Fetch categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

module.exports = router;

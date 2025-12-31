const express = require("express");
const router = express.Router();
const { requireAuth } = require("./_middleware");

// Require authentication for all cart operations
router.use(requireAuth);

// Get cart from session
router.get("/", (req, res) => {
  const cart = req.session.cart || [];
  res.json(cart);
});

// Update cart
router.post("/", (req, res) => {
  const { items } = req.body;
  if (Array.isArray(items)) {
    req.session.cart = items;
    req.session.save((err) => {
      if (err) console.error("Session save error", err);
      res.json({ ok: true });
    });
  } else {
    res.status(400).json({ error: "Invalid cart data" });
  }
});

module.exports = router;

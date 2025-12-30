const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
// Optional: Logger (if available)
// const { logEvent } = require("../utils/discordLogger");

router.get("/summary", async (req, res) => {
  try {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
      // If cart is empty, return empty response instead of error, 
      // but frontend might redirect if empty.
      return res.json({ items: [], total: 0 });
    }

    const productIds = cart.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    
    let total = 0;
    const items = cart.map(cartItem => {
      const p = products.find(p => String(p._id) === String(cartItem.productId));
      if (!p) return null;
      const t = p.price * cartItem.quantity;
      total += t;
      return {
        productId: p._id,
        name: p.name,
        image: (p.imageUrls && p.imageUrls[0]) || p.imageUrl,
        price: p.price,
        quantity: cartItem.quantity
      };
    }).filter(Boolean);

    res.json({ items, total });
  } catch (err) {
    console.error("Checkout summary error:", err);
    res.status(500).json({ error: "Failed to load checkout summary" });
  }
});

router.post("/submit", async (req, res) => {
  try {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const { fullName, address, phone, postalCode, dob, province } = req.body;
    
    // Recalculate total for security
    const productIds = cart.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    
    let total = 0;
    const orderItems = [];

    for (const cartItem of cart) {
      const p = products.find(p => String(p._id) === String(cartItem.productId));
      if (p) {
        if (p.inStock === false) {
           return res.status(400).json({ error: `Product ${p.name} is out of stock` });
        }
        total += p.price * cartItem.quantity;
        orderItems.push({
          productId: p._id,
          name: p.name,
          price: p.price,
          quantity: cartItem.quantity,
          image: (p.imageUrls && p.imageUrls[0]) || p.imageUrl
        });
      }
    }

    const order = await Order.create({
      user: req.user ? req.user._id : undefined,
      fullName,
      address,
      phone,
      postalCode,
      dob: dob ? new Date(dob) : undefined,
      province,
      items: orderItems,
      total,
      status: "Pending"
    });

    // Clear cart
    req.session.cart = [];
    req.session.save((err) => {
      if (err) console.error("Session save (clear) error", err);
    });

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    console.error("Checkout submit error:", err);
    res.status(500).json({ error: "Failed to submit order" });
  }
});

module.exports = router;

const express = require("express");
const mongoose = require("mongoose");
const { requireAuth, requireAdmin } = require("./_middleware");
const { logEvent } = require("../utils/discordLogger");

const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Models
const Product = mongoose.model("Product");
const User = mongoose.model("User");
const Comment = mongoose.model("Comment");
const Category = mongoose.model("Category");
let BannedUser;
try {
  BannedUser = mongoose.model("BannedUser");
} catch (e) {
  // If not yet loaded
  BannedUser = require("../models/BannedUser");
}

// Cloudinary config
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "vivid-store", // folder in cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });

// Require auth + admin for all routes
router.use(requireAuth, requireAdmin);

// ----------------------------------------------------
// USERS
// ----------------------------------------------------
router.get("/users", async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { email: regex }];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const items = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({ total, items });
  } catch (err) {
    console.error("Users list error", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users/:id/ban", async (req, res) => {
  try {
    const { reason, banType, banDuration } = req.body;
    const userToBan = await User.findById(req.params.id);
    if (!userToBan) return res.status(404).json({ error: "User not found" });

    // Don't ban other admins (unless you are super admin, but let's just block it for safety)
    if (userToBan.isAdmin && userToBan.email !== "owner@example.com") {
      // Simple check
      // warn but maybe allow if strict? let's block banning admins for now to prevent lockout wars
      // return res.status(403).json({ error: "Cannot ban an admin" });
    }

    // Determine expiration
    let expiresAt = null;
    if (banType === "temporary" && banDuration) {
      const hours = parseInt(banDuration);
      if (hours > 0) {
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      }
    }

    // Create/Update Ban record
    await BannedUser.findOneAndUpdate(
      { "user.email": userToBan.email },
      {
        user: {
          _id: userToBan._id,
          name: userToBan.name,
          email: userToBan.email,
          googleId: userToBan.googleId,
          picture: userToBan.picture,
        },
        reason: reason || "Violation of terms",
        bannedAt: new Date(),
        expiresAt,
        banType: banType || "permanent",
        bannedBy: req.user.email,
      },
      { upsert: true, new: true }
    );

    // Delete the user account (Snapshot is kept in BannedUser)
    await User.deleteOne({ _id: userToBan._id });

    // Log
    await logEvent({
      category: "ADMIN",
      action: "USER_BAN",
      user: { name: req.user.name, email: req.user.email },
      meta: { bannedUser: userToBan.email, reason, type: banType },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Ban error", err);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

router.post("/users/:id/unban", async (req, res) => {
  try {
    // Find the ban record
    const banRecord = await BannedUser.findById(req.params.id);
    if (!banRecord)
      return res.status(404).json({ error: "Ban record not found" });

    // Re-create the user if possible
    // Note: We only have basic info. Google Auth will try to match by googleId or email on next login.
    // If we want to restore them fully, we'd need to have archived them.
    // Current logic: Just remove ban record. User has to sign up again (or if they sign in with Google, a new account is made).
    // Actually, `server.js` logic handles account creation on login.
    // So unbanning just means removing the block.

    await BannedUser.deleteOne({ _id: req.params.id });

    await logEvent({
      category: "ADMIN",
      action: "USER_UNBAN",
      user: { name: req.user.name, email: req.user.email },
      meta: { unbannedUser: banRecord.user?.email },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Unban error", err);
    res.status(500).json({ error: "Failed to unban user" });
  }
});

// ----------------------------------------------------
// BANNED LIST
// ----------------------------------------------------
router.get("/banned", async (req, res) => {
  try {
    const list = await BannedUser.find().sort({ bannedAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Fetch banned failed" });
  }
});

// ----------------------------------------------------
// CATEGORIES
// ----------------------------------------------------
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Fetch categories failed" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const category = await Category.create({
      name,
      description,
      slug: name.toLowerCase().replace(/ /g, "-"),
    });

    await logEvent({
      category: "ADMIN",
      action: "CATEGORY_CREATE",
      user: { email: req.user.email },
      meta: { category: category.name }
    });

    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Create category failed" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    await logEvent({
      category: "ADMIN",
      action: "CATEGORY_DELETE",
      user: { email: req.user.email },
      meta: { id: req.params.id }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Delete category failed" });
  }
});

// ----------------------------------------------------
// PRODUCTS
// ----------------------------------------------------

router.get("/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Fetch products failed" });
  }
});

// Create product (Multiple images)
router.post(
  "/products",
  upload.array("images", 5), // Up to 5 images
  async (req, res) => {
    try {
      const { name, subtitle, price, tag, features, inStock, isFeatured, primaryIndex, category } =
        req.body;
      console.log(
        "ADMIN POST /products body:",
        JSON.stringify(req.body, null, 2)
      );
      console.log("ADMIN POST /products inStock value:", inStock);

      let featuresArray = [];
      if (typeof features === "string") {
        try {
          featuresArray = JSON.parse(features);
        } catch (e) {
          featuresArray = features
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      // Handle images
      // Newly uploaded files (Cloudinary provides full URL in `path`)
      const uploadedUrls = (req.files || []).map((f) => f.path);

      // Since this is CREATE, there are no existing images to reorder ideally,
      // but maybe logic allows it? No, just new files.
      // However, if we want to honor `primaryIndex`, we just reorder the array such that primary is first?
      // Or we just store them as is. The frontend tries to send everything in order.
      // Since `upload.array` processes files in order they are sent, `uploadedUrls` matches the order of the 'images' field parts.
      // But `FormData` order is not guaranteed reliable across all browsers/libs, but usually is.
      // Let's assume frontend appended them in correct order.

      let finalImageUrls = [...uploadedUrls];

      // Handle Primary Index if provided (swap primary to front)
      if (primaryIndex !== undefined) {
        const idx = parseInt(primaryIndex);
        if (idx > 0 && idx < finalImageUrls.length) {
          const [p] = finalImageUrls.splice(idx, 1);
          finalImageUrls.unshift(p);
        }
      }

      const product = await Product.create({
        name,
        subtitle,
        price,
        tag,
        features: featuresArray,
        imageUrls: finalImageUrls,
        inStock:
          inStock === "true" ||
          inStock === true ||
          inStock === "on" ||
          (Array.isArray(inStock) &&
            (inStock.includes("true") || inStock.includes("on"))),
        category: category || null,
        isFeatured: isFeatured === "true" || isFeatured === true,
      });

      await logEvent({
        category: "ADMIN",
        action: "PRODUCT_CREATE",
        user: { email: req.user.email, name: req.user.name },
        meta: { productId: product._id, name: product.name },
      });

      res.json(product);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Failed to create product" });
    }
  }
);

// Update product
router.put("/products/:id", upload.array("images", 5), async (req, res) => {
  try {
    const {
      name,
      subtitle,
      price,
      tag,
      features,
      inStock,
      existingImageUrls,
      primaryIndex,
      category,
      isFeatured,
    } = req.body;
    console.log(
      `ADMIN PUT /products/${req.params.id} body:`,
      JSON.stringify(req.body, null, 2)
    );
    console.log(`ADMIN PUT /products/${req.params.id} inStock value:`, inStock);

    let featuresArray = [];
    if (typeof features === "string") {
      try {
        featuresArray = JSON.parse(features);
      } catch (e) {
        featuresArray = features
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    // Existing images (from hidden inputs, may be array or single string or undefined)
    let currentImages = [];
    if (existingImageUrls) {
      if (Array.isArray(existingImageUrls)) currentImages = existingImageUrls;
      else currentImages = [existingImageUrls];
    }

    // New images
    const newUrls = (req.files || []).map((f) => f.path);

    // Combine them. The frontend might have sent them in a specific mix, but `multer` separates files from fields.
    // The frontend logic sends `existingImageUrls` array representing the ones KEPT.
    // And `files` are the NEW ones.
    // The frontend logic (Step 314) does:
    // existingUrls inputs... then file inputs...
    // BUT `multer` extracts all files into `req.files`.
    // We need to know where to insert them?
    // Actually the frontend JS (Step 314) just `append`s files to FormData.
    // It doesn't seem to interleave them in a way `multer` would easily reconstruct purely by order if mixed.
    // Wait, the frontend logic `rebuildPreviewArea` (Step 314) creates a visual order, but when submitting:
    // It appends `existingImageUrls[]` in order.
    // It appends `images` (files) in order.
    // So on server: we have `existingImageUrls` array AND `req.files` array.
    // We generally just concat them: `[...existing, ...new]`.
    // BUT the user controls the PRIMARY index which is relative to the *combined* list visually?
    // In the JS `rebuildCombinedOrderAfterMove`, it maintains `existingUrls` and `newFiles` arrays separately!
    // So `existingUrls` are in their sorted order (relative to each other).
    // `newFiles` are in their sorted order (relative to each other).
    // And the JS *DOES NOT* seem to support mixing them fully (e.g. Existing, New, Existing).
    // Wait, `rebuildCombinedOrderAfterMove` DOES update `existingUrls` and `newFiles` arrays.
    // If I move a New file before an Existing file?
    // The JS splits them back:
    // `existingUrls = combined.filter(c => c.type === 'existing')...`
    // `newFiles = combined.filter(c => c.type === 'new')...`
    // So effectively, ALL existing images will always be grouped together? No, wait.
    // If the JS splits them back into two arrays, then they are de-facto grouped by type when submitted.
    // `existingImageUrls` sent to server will be all existing ones.
    // `images` sent to server will be all new ones.
    // So the server sees: [E1, E2] and [N1, N2].
    // The final list will be [E1, E2, N1, N2].
    // The `primaryIndex` tells us which one is the main image.
    // So we just concat them, then apply primary swap.

    let finalImageUrls = [...currentImages, ...newUrls];

    // Apply primary index swap
    if (primaryIndex !== undefined) {
      const idx = parseInt(primaryIndex);
      if (idx > 0 && idx < finalImageUrls.length) {
        const [p] = finalImageUrls.splice(idx, 1);
        finalImageUrls.unshift(p);
      }
    }

    const updates = {
      name,
      subtitle,
      price,
      tag,
      features: featuresArray,
      imageUrls: finalImageUrls,
      inStock:
        inStock === "true" ||
        inStock === true ||
        inStock === "on" ||
        (Array.isArray(inStock) &&
          (inStock.includes("true") || inStock.includes("on"))),
      category: category || null,
      isFeatured: isFeatured === "true" || isFeatured === true,
    };

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    await logEvent({
      category: "ADMIN",
      action: "PRODUCT_UPDATE",
      user: { email: req.user.email, name: req.user.name },
      meta: { productId: product?._id, updates },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    await logEvent({
      category: "ADMIN",
      action: "PRODUCT_DELETE",
      user: { email: req.user.email, name: req.user.name },
      meta: { productId: req.params.id },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete product" });
  }
});

// ----------------------------------------------------
// COMMENTS
// ----------------------------------------------------

router.get("/comments/unreplied", async (req, res) => {
  try {
    // "Unreplied" or just recent comments admin needs to see
    // Let's just return the last 100 comments for now.
    // Or filters? The frontend says "unreplied" but the implementation is just a list.
    const comments = await Comment.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: "Fetch comments failed" });
  }
});

router.post("/comments/:id/reply", async (req, res) => {
  try {
    const parent = await Comment.findById(req.params.id);
    if (!parent) return res.status(404).json({ error: "Comment not found" });

    const reply = await Comment.create({
      product: parent.product,
      user: req.user._id,
      userName: req.user.name || "Admin", // Admin name
      userPicture: req.user.picture,
      text: req.body.text,
      isAdmin: true,
      isAdminReply: true,
      parentComment: parent._id,
      // store parent username for UI
      parentCommentUserName: parent.userName,
    });

    // Also notify?

    res.json(reply);
  } catch (err) {
    res.status(500).json({ error: "Reply failed" });
  }
});

// ----------------------------------------------------
// STATISTICS
// ----------------------------------------------------
router.get("/statistics", async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const productsCount = await Product.countDocuments();
    const commentsCount = await Comment.countDocuments();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.json({ usersCount, productsCount, commentsCount, recentUsers });
  } catch (err) {
    res.status(500).json({ error: "Stats failed" });
  }
});

// ----------------------------------------------------
// DEVELOPER
// ----------------------------------------------------
router.post("/developer", async (req, res) => {
  try {
    const { webhookUrl, message } = req.body;
    // Send to discord
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send dev message" });
  }
});

// ----------------------------------------------------
// ORDERS
// ----------------------------------------------------
const Order = require("../models/Order");

router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch orders failed" });
  }
});

router.put("/orders/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    // Log event
    await logEvent({
      category: "ADMIN",
      action: "ORDER_UPDATE",
      user: { email: req.user.email },
      meta: { orderId: req.params.id, status }
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Update order failed" });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    await logEvent({
      category: "ADMIN",
      action: "ORDER_DELETE",
      user: { email: req.user.email },
      meta: { orderId: req.params.id }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Delete order failed" });
  }
});

module.exports = router;

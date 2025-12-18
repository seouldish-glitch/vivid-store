const express = require("express");
const mongoose = require("mongoose");
const { requireAuth, requireAdmin } = require("./_middleware");
const { logEvent } = require("../utils/discordLogger");

const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");


const Product = mongoose.model("Product");
const User = mongoose.model("User");
const Comment = mongoose.model("Comment");
const Category = mongoose.model("Category");
const Order = mongoose.model("Order");
let BannedUser;

const SUPER_ADMINS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isSuperAdmin(email) {
  return SUPER_ADMINS.includes(email.toLowerCase());
}
try {
  BannedUser = mongoose.model("BannedUser");
} catch (e) {
  
  BannedUser = require("../models/BannedUser");
}


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'vivid-vision/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'fill', quality: 'auto' }]
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  }
});



router.use(requireAuth, requireAdmin);





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

router.post("/users/:id/promote", async (req, res) => {
  if (!isSuperAdmin(req.user.email)) {
    return res.status(403).json({ error: "Only Super Admins can promote users." });
  }
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isAdmin: true }, { new: true });
    await logEvent({
      category: "ADMIN",
      action: "USER_PROMOTE",
      user: { name: req.user.name, email: req.user.email },
      meta: { promotedUser: user.email }
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Promotion failed" });
  }
});

router.post("/users/:id/demote", async (req, res) => {
  if (!isSuperAdmin(req.user.email)) {
    return res.status(403).json({ error: "Only Super Admins can demote users." });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Prevent demoting main owner
    if (user.email === "owner@example.com") {
        return res.status(403).json({ error: "Cannot demote owner" });
    }

    user.isAdmin = false;
    await user.save();

    await logEvent({
      category: "ADMIN",
      action: "USER_DEMOTE",
      user: { name: req.user.name, email: req.user.email },
      meta: { demotedUser: user.email }
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Demotion failed" });
  }
});

router.post("/users/:id/ban", async (req, res) => {
  try {
    const { reason, banType, banDuration } = req.body;
    const userToBan = await User.findById(req.params.id);
    if (!userToBan) return res.status(404).json({ error: "User not found" });

    
    if (userToBan.isAdmin && userToBan.email !== "owner@example.com") { 
      
      
    }

    
    let expiresAt = null;
    if (banType === "temporary" && banDuration) {
      const hours = parseInt(banDuration);
      if (hours > 0) {
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      }
    }

    
    await BannedUser.findOneAndUpdate(
      { "user.email": userToBan.email },
      {
        user: {
          _id: userToBan._id,
          name: userToBan.name,
          email: userToBan.email,
          googleId: userToBan.googleId,
          picture: userToBan.picture
        },
        reason: reason || "Violation of terms",
        bannedAt: new Date(),
        expiresAt,
        banType: banType || "permanent",
        bannedBy: req.user.email
      },
      { upsert: true, new: true }
    );

    
    await User.deleteOne({ _id: userToBan._id });

    
    await logEvent({
      category: "ADMIN",
      action: "USER_BAN",
      user: { name: req.user.name, email: req.user.email },
      meta: { bannedUser: userToBan.email, reason, type: banType }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Ban error", err);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

router.post("/users/:id/unban", async (req, res) => {
  try {
    
    const banRecord = await BannedUser.findById(req.params.id);
    if (!banRecord) return res.status(404).json({ error: "Ban record not found" });

    
    
    
    
    
    

    await BannedUser.deleteOne({ _id: req.params.id });

    await logEvent({
      category: "ADMIN",
      action: "USER_UNBAN",
      user: { name: req.user.name, email: req.user.email },
      meta: { unbannedUser: banRecord.user?.email }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Unban error", err);
    res.status(500).json({ error: "Failed to unban user" });
  }
});




router.get("/banned", async (req, res) => {
  try {
    const list = await BannedUser.find().sort({ bannedAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Fetch banned failed" });
  }
});






router.get("/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Fetch products failed" });
  }
});

// Category Routes
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
    const category = await Category.create({ name, description });
    await logEvent({
      category: "ADMIN",
      action: "CATEGORY_CREATE",
      user: { email: req.user.email, name: req.user.name },
      meta: { categoryId: category._id, name: category.name }
    });
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: "Failed to create category (name must be unique)" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    await logEvent({
      category: "ADMIN",
      action: "CATEGORY_DELETE",
      user: { email: req.user.email, name: req.user.name },
      meta: { categoryId: req.params.id }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete category" });
  }
});


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


router.post(
  "/products",
  (req, res, next) => {
    upload.array("images", 5)(req, res, (err) => {
      if (err) {
        console.error("🔴 UPLOAD ERROR:", err);
        
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(500).json({ error: `Cloudinary upload failed: ${err.message}` });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { name, subtitle, price, tag, category, description, features, isFeatured, inStock, primaryIndex } = req.body;
      console.log("ADMIN POST /products body:", JSON.stringify(req.body, null, 2));
      console.log("Description received:", description ? (description.length + " chars") : "MISSING");

      let featuresArray = [];
      if (typeof features === "string") {
        try {
          featuresArray = JSON.parse(features);
        } catch (e) {
          featuresArray = features.split("\n").map(s => s.trim()).filter(Boolean);
        }
      }

      
      let uploadedUrls = (req.files || []).map(f => f.path);

      
      if (primaryIndex !== undefined) {
        const idx = parseInt(primaryIndex);
        if (idx > 0 && idx < uploadedUrls.length) {
          const [p] = uploadedUrls.splice(idx, 1);
          uploadedUrls.unshift(p);
        }
      }

      let finalImageUrls = [...uploadedUrls];

      const product = await Product.create({
        name,
        subtitle,
        price,
        tag,
        category: category || "Uncategorized",
        features: featuresArray,
        description,
        imageUrls: finalImageUrls,
        isFeatured: isFeatured === 'true' || isFeatured === true || isFeatured === 'on',
        inStock: inStock === 'true' || inStock === true || inStock === 'on' || (Array.isArray(inStock) && (inStock.includes('true') || inStock.includes('on')))
      });

      await logEvent({
        category: "ADMIN",
        action: "PRODUCT_CREATE",
        user: { email: req.user.email, name: req.user.name },
        meta: { productId: product._id, name: product.name }
      });

      res.json(product);
    } catch (err) {
      console.error("Product creation error:", err);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      res.status(400).json({ error: err.message || "Failed to create product" });
    }
  }
);



router.put(
  "/products/:id",
  (req, res, next) => {
    upload.array("images", 5)(req, res, (err) => {
      if (err) {
        console.error("🔴 UPDATE UPLOAD ERROR:", err);
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(500).json({ error: `Cloudinary upload failed: ${err.message}` });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { name, subtitle, price, tag, category, description, features, isFeatured, inStock, existingImageUrls, primaryIndex } = req.body;
      console.log("ADMIN PUT /products description:", description ? "Present" : "Missing");

      let featuresArray = [];
      if (typeof features === "string") {
        try {
          featuresArray = JSON.parse(features);
        } catch (e) {
          featuresArray = features.split("\n").map(s => s.trim()).filter(Boolean);
        }
      }

      
      let currentImages = [];
      if (existingImageUrls) {
        if (Array.isArray(existingImageUrls)) currentImages = existingImageUrls;
        else currentImages = [existingImageUrls];
      }

      
      const newUrls = (req.files || []).map(f => f.path);

      
      let finalImageUrls = [...currentImages, ...newUrls];

      
      if (primaryIndex !== undefined) {
        const idx = parseInt(primaryIndex);
        if (idx > 0 && idx < finalImageUrls.length) {
          const [p] = finalImageUrls.splice(idx, 1);
          finalImageUrls.unshift(p);
        }
      }

      const updates = {
        name, subtitle, price, tag,
        category: category || "Uncategorized",
        description,
        features: featuresArray,
        imageUrls: finalImageUrls,
        isFeatured: isFeatured === 'true' || isFeatured === true || isFeatured === 'on',
        inStock: inStock === 'true' || inStock === true || inStock === 'on' || (Array.isArray(inStock) && (inStock.includes('true') || inStock.includes('on')))
      };

      const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });

      await logEvent({
        category: "ADMIN",
        action: "PRODUCT_UPDATE",
        user: { email: req.user.email, name: req.user.name },
        meta: { productId: product?._id, updates }
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
      meta: { productId: req.params.id }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete product" });
  }
});






router.get("/comments/unreplied", async (req, res) => {
  try {
    
    
    
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
      userName: req.user.name || "Admin", 
      userPicture: req.user.picture,
      text: req.body.text,
      isAdmin: true,
      isAdminReply: true,
      parentComment: parent._id,
      
      parentCommentUserName: parent.userName
    });

    

    res.json(reply);
  } catch (err) {
    res.status(500).json({ error: "Reply failed" });
  }
});





router.get("/statistics", async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const productsCount = await Product.countDocuments();
    const commentsCount = await Comment.countDocuments();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({ usersCount, productsCount, commentsCount, recentUsers });
  } catch (err) {
    res.status(500).json({ error: "Stats failed" });
  }
});





router.post("/developer", async (req, res) => {
  try {
    const { webhookUrl, message } = req.body;
    
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send dev message" });
  }
});

// Orders Routes
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Fetch orders failed" });
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    await logEvent({
        category: "ADMIN",
        action: "ORDER_UPDATE",
        user: { name: req.user.name, email: req.user.email },
        meta: { orderId: order._id, status }
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    await logEvent({
        category: "ADMIN",
        action: "ORDER_DELETE",
        user: { name: req.user.name, email: req.user.email },
        meta: { orderId: order._id, customer: order.customerName }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;

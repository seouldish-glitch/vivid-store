require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const mongoose = require("mongoose");
const path = require("path");
const MongoStore = require("connect-mongo");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

app.set("trust proxy", true);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log("✅ MongoDB connected");
    return db;
  } catch (err) {
    console.error("Mongo error", err);
  }
};

const UserSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
  picture: String,
  isAdmin: { type: Boolean, default: false },
  lastIp: String,
  lastLoginAt: Date,
  cart: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, default: 1 },
    },
  ],
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  slug: String,
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  name: String,
  subtitle: String,
  price: Number,
  tag: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  imageUrls: [String],
  features: [String],
  inStock: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
});

const CommentSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: String,
  userPicture: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
  isAdminReply: { type: Boolean, default: false },
});

const CheckoutTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  token: { type: String, required: true },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
});

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      name: String,
      price: Number,
    }
  ],
  total: Number,
  fullName: String,
  address: String,
  phone: String,
  postalCode: String,
  dob: Date,
  province: String,
  status: { type: String, default: "Pending" },
}, { timestamps: true });

const AnnouncementSchema = new mongoose.Schema({
  message: { type: String, required: true },
  title: { type: String, default: "Announcement" },
  type: { type: String, default: "info" },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Comment = mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
const CheckoutToken = mongoose.models.CheckoutToken || mongoose.model("CheckoutToken", CheckoutTokenSchema);
const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
const Announcement = mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);

let BannedUserModel = null;
try {
  BannedUserModel = mongoose.models.BannedUser || require("./models/BannedUser");
} catch (e) {
  console.warn("BannedUser model could not be loaded");
}

app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CALLBACK_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0].value;
        const photo = profile.photos && profile.photos[0]?.value;
        const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
        const isAdmin = email ? adminEmailsLower.includes(email.toLowerCase()) : false;

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
            picture: photo || "",
            isAdmin,
          });
        } else {
          user.name = profile.displayName || user.name;
          user.email = email || user.email;
          if (photo) user.picture = photo;
          user.isAdmin = isAdmin;
          await user.save();
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.user && req.user.email) {
    const userEmail = String(req.user.email).trim().toLowerCase();
    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (adminEmailsLower.includes(userEmail)) {
      req.user.isAdmin = true;
    }
  }
  next();
});

async function logEvent(title, payload) {
  try {
    if (!process.env.DISCORD_WEBHOOK_URL) return;

    const msg = "**" + title + "**\n```json\n" + JSON.stringify(payload, null, 2) + "\n```";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: msg }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!response.ok) console.warn(`Discord log returned status ${response.status}`);
  } catch (err) {
    console.error("Discord log failed:", err.message);
  }
}

app.use(async (req, res, next) => {
  try {
    const trackedPaths = ["/", "/home", "/products", "/product", "/contact", "/checkout"];
    const isMainPath = trackedPaths.some(p => req.path === p || (p !== "/" && req.path.startsWith(p)));

    if (isMainPath && process.env.DISCORD_WEBHOOK_URL) {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent') || 'Unknown';
      const user = req.user ? `${req.user.name} (${req.user.email})` : 'Guest';
      
      logEvent("New Visitor Detected", {
        path: req.path,
        user: user,
        ip: ip,
        userAgent: userAgent,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Visitor logging error:", err);
  }
  next();
});

const banAndSessionMiddleware = async (req, res, next) => {
  if (
    req.path === "/banned" ||
    req.path === "/api/ban-info" ||
    req.path.startsWith("/auth/") ||
    req.path.startsWith("/api/auth/")
  ) {
    return next();
  }

  if (req.user && BannedUserModel) {
    try {
      const banned = await BannedUserModel.findOne({
        $and: [
          {
            $or: [
              { "user.email": req.user.email },
              { "user.googleId": req.user.googleId }
            ]
          },
          {
            $or: [
              { expiresAt: null },
              { expiresAt: { $gt: new Date() } }
            ]
          }
        ]
      }).lean();

      if (banned) {
        if (banned.expiresAt && new Date(banned.expiresAt) <= new Date()) {
          await BannedUserModel.deleteOne({ _id: banned._id }).catch(() => { });
          return next();
        }

        req.session.banReason = banned.reason || "Violation of terms";
        req.session.bannedAt = banned.bannedAt;
        req.session.banExpiresAt = banned.expiresAt;
        req.session.banType = banned.banType || "permanent";
        req.session.bannedEmail = req.user.email;

        req.session.save((err) => {
          if (err) console.error("Session save error:", err);
          return res.redirect("/banned");
        });
        return;
      }
    } catch (err) {
      console.error("Banned user check failed", err);
    }
  }
  next();
};

app.use('/api', banAndSessionMiddleware);
app.use('/admin', banAndSessionMiddleware);

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) return next();
  if (req.path.startsWith("/api/") || req.get("Accept")?.includes("application/json")) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
}

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      const clientIp = req.ip || req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() || req.connection.remoteAddress;
      if (req.user && clientIp) {
        req.user.lastIp = clientIp;
        req.user.lastLoginAt = new Date();
        await req.user.save().catch(() => { });
      }

      if (req.user && BannedUserModel) {
        const banned = await BannedUserModel.findOne({
          $and: [
            { $or: [{ "user.email": req.user.email }, { "user.googleId": req.user.googleId }] },
            { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }
          ]
        }).lean();

        if (banned) {
          if (banned.expiresAt && new Date(banned.expiresAt) <= new Date()) {
            await BannedUserModel.deleteOne({ _id: banned._id }).catch(() => { });
            return res.redirect(req.user.isAdmin ? "/admin" : "/");
          }

          try { await User.deleteOne({ _id: req.user._id }); } catch (e) { }

          req.session.banReason = banned.reason || "Violation of terms";
          req.session.bannedAt = banned.bannedAt;
          req.session.banExpiresAt = banned.expiresAt;
          req.session.banType = banned.banType || "permanent";
          req.session.bannedEmail = req.user.email;

          req.session.save(() => res.redirect("/banned"));
          return;
        }
      }

      res.redirect(req.user && req.user.isAdmin ? "/admin" : "/");
    } catch (err) {
      res.redirect("/login");
    }
  }
);

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => res.redirect("/"));
  });
});

app.get("/api/ban-info", async (req, res) => {
  try {
    let banInfo = { isBanned: false, reason: null, bannedAt: null, expiresAt: null, banType: null };
    const emailToCheck = req.query.email || (req.session && req.session.bannedEmail) || null;
    const hasSessionBanInfo = req.session && req.session.banReason;

    if (BannedUserModel && (emailToCheck || hasSessionBanInfo)) {
      let banned = null;
      if (emailToCheck) {
        banned = await BannedUserModel.findOne({
          $and: [{ "user.email": emailToCheck }, { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }]
        }).lean();
      } else if (hasSessionBanInfo && req.session.bannedEmail) {
        banned = await BannedUserModel.findOne({
          $and: [{ "user.email": req.session.bannedEmail }, { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }]
        }).lean();
      }

      if (banned) {
        banInfo = {
          isBanned: true,
          reason: banned.reason || "Violation of terms",
          bannedAt: banned.bannedAt,
          expiresAt: banned.expiresAt,
          banType: banned.banType || "permanent",
          email: banned.user?.email || emailToCheck
        };
      } else if (hasSessionBanInfo) {
        banInfo = {
          isBanned: true,
          reason: req.session.banReason,
          bannedAt: req.session.bannedAt,
          expiresAt: req.session.banExpiresAt,
          banType: req.session.banType || "permanent",
          email: req.session.bannedEmail || emailToCheck
        };
      }
    }
    res.json(banInfo);
  } catch (err) {
    res.json({ isBanned: false });
  }
});

app.post("/api/ban-appeal", async (req, res) => {
  try {
    const { email, message } = req.body;
    if (!email || !message) return res.status(400).json({ error: "Email and message required" });
    if (!BannedUserModel) return res.status(500).json({ error: "Ban system not available" });
    const banned = await BannedUserModel.findOne({ "user.email": email });
    if (!banned) return res.status(404).json({ error: "No ban found" });
    banned.appealStatus = "pending";
    banned.appealMessage = message;
    await banned.save();
    if (process.env.DISCORD_WEBHOOK_URL) {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `**Ban Appeal Submitted**\n**User:** ${email}\n**Appeal:** ${message}` })
      }).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit appeal" });
  }
});

app.get("/banned", (req, res) => res.sendFile(path.join(__dirname, "public", "banned.html")));
app.get("/admin/product-editor", requireAdmin, (req, res) => res.sendFile(path.join(__dirname, "public", "admin-product-editor.html")));
app.get("/admin", requireAdmin, (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/contact", (req, res) => res.sendFile(path.join(__dirname, "public", "contact.html")));
app.get("/products", (req, res) => res.sendFile(path.join(__dirname, "public", "products.html")));
app.get("/product", (req, res) => res.sendFile(path.join(__dirname, "public", "product.html")));

try {
  const adminRoutes = require("./routes/adminRoutes");
  app.use("/api/admin", adminRoutes);
} catch (e) {}

app.get("/api/me", (req, res) => {
  if (!req.user) return res.json({ loggedIn: false });
  const { name, email, isAdmin, picture } = req.user;
  res.json({ loggedIn: true, user: { name, email, isAdmin, picture } });
});

app.get("/avatar", async (req, res) => {
  const defaultPath = path.join(__dirname, "public", "default-user.jpeg");
  if (!req.user || !req.user.picture) return res.sendFile(defaultPath);
  try {
    const r = await fetch(req.user.picture);
    if (!r.ok) return res.sendFile(defaultPath);
    const buffer = await r.arrayBuffer();
    res.set("Content-Type", "image/jpeg").send(Buffer.from(buffer));
  } catch (err) { res.sendFile(defaultPath); }
});

app.get("/avatar/user/:userId", async (req, res) => {
  const defaultPath = path.join(__dirname, "public", "default-user.jpeg");
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user || !user.picture) return res.sendFile(defaultPath);
    const r = await fetch(user.picture);
    if (!r.ok) return res.sendFile(defaultPath);
    const buffer = await r.arrayBuffer();
    res.set("Content-Type", "image/jpeg").send(Buffer.from(buffer));
  } catch (err) { res.sendFile(defaultPath); }
});

app.get("/api/products", async (req, res) => res.json(await Product.find()));
app.get("/api/categories", async (req, res) => res.json(await Category.find().sort({ name: 1 })));
app.get("/api/products/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).lean();
    p ? res.json(p) : res.status(404).json({ error: "Not found" });
  } catch (err) { res.status(404).json({ error: "Not found" }); }
});

app.get("/api/products/:id/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ product: req.params.id }).sort({ createdAt: 1 }).lean();
    const idToName = {};
    comments.forEach(c => idToName[String(c._id)] = c.userName);
    res.json(comments.map(c => ({
      id: c._id, userName: c.userName, userPicture: c.userPicture, text: c.text, createdAt: c.createdAt,
      isAdmin: !!c.isAdmin, isAdminReply: !!c.isAdminReply, parentCommentId: c.parentComment || null,
      parentCommentUserName: c.parentComment ? idToName[String(c.parentComment)] : null,
      canDelete: !!(req.user && (req.user.isAdmin || String(c.user) === String(req.user._id))),
      canReply: !!(req.user && req.user.isAdmin), avatarUrl: `/avatar/user/${c.user}`
    })));
  } catch (err) { res.status(500).json({ error: "Failed to load comments" }); }
});

app.post("/api/products/:id/comments", requireUser, async (req, res) => {
  const { text, parentCommentId } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: "Text required" });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Not found" });

  const profanityList = ["fuck", "shit", "bitch", "asshole", "nigger", "porn"];
  const profanityRegex = new RegExp("\\b(?:" + profanityList.join('|') + ")\\b", "i");
  if (profanityRegex.test(text) || /\b(?:https?:\/\/|www\.)\S+\b/i.test(text)) {
    try {
      const userId = req.user._id;
      const userDoc = await User.findById(userId).lean();
      if (BannedUserModel) {
        await new BannedUserModel({
          originalUserId: String(userId), user: userDoc || {}, reason: 'Auto-moderation',
          banType: 'temporary', expiresAt: new Date(Date.now() + 5 * 3600000), bannedBy: 'auto-mod'
        }).save();
      }
      await Comment.deleteMany({ user: userId });
      await User.deleteOne({ _id: userId });
      if (req.session) req.session.destroy();
      return res.status(403).json({ error: 'Banned for rules violation' });
    } catch (e) { return res.status(403).json({ error: 'Comment blocked' }); }
  }

  const comment = await Comment.create({
    product: product._id, user: req.user._id, userName: req.user.name, userPicture: req.user.picture,
    text: text.trim(), isAdmin: !!req.user.isAdmin, parentComment: parentCommentId || null,
    isAdminReply: !!(req.user.isAdmin && parentCommentId)
  });
  logEvent("COMMENT_CREATE", { user: req.user.email, text: comment.text });
  res.json(comment);
});

app.delete("/api/products/:productId/comments/:commentId", requireUser, async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.commentId, product: req.params.productId });
  if (req.user.isAdmin || (comment && String(comment.user) === String(req.user._id))) {
    await comment.deleteOne();
    return res.json({ ok: true });
  }
  res.status(403).json({ error: "Access denied" });
});

app.get("/api/cart", requireUser, (req, res) => res.json((req.user.cart || []).map(c => ({ productId: c.product, quantity: c.quantity }))));
app.post("/api/cart", requireUser, async (req, res) => {
  req.user.cart = (req.body.items || []).map(it => ({ product: it.productId, quantity: it.quantity }));
  await req.user.save();
  res.json({ ok: true });
});

app.post("/api/checkout/submit", requireUser, async (req, res) => {
  const { fullName, address, phone, agree } = req.body;
  if (!agree) return res.status(400).json({ error: "Terms must be accepted" });
  if (!/^\d{9}$/.test(phone)) return res.status(400).json({ error: "Phone invalid" });
  const user = await User.findById(req.user._id).populate("cart.product");
  const items = user.cart.map(c => ({ product: c.product._id, quantity: c.quantity, name: c.product.name, price: c.product.price }));
  const order = await Order.create({ user: req.user._id, items, total: items.reduce((a,b)=>a+b.price*b.quantity,0), fullName, address, phone: "+94"+phone });
  req.user.cart = [];
  await req.user.save();
  logEvent("ORDER_CREATED", { orderId: order._id, user: req.user.email });
  res.json({ ok: true });
});

app.get("/api/announcements/active", async (req, res) => res.json(await Announcement.find({ isActive: true }).sort({ createdAt: -1 })));

app.get("/checkout", requireUser, (req, res) => {
    if (!req.user.cart?.length) return res.redirect("/");
    res.sendFile(path.join(__dirname, "public", "checkout.html"));
});

app.get("/home", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
    res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

module.exports = app;

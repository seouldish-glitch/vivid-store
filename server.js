

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

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy so req.ip reflects client IPs behind proxies (Heroku / nginx)
app.set("trust proxy", true);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const uploadsDir = path.join(__dirname, "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
} catch (err) {
  console.warn("Could not create uploads directory (expected on some read-only systems):", err.message);
}

if (!process.env.MONGO_URI) {
  console.error("❌ CRITICAL: MONGO_URI is not defined in environment variables!");
}

mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => {
    console.log("✅ MongoDB connected");
    // Run cleanup once on startup when connection is ready
    if (mongoose.models.BannedUser) {
      mongoose.models.BannedUser.deleteMany({
        banType: "temporary",
        expiresAt: { $lte: new Date() }
      }).then(result => {
        if (result.deletedCount > 0) {
          console.log(`🧹 Cleaned up ${result.deletedCount} expired temporary ban(s) on startup`);
        }
      }).catch(err => console.error("Failed to cleanup expired bans on startup:", err));
    }
  })
  .catch((err) => console.error("Mongo error", err));

const UserSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
  picture: String,
  isAdmin: { type: Boolean, default: false },
  lastIp: String, // Track last login IP
  lastLoginAt: Date, // Track last login time
  cart: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, default: 1 },
    },
  ],
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  name: String,
  subtitle: String,
  price: Number,
  tag: String,
  imageUrls: [String],
  category: { type: String, default: "Uncategorized" },
  description: String,
  isFeatured: { type: Boolean, default: false },
  features: [String],
  inStock: { type: Boolean, default: true },
});

const CommentSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: String,
  userPicture: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false },   // admin commenter
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // reply-to
  isAdminReply: { type: Boolean, default: false }, // admin reply to a specific comment
});

const User = mongoose.model("User", UserSchema);
const Product = mongoose.model("Product", ProductSchema);
const Comment = mongoose.model("Comment", CommentSchema);

// Load admin-related models (only BannedUser needed now)
// require the models so they register with mongoose
// (this file should exist: ./models/BannedUser.js)
try {
  require("./models/BannedUser");
} catch (e) {
  // If file is missing, middleware below will simply not find entries.
  // Log for visibility — but we don't crash so server can still run.
  console.warn("Warning: BannedUser model not loaded (./models/BannedUser.js missing or error).", e.message || e);
}

// Grab the BannedUser model (if available)
let BannedUserModel = null;
try {
  BannedUserModel = mongoose.model("BannedUser");
} catch (e) {
  BannedUserModel = null;
}

// Load Category model
try {
  require("./models/Category");
} catch (e) {
  console.warn("Category model failed to load", e);
}

// Load Order model
try {
  require("./models/Order");
} catch (e) {
  console.warn("Order model failed to load", e);
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    store: (process.env.MONGO_URI) 
      ? MongoStore.create({ mongoUrl: process.env.MONGO_URI })
      : undefined,
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
        const isEnvAdmin = email ? adminEmailsLower.includes(email.toLowerCase()) : false;

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
            picture: photo || "",
            isAdmin: isEnvAdmin,
          });
        } else {
          user.name = profile.displayName || user.name;
          user.email = email || user.email;
          if (photo) user.picture = photo;
          
          // Only force true if they are in the ENV list. 
          // Otherwise, respect the existing DB value (allows manual promotion).
          if (isEnvAdmin) {
            user.isAdmin = true;
          }
          
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


const banAndSessionMiddleware = async (req, res, next) => {
  // Allow access to banned page, logout, auth routes, and ban-info API
  if (
    req.path === "/banned" ||
    req.path === "/api/ban-info" ||
    req.path.startsWith("/auth/") ||
    req.path.startsWith("/api/auth/")
  ) {
    return next();
  }

  // Check if logged-in user is banned
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
              { expiresAt: null }, // Permanent ban
              { expiresAt: { $gt: new Date() } } // Temporary ban not expired
            ]
          }
        ]
      }).lean();

      if (banned) {
        // If temporary ban has expired, remove and continue
        if (banned.expiresAt && new Date(banned.expiresAt) <= new Date()) {
          await BannedUserModel.deleteOne({ _id: banned._id }).catch(() => { });
          return next();
        }

        // Store ban info in session
        req.session.banReason = banned.reason || "Violation of terms";
        req.session.bannedAt = banned.bannedAt;
        req.session.banExpiresAt = banned.expiresAt;
        req.session.banType = banned.banType || "permanent";
        req.session.bannedEmail = req.user.email; // Store email for verification

        // Save session before redirect so /banned and /api/ban-info can read it.
        // IMPORTANT: do NOT forcibly logout here — redirect only.
        req.session.save((err) => {
          if (err) console.error("Session save error:", err);
          return res.redirect("/banned");
        });
        return; // early return after redirect
      }
    } catch (err) {
      console.error("Banned user check failed", err);
      // Continue on error to avoid blocking legitimate users
    }
  }

  next();
};

// Mount middleware on desired routes (keep original mounts)
app.use('/api', banAndSessionMiddleware);
app.use('/admin', banAndSessionMiddleware);



function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

function requireAdmin(req, res, next) {
  const notAdmin = !req.user || !req.user.isAdmin;

  if (!notAdmin) return next();

  if (req.path.startsWith("/api/") || req.get("Accept")?.includes("application/json")) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
}




app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      console.log("Logged in as:", req.user && req.user.email);

      // Track IP address (stored for informational purposes only)
      const clientIp = req.ip || req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() || req.connection.remoteAddress;
      if (req.user && clientIp) {
        req.user.lastIp = clientIp;
        req.user.lastLoginAt = new Date();
        await req.user.save().catch(() => { });
      }

      // Check if user is banned after successful authentication
      if (req.user && BannedUserModel) {
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
                { expiresAt: null }, // Permanent ban
                { expiresAt: { $gt: new Date() } } // Temporary ban not expired
              ]
            }
          ]
        }).lean();

        if (banned) {
          // If temporary ban expired, delete it and proceed
          if (banned.expiresAt && new Date(banned.expiresAt) <= new Date()) {
            await BannedUserModel.deleteOne({ _id: banned._id }).catch(() => { });
            if (req.user && req.user.isAdmin) {
              return res.redirect("/admin");
            }
            return res.redirect("/");
          }

          // Delete the newly created account if it was just created (banned users shouldn't have accounts)
          try {
            await User.deleteOne({ _id: req.user._id });
          } catch (deleteErr) {
            console.error("Failed to delete banned user account:", deleteErr);
          }

          // Store ban info in session and redirect to banned page
          req.session.banReason = banned.reason || "Violation of terms";
          req.session.bannedAt = banned.bannedAt;
          req.session.banExpiresAt = banned.expiresAt;
          req.session.banType = banned.banType || "permanent";
          req.session.bannedEmail = req.user.email; // Store email for verification

          // Save session before redirect so the banned page can read it.
          // Note: we do NOT call req.logout here because that would clear the session
          // and prevent /api/ban-info or /banned from showing useful info.
          req.session.save((err) => {
            if (err) console.error("Session save error:", err);
            return res.redirect("/banned");
          });
          return;
        }
      }

      if (req.user && req.user.isAdmin) {
        return res.redirect("/admin");
      }
      return res.redirect("/");
    } catch (err) {
      console.error("Auth callback error:", err);
      return res.redirect("/login");
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

    // Get email from query param, session bannedEmail, or session banReason (which means they're banned)
    const emailToCheck = req.query.email
      || (req.session && req.session.bannedEmail)
      || null;

    // If we have session ban info, user is definitely banned - check database to get full details
    const hasSessionBanInfo = req.session && req.session.banReason;

    // Check database if email is available OR if session has ban info
    if (BannedUserModel && (emailToCheck || hasSessionBanInfo)) {
      // If we have email, check by email. Otherwise, if session has banReason, try to find by session data
      let banned = null;

      if (emailToCheck) {
        banned = await BannedUserModel.findOne({
          $and: [
            { "user.email": emailToCheck },
            {
              $or: [
                { expiresAt: null }, // Permanent ban
                { expiresAt: { $gt: new Date() } } // Temporary ban not expired
              ]
            }
          ]
        }).lean();
      } else if (hasSessionBanInfo && req.session.bannedEmail) {
        // Try using session's bannedEmail
        banned = await BannedUserModel.findOne({
          $and: [
            { "user.email": req.session.bannedEmail },
            {
              $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
              ]
            }
          ]
        }).lean();
      }

      if (banned) {
        // Check if temporary ban has expired
        if (banned.expiresAt && new Date(banned.expiresAt) <= new Date()) {
          banInfo.isBanned = false;
        } else {
          // Extract email from banned user object
          const bannedEmail = (banned.user && typeof banned.user === 'object' && banned.user.email)
            ? banned.user.email
            : (emailToCheck || req.session.bannedEmail || null);

          banInfo = {
            isBanned: true,
            reason: banned.reason || "Violation of terms",
            bannedAt: banned.bannedAt,
            expiresAt: banned.expiresAt,
            banType: banned.banType || "permanent",
            bannedBy: banned.bannedBy,
            email: bannedEmail
          };
        }
      } else if (hasSessionBanInfo) {
        // If database check failed but session has ban info, use session data
        banInfo = {
          isBanned: true,
          reason: req.session.banReason,
          bannedAt: req.session.bannedAt,
          expiresAt: req.session.banExpiresAt,
          banType: req.session.banType || "permanent",
          email: req.session.bannedEmail || emailToCheck || null
        };
      }
    } else if (hasSessionBanInfo) {
      // Fallback: if session has ban info but no database check possible, use session
      banInfo = {
        isBanned: true,
        reason: req.session.banReason,
        bannedAt: req.session.bannedAt,
        expiresAt: req.session.banExpiresAt,
        banType: req.session.banType || "permanent",
        email: req.session.bannedEmail || emailToCheck
      };
    }

    res.json(banInfo);
  } catch (err) {
    console.error("Ban info error:", err);
    res.json({ isBanned: false, reason: null, bannedAt: null, expiresAt: null, banType: null });
  }
});

app.post("/api/ban-appeal", async (req, res) => {
  try {
    const { email, message } = req.body;
    if (!email || !message) {
      return res.status(400).json({ error: "Email and message required" });
    }

    if (!BannedUserModel) {
      return res.status(500).json({ error: "Ban system not available" });
    }

    const banned = await BannedUserModel.findOne({
      "user.email": email
    });

    if (!banned) {
      return res.status(404).json({ error: "No ban found for this email" });
    }

    banned.appealStatus = "pending";
    banned.appealMessage = message;
    await banned.save();

    // Notify admins via Discord if webhook is configured
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `**Ban Appeal Submitted**\n\n**User:** ${email}\n**Ban Reason:** ${banned.reason}\n**Appeal Message:**\n${message}`
          })
        });
      } catch (err) {
        console.error("Discord notification failed:", err);
      }
    }

    res.json({ success: true, message: "Appeal submitted successfully" });
  } catch (err) {
    console.error("Ban appeal error:", err);
    res.status(500).json({ error: "Failed to submit appeal" });
  }
});

app.get("/banned", async (req, res) => {
  // Get email to check - from logged in user or from session (for banned users who were logged out)
  let emailToCheck = null;
  if (req.user && req.user.email) {
    emailToCheck = req.user.email;
  } else if (req.session && req.session.bannedEmail) {
    emailToCheck = req.session.bannedEmail;
  }

  // Check if session has ban info
  const hasSessionBanInfo = req.session && req.session.banReason;

  // Check if user is actually banned in database
  let isBanned = false;

  // First, try to check database if we have email
  if (BannedUserModel && emailToCheck) {
    try {
      const banned = await BannedUserModel.findOne({
        $and: [
          { "user.email": emailToCheck },
          {
            $or: [
              { expiresAt: null }, // Permanent ban
              { expiresAt: { $gt: new Date() } } // Temporary ban not expired
            ]
          }
        ]
      }).lean();

      if (banned) {
        // Check if temporary ban has expired
        if (banned.expiresAt && new Date(banned.expiresAt) <= new Date()) {
          isBanned = false;
          // Clear session if ban expired
          if (req.session) {
            req.session.banReason = null;
            req.session.bannedAt = null;
            req.session.banExpiresAt = null;
            req.session.banType = null;
            req.session.bannedEmail = null;
          }
        } else {
          isBanned = true;
        }
      }
    } catch (err) {
      console.error("Ban check error:", err);
    }
  }

  // If database check didn't find ban but session has ban info, trust session (user was just banned)
  if (!isBanned && hasSessionBanInfo) {
    // Double-check: try to find by session's bannedEmail if available
    if (BannedUserModel && req.session.bannedEmail) {
      try {
        const banned = await BannedUserModel.findOne({
          $and: [
            { "user.email": req.session.bannedEmail },
            {
              $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
              ]
            }
          ]
        }).lean();

        if (banned && (!banned.expiresAt || new Date(banned.expiresAt) > new Date())) {
          isBanned = true;
        }
      } catch (err) {
        console.error("Session ban check error:", err);
      }
    }

    // If still not found but session has ban info, trust session
    if (!isBanned && hasSessionBanInfo) {
      isBanned = true;
    }
  }

  // If user is NOT banned, show 404
  if (!isBanned) {
    return res
      .status(404)
      .sendFile(path.join(__dirname, "public", "404.html"));
  }

  // User is banned → show banned page
  return res.sendFile(path.join(__dirname, "public", "banned.html"));
});

app.get(["/admin/product-editor"], (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  }
  return res.sendFile(path.join(__dirname, "public", "admin-product-editor.html"));
});

app.get(["/admin"], (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    // Always pretend it doesn't exist
    return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  }

  // Send the renamed protected version
  return res.sendFile(path.join(__dirname, "public", "admin.html"));
});



app.get(["/login"], (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get(["/contact"], (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get(["/product"], (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "product.html"));
});

app.get(["/products"], (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "products.html"));
});

app.get(["/checkout"], (req, res) => {
  const token = req.query.q;
  if (!token || !req.session.checkoutToken || token !== req.session.checkoutToken) {
    // Show 404 if token is invalid or missing
    const path = require("path");
    return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  }
  return res.sendFile(path.join(__dirname, "public", "checkout.html"));
});

try {
  const adminRoutes = require("./routes/adminRoutes");
  app.use("/api/admin", adminRoutes);
} catch (e) {
  console.warn("Warning: admin routes not mounted (./routes/adminRoutes.js missing or error).", e.message || e);
}

app.get("/admin.html", (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res
      .status(404)
      .sendFile(path.join(__dirname, "public", "404.html"));
  }

  return res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(uploadsDir));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads allowed"));
    }
    cb(null, true);
  },
});

async function logEvent(title, payload) {
  try {
    if (!process.env.DISCORD_WEBHOOK_URL) return;

    const msg =
      "**" +
      title +
      "**\n```json\n" +
      JSON.stringify(payload, null, 2) +
      "\n```";

    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: msg }),
    });
  } catch (err) {
    console.error("Discord log failed", err);
  }
}

app.get("/api/me", (req, res) => {
  if (!req.user) return res.json({ loggedIn: false });

  const { name, email, isAdmin, picture } = req.user;
  res.json({
    loggedIn: true,
    user: { name, email, isAdmin, picture },
  });
});

// Avatar for current logged-in user (navbar)
app.get("/avatar", async (req, res) => {
  try {
    const defaultPath = path.join(__dirname, "public", "default-user.jpeg");

    if (!req.user || !req.user.picture) {
      return res.sendFile(defaultPath);
    }

    const r = await fetch(req.user.picture);
    if (!r.ok) {
      return res.sendFile(defaultPath);
    }

    const buffer = await r.arrayBuffer();
    res.set("Content-Type", "image/jpeg");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Avatar proxy failed", err);
    const fallback = path.join(__dirname, "public", "default-user.jpeg");
    return res.sendFile(fallback);
  }
});

// Avatar for any user by ID (for comments)
app.get("/avatar/user/:userId", async (req, res) => {
  try {
    const defaultPath = path.join(__dirname, "public", "default-user.jpeg");
    const userId = req.params.userId;

    const user = await User.findById(userId).lean();
    if (!user || !user.picture) {
      return res.sendFile(defaultPath);
    }

    const r = await fetch(user.picture);
    if (!r.ok) {
      return res.sendFile(defaultPath);
    }

    const buffer = await r.arrayBuffer();
    res.set("Content-Type", "image/jpeg");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Avatar user proxy failed", err);
    const fallback = path.join(__dirname, "public", "default-user.jpeg");
    return res.sendFile(fallback);
  }
});

//--------------------------------------------------
// Products
//--------------------------------------------------
app.get("/api/products", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.get("/api/categories", async (req, res) => {
  try {
    // If you need Category model, ensure it's loaded (it was loaded earlier in conditional block)
    const Category = mongoose.model("Category");
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Fetch categories failed" });
  }
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Hello from test endpoint", time: Date.now() });
});

app.get("/api/products/:id", async (req, res) => {
  console.log(`API: Fetch product ${req.params.id}`);
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p) {
      console.log("API: Product not found");
      return res.status(404).json({ error: "Not found" });
    }
    console.log("API: Sending JSON response", p._id);
    res.json(p);
    console.log("API: JSON response sent");
  } catch (err) {
    console.error("API: Error fetching product", err);
    res.status(404).json({ error: "Not found" });
  }
});

// Admin: create product


// Admin: delete product (also remove uploaded image file when applicable)


//--------------------------------------------------
// Product comments
//--------------------------------------------------

// Get comments for a product
app.get("/api/products/:id/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ product: req.params.id })
      .sort({ createdAt: 1 }) // oldest first makes replies feel natural
      .lean();

    const viewer = req.user || null;
    const viewerIsAdmin = !!(viewer && viewer.isAdmin);

    // map for parent name lookup
    const idToName = {};
    comments.forEach((c) => {
      idToName[String(c._id)] = c.userName;
    });

    res.json(
      comments.map((c) => ({
        id: c._id,
        userName: c.userName,
        userPicture: c.userPicture,
        text: c.text,
        createdAt: c.createdAt,
        isAdmin: !!c.isAdmin,
        isAdminReply: !!c.isAdminReply,
        parentCommentId: c.parentComment || null,
        parentCommentUserName: c.parentComment
          ? idToName[String(c.parentComment)] || null
          : null,
        canDelete: !!(
          viewer &&
          (viewer.isAdmin || String(c.user) === String(viewer._id))
        ),
        canReply: viewerIsAdmin, // only admins get reply button
        avatarUrl: `/avatar/user/${c.user}`,
      }))
    );
  } catch (err) {
    console.error("Error loading comments", err);
    res.status(500).json({ error: "Failed to load comments" });
  }
});

app.post("/api/products/:id/comments", requireUser, async (req, res) => {
  try {
    const { text, parentCommentId } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text required" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findOne({
        _id: parentCommentId,
        product: product._id,
      });
      if (!parentComment) {
        return res.status(400).json({ error: "Parent comment not found" });
      }
    }

    // Server-side moderation: detect links and basic profanity
    const lower = (text || '').toLowerCase();
    const linkRegex = /\b(?:https?:\/\/|www\.)\S+\b/i;
    // Expanded local profanity list (Robust check without external API)
    const profanityList = [
      "fuck", "shit", "bitch", "asshole", "damn", "bastard", "crap", "piss", "dick", "cock", "pussy", "slut", "whore",
      "fag", "dyke", "nigger", "nigga", "chink", "kike", "spic", "wetback", "retard", "cunt", "motherfucker",
      "cocksucker", "tits", "boobs", "wanker", "bollocks", "arse", "prick", "twat", "cum", "jizz", "anal", "anus",
      "blowjob", "dildo", "fucker", "shitty", "bitching", "dumbass", "jackass", "idiot", "sex", "porn", "xxx"
    ];
    const profanityRegex = new RegExp("\\b(?:" + profanityList.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ")\\b", "i");

    const hasLink = linkRegex.test(text);
    const hasProfanity = profanityRegex.test(text);

    if (hasLink || hasProfanity) {
      // Auto-moderation: create a temporary ban snapshot (5 hours) and remove the user and their comments
      try {
        const userId = req.user && req.user._id;
        const userDoc = await User.findById(userId).lean();
        const comments = await Comment.find({ user: userId }).lean().catch(() => []);
        const carts = (userDoc && userDoc.cart) ? userDoc.cart : [];

        const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours

        if (BannedUserModel) {
          const banned = new BannedUserModel({
            originalUserId: String(userId),
            user: userDoc || {},
            reason: hasLink ? 'Posted a link in comments' : 'Posted profanity in comments',
            bannedAt: new Date(),
            expiresAt,
            banType: 'temporary',
            bannedBy: 'auto-moderator',
            comments: comments || [],
            carts: carts || [],
            orders: []
          });
          await banned.save().catch(() => { });
        }

        // remove comments and user record
        try { await Comment.deleteMany({ user: userId }).catch(() => { }); } catch (e) { }
        try { await User.deleteOne({ _id: userId }).catch(() => { }); } catch (e) { }

        // Add BannedIP entry if available
        try {
          const BannedIP = require('./models/BannedIP');
          const BannedIPModel = mongoose.model('BannedIP');
          if (userDoc && userDoc.lastIp) {
            await BannedIPModel.create({ ip: userDoc.lastIp, reason: `Auto-ban: ${hasLink ? 'link' : 'profanity'}` }).catch(() => { });
          }
        } catch (e) {
          // ignore if model not present
        }

        // destroy session so the user is effectively logged out
        try { if (req.session) req.session.destroy(() => { }); } catch (e) { }

        // Respond with 403 and ban info
        return res.status(403).json({ error: 'Your account has been temporarily banned for violating community rules.', banType: 'temporary', expiresAt });
      } catch (modErr) {
        console.error('Auto-moderation failed', modErr);
        // fall through and block creation
        return res.status(403).json({ error: 'Comment blocked by moderation.' });
      }
    }

    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
    const now = Date.now();

    // rate limit only for top-level comments, not admin replies
    if (!parentComment) {
      const lastComment = await Comment.findOne({
        product: product._id,
        user: req.user._id,
        parentComment: null,
      }).sort({ createdAt: -1 });

      if (lastComment) {
        const diff = now - lastComment.createdAt.getTime();
        if (diff < FORTY_EIGHT_HOURS_MS) {
          const remainingMs = FORTY_EIGHT_HOURS_MS - diff;
          const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
          return res.status(429).json({
            error: `You can comment on this product again in about ${remainingHours} hour(s).`,
            retryHours: remainingHours,
          });
        }
      }
    }

    const isAdmin = !!req.user.isAdmin;
    const isAdminReply = !!(isAdmin && parentComment);

    const comment = await Comment.create({
      product: product._id,
      user: req.user._id,
      userName: req.user.name,
      userPicture: req.user.picture || "",
      text: text.trim(),
      isAdmin,
      parentComment: parentComment ? parentComment._id : null,
      isAdminReply,
    });

    await logEvent("COMMENT_CREATE", {
      user: req.user.email,
      productId: product._id.toString(),
      text: comment.text,
      isAdmin,
      parentCommentId: parentComment ? parentComment._id.toString() : null,
    });

    res.json({
      id: comment._id,
      userName: comment.userName,
      userPicture: comment.userPicture,
      text: comment.text,
      createdAt: comment.createdAt,
      isAdmin: comment.isAdmin,
      isAdminReply: comment.isAdminReply,
      parentCommentId: comment.parentComment,
      parentCommentUserName: parentComment ? parentComment.userName : null,
      canDelete: true,
      canReply: isAdmin,
      avatarUrl: `/avatar/user/${comment.user}`,
    });
  } catch (err) {
    console.error("Error creating comment", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

app.delete(
  "/api/products/:productId/comments/:commentId",
  requireUser,
  async (req, res) => {
    try {
      const { productId, commentId } = req.params;

      const comment = await Comment.findOne({
        _id: commentId,
        product: productId,
      });

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const isOwner = String(comment.user) === String(req.user._id);
      const isAdmin = !!req.user.isAdmin;

      if (!isOwner && !isAdmin) {
        return res
          .status(403)
          .json({ error: "Not allowed to delete this comment" });
      }

      await comment.deleteOne();

      await logEvent("COMMENT_DELETE", {
        user: req.user.email,
        productId,
        commentId,
        isAdmin,
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("Error deleting comment", err);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  }
);

app.get("/api/cart", requireUser, async (req, res) => {
  const cart = req.user.cart || [];
  const items = cart.map((c) => ({
    productId: c.product.toString(),
    quantity: c.quantity,
  }));
  res.json(items);
});

app.post("/api/cart", requireUser, async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    req.user.cart = items
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        product: new mongoose.Types.ObjectId(it.productId),
        quantity: Number(it.quantity) || 1,
      }));

    await req.user.save();

    await logEvent("CART_SAVE", {
      user: req.user.email,
      count: req.user.cart.length,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save cart", err);
    res.status(500).json({ error: "Failed to save cart" });
  }
});

app.delete("/api/cart", requireUser, async (req, res) => {
  try {
    req.user.cart = [];
    await req.user.save();
    await logEvent("CART_CLEAR", { user: req.user.email });
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to clear cart", err);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, email, phone, subject, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return res.status(500).json({ error: "Webhook missing" });

  const lines = [
    "**New Contact Message**",
    "**Name:** " + name,
    "**Email:** " + email,
    phone ? "**Phone:** " + phone : null,
    subject ? "**Subject:** " + subject : null,
    "",
    "**Message:**",
    message,
  ].filter(Boolean);

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: lines.join("\n") }),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Contact webhook failed", err);
    res.status(500).json({ error: "Webhook failed" });
  }
});

// Generate checkout session token
app.get("/api/checkout-session", requireUser, (req, res) => {
  const crypto = require("crypto");
  const token = crypto.randomBytes(16).toString("hex");
  req.session.checkoutToken = token;
  res.json({ token });
});

// Rate Limiter for Orders
const orderCooldowns = new Map();

app.post("/api/orders", requireUser, async (req, res) => {
  try {
    const { 
      fullName, phone, dob, address, postalCode, province, checkoutToken, recaptchaResponse 
    } = req.body;

    // Verify token
    if (!checkoutToken || !req.session.checkoutToken || checkoutToken !== req.session.checkoutToken) {
        return res.status(403).json({ error: "Invalid or expired checkout session." });
    }

    // 1. CAPTCHA Validation
    if (!recaptchaResponse) {
        return res.status(400).json({ error: "CAPTCHA verification failed. Please try again." });
    }

    try {
        const axios = require("axios");
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-v3_m9oG774W4_H0O4block"; // Placeholder
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaResponse}`;
        
        const response = await axios.post(verifyUrl);
        if (!response.data.success) {
            console.error("reCAPTCHA Verification Failed:", response.data["error-codes"]);
            return res.status(400).json({ error: "CAPTCHA verification failed. Please try again." });
        }
    } catch (error) {
        console.error("reCAPTCHA Error:", error);
        return res.status(500).json({ error: "Failed to verify CAPTCHA. Please try again later." });
    }
    // 2. Cooldown (1 order per 2 minutes per user)
    const userId = req.user._id.toString();
    const now = Date.now();
    if (orderCooldowns.has(userId)) {
      const lastTime = orderCooldowns.get(userId);
      if (now - lastTime < 120000) { // 2 mins
        return res.status(429).json({ error: "Please wait a few minutes before placing another order." });
      }
    }

    // 3. Get Cart
    const cart = req.user.cart;
    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // 4. Calculate Total & Create Items
    let total = 0;
    const items = [];
    
    // Populate product details
    await req.user.populate("cart.product");
    
    for (const item of req.user.cart) {
      if (!item.product) continue;
      items.push({
        product: item.product._id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      });
      total += item.product.price * item.quantity;
    }

    // 5. Create Order
    const Order = mongoose.model("Order");
    const newOrder = await Order.create({
      user: userId,
      customerName: fullName,
      customerEmail: req.user.email,
      customerPhone: phone,
      customerDOB: dob,
      customerAddress: address,
      customerPostal: postalCode,
      customerProvince: province,
      items,
      totalAmount: total,
      status: "pending"
    });

    // 6. Clear Cart & Token
    req.user.cart = [];
    await req.user.save();
    delete req.session.checkoutToken;
    
    // 7. Set Cooldown
    orderCooldowns.set(userId, now);

    // 8. Log
    await logEvent("ORDER_create", {
      user: req.user.email,
      orderId: newOrder._id,
      amount: total
    });

    res.json({ success: true, orderId: newOrder._id });

  } catch (err) {
    console.error("Order creation failed", err);
    res.status(500).json({ error: "Failed to place order." });
  }
});

app.use("/uploads", express.static(uploadsDir));

// Security: block direct access to .html files (serve pages only via clean routes)
app.use((req, res, next) => {
  try {
    const p = String(req.path || "");
    if (p.toLowerCase().endsWith(".html")) {
      // don't reveal file system details — serve 404 page
      return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
    }
  } catch (e) {
    // on any error, continue so we don't accidentally block legitimate traffic
    console.error("HTML block middleware error:", e && e.message ? e.message : e);
  }
  next();
});

app.get(["/home"], (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }

  return res
    .status(404)
    .sendFile(path.join(__dirname, "public", "404.html"));
});

if (BannedUserModel) {
  setInterval(async () => {
    try {
      const result = await BannedUserModel.deleteMany({
        banType: "temporary",
        expiresAt: { $lte: new Date() }
      });
      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} expired temporary ban(s)`);
      }
    } catch (err) {
      console.error("Failed to cleanup expired bans:", err);
    }
  }, 60 * 60 * 1000); // Run every hour
}


if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

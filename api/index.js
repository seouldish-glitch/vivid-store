// Load environment variables
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const passport = require("passport");
const path = require("path");

const app = express();

console.log("🚀 Starting Vivid Vision API...");
console.log("Environment:", process.env.NODE_ENV || "development");
console.log("Vercel:", process.env.VERCEL ? "Yes" : "No");

// Check for required environment variables
if (!process.env.MONGODB_URI) {
  const errorMsg = "❌ ERROR: MONGODB_URI environment variable is required!";
  console.error(errorMsg);
  console.error("Available env vars:", Object.keys(process.env).filter(k => !k.includes('SECRET')).join(', '));
  
  // In serverless, we can't exit - send error response instead
  if (process.env.VERCEL) {
    app.use((req, res) => {
      res.status(500).json({
        error: "Server Configuration Error",
        message: "Missing required environment variables. Please configure MONGODB_URI in Vercel dashboard.",
        hint: "Go to Project Settings → Environment Variables"
      });
    });
    module.exports = app;
  } else {
    process.exit(1);
  }
}


// MongoDB Connection with better error handling
let mongooseConnected = false;

if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("✅ MongoDB connected");
      mongooseConnected = true;
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      // Don't exit in serverless - let app handle requests with error responses
      if (!process.env.VERCEL) {
        process.exit(1);
      }
    });
} else {
  console.log("⚠️ Skipping MongoDB connection: MONGODB_URI not set");
}

// Import models (register them with Mongoose)
try {
  require("../models/User");
  require("../models/Product");
  require("../models/Category");
  require("../models/Comment");
  require("../models/BannedUser");
  console.log("✅ Models loaded");
} catch (err) {
  console.error("❌ Error loading models:", err.message);
}

// Passport Configuration
try {
  const configurePassport = require("../config/passport");
  configurePassport();
  console.log("✅ Passport configured");
} catch (err) {
  console.error("❌ Error configuring passport:", err.message);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
};

// Add MongoDB session store
if (process.env.MONGODB_URI) {
  try {
    sessionConfig.store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600, // lazy session update
    });
    console.log("✅ MongoStore configured");
  } catch (err) {
    console.warn("⚠️ Failed to initialize MongoStore:", err.message);
  }
} else {
  console.log("⚠️ Using memory store for sessions (No MONGODB_URI)");
}

app.use(session(sessionConfig));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));


// API Routes
try {
  const authRoutes = require("../routes/authRoutes");
  const productRoutes = require("../routes/productRoutes");
  const adminRoutes = require("../routes/adminRoutes");

  app.use("/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/admin", adminRoutes);
  console.log("✅ Routes loaded");
} catch (err) {
  console.error("❌ Error loading routes:", err.message);
  console.error(err.stack);
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Root endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "Vivid Vision API",
    version: "1.0.0",
    endpoints: {
      auth: "/auth",
      products: "/api/products",
      admin: "/api/admin",
      health: "/api/health",
    },
  });
});

// Handle SPA routing - serve index.html for non-API routes
app.get("*", (req, res, next) => {
  // Don't intercept API routes
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
    return next();
  }
  
  // Check if the request is for a static file
  const ext = path.extname(req.path);
  if (ext) {
    // Let express.static handle it, if not found, continue to 404
    return next();
  }
  
  // Serve index.html for client-side routing
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "../public/404.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Export the Express app for Vercel
module.exports = app;

console.log("✅ Vivid Vision API initialized successfully");
console.log("Ready to handle requests");

// Only start the server if not in Vercel environment
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const passport = require("passport");
const path = require("path");

const app = express();

// Check for required environment variables
if (!process.env.MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI environment variable is required!");
  console.error("Please create a .env file with your MongoDB connection string.");
  console.error("See .env.example for reference.");
  process.exit(1);
}

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Import models (register them with Mongoose)
require("../models/User");
require("../models/Product");
require("../models/Category");
require("../models/Comment");
require("../models/BannedUser");

// Passport Configuration
const configurePassport = require("../config/passport");
configurePassport();

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
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600, // lazy session update
  });
}

app.use(session(sessionConfig));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// API Routes
const authRoutes = require("../routes/authRoutes");
const productRoutes = require("../routes/productRoutes");
const adminRoutes = require("../routes/adminRoutes");

app.use("/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);

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

// Only start the server if not in Vercel environment
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

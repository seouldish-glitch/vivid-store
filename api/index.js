// /api/index.js
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const passport = require("passport");

const app = express();

/* -------------------------------------------------
   Basic App Setup
-------------------------------------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------------------------------------
   MongoDB (serverless-safe connection)
-------------------------------------------------- */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI)
      .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

if (process.env.MONGODB_URI) {
  connectDB().then(() => {
    console.log("✅ MongoDB connected");
  }).catch(err => {
    console.error("❌ MongoDB error:", err.message);
  });
}

/* -------------------------------------------------
   Models
-------------------------------------------------- */
require("../models/User");
require("../models/Product");
require("../models/Category");
require("../models/Comment");
require("../models/BannedUser");

/* -------------------------------------------------
   Sessions (API-only usage)
-------------------------------------------------- */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: process.env.MONGODB_URI
      ? MongoStore.create({
          mongoUrl: process.env.MONGODB_URI,
          touchAfter: 24 * 3600,
        })
      : undefined,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    },
  })
);

/* -------------------------------------------------
   Passport
-------------------------------------------------- */
require("../config/passport")();
app.use(passport.initialize());
app.use(passport.session());

/* -------------------------------------------------
   Routes (API ONLY)
-------------------------------------------------- */
app.use("/auth", require("../routes/authRoutes"));
app.use("/api/products", require("../routes/productRoutes"));
app.use("/api/admin", require("../routes/adminRoutes"));

/* -------------------------------------------------
   Health Check
-------------------------------------------------- */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mongo:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

/* -------------------------------------------------
   API Root
-------------------------------------------------- */
app.get("/api", (req, res) => {
  res.json({
    name: "Vivid Vision API",
    version: "1.0.0",
  });
});

/* -------------------------------------------------
   API 404 (JSON only)
-------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({ error: "API route not found" });
});

module.exports = app;

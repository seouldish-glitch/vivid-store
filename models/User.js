const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true },
    email: { type: String, required: true, unique: true },
    name: String,
    avatar: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

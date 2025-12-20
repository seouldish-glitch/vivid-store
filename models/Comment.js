const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, required: true },
    userPicture: String,
    text: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isAdminReply: { type: Boolean, default: false },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
    parentCommentUserName: String
  },
  { timestamps: true }
);

// Index for faster queries
commentSchema.index({ product: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

module.exports = mongoose.model("Comment", commentSchema);

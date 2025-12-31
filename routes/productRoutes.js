const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// GET /api/products - list
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort("price");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// --- COMMENTS ROUTES ---

const Comment = require("../models/Comment");
const BannedUser = require("../models/BannedUser");
const { requireAuth, requireAdmin } = require("./_middleware");

// GET comments
router.get("/:id/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ product: req.params.id })
      .sort({ createdAt: 1 }) // Oldest first for proper threading
      .lean();

    // Separate parent comments and replies
    const parentComments = comments.filter(c => !c.parentComment);
    const replies = comments.filter(c => c.parentComment);

    // Sort parent comments newest first
    parentComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Build threaded structure: parent followed by its replies
    const threaded = [];
    parentComments.forEach(parent => {
      // Add parent
      threaded.push(parent);
      // Add its replies (oldest first under parent)
      const parentReplies = replies.filter(r => String(r.parentComment) === String(parent._id));
      parentReplies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      threaded.push(...parentReplies);
    });

    // Enrich comments with permissions
    const enriched = threaded.map(c => {
      const isOwner = req.user && String(c.user) === String(req.user._id);
      const isAdmin = req.user?.isAdmin;
      return {
        id: c._id,
        text: c.text,
        userName: c.userName,
        userPicture: c.userPicture || "", 
        avatarUrl: c.userPicture || "", 
        createdAt: c.createdAt,
        isAdmin: c.isAdmin,
        isAdminReply: c.isAdminReply,
        parentCommentId: c.parentComment,
        parentCommentUserName: c.parentCommentUserName,
        canDelete: isAdmin || isOwner,
        canReply: isAdmin 
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: "Failed to load comments" });
  }
});

// POST comment
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { text, parentCommentId } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });

    // Check if banned
    const banned = await BannedUser.findOne({ 
      originalUserId: String(req.user._id),
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    if (banned) {
      return res.status(403).json({ 
        error: `You are banned: ${banned.reason}`,
        banType: banned.banType
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId);
    }

    const comment = await Comment.create({
      product: product._id,
      user: req.user._id,
      userName: req.user.name,
      userPicture: req.user.avatar || req.user.picture, 
      text,
      isAdmin: req.user.isAdmin,
      isAdminReply: !!parentCommentId && req.user.isAdmin,
      parentComment: parentComment ? parentComment._id : null,
      parentCommentUserName: parentComment ? parentComment.userName : null
    });

    res.json(comment);
  } catch (err) {
    console.error("Post comment error:", err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

// DELETE comment
router.delete("/:id/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const isOwner = String(comment.user) === String(req.user._id);
    const isAdmin = req.user.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await comment.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// GET /api/products/:id - detail (Keep specific above generic)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: "Invalid product id" });
  }
});

module.exports = router;

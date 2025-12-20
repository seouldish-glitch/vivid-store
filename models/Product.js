const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subtitle: String,
    price: { type: Number, required: true },
    tag: String,
    features: [String],
    imageUrl: String, // Legacy field for backward compatibility
    images: [String], // Multiple images support
    imageUrls: [String], // Alias for images (used by admin routes)
    category: String,
    inStock: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);

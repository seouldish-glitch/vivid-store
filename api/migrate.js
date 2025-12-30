// Serverless migration endpoint for Vercel
// Access via: https://your-domain.vercel.app/api/migrate?secret=YOUR_SECRET_KEY

require("dotenv").config();
const mongoose = require("mongoose");

// Security: Require a secret key to run migrations
const MIGRATION_SECRET = process.env.MIGRATION_SECRET || "change-this-secret";

module.exports = async (req, res) => {
    // Security check
    const { secret } = req.query;
    if (secret !== MIGRATION_SECRET) {
        return res.status(403).json({
            error: "Forbidden",
            message: "Invalid migration secret. Set MIGRATION_SECRET in environment variables."
        });
    }

    // Only allow POST requests for safety
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed",
            message: "Use POST request to run migrations"
        });
    }

    try {
        // Check if MongoDB URI is configured
        if (!process.env.MONGODB_URI) {
            return res.status(500).json({
                error: "Configuration error",
                message: "MONGODB_URI not configured"
            });
        }

        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log("✅ Connected to MongoDB for migration");
        }

        const Product = mongoose.model("Product", new mongoose.Schema({}, { strict: false }));

        // Find all products with imageUrl (old format)
        const productsWithOldFormat = await Product.find({ imageUrl: { $exists: true } });

        console.log(`Found ${productsWithOldFormat.length} products with old imageUrl format`);

        const migrated = [];
        const skipped = [];

        for (const product of productsWithOldFormat) {
            if (product.imageUrl && !product.imageUrls) {
                // Convert single imageUrl to imageUrls array
                await Product.updateOne(
                    { _id: product._id },
                    {
                        $set: { imageUrls: [product.imageUrl] },
                        $unset: { imageUrl: "" }
                    }
                );
                migrated.push({
                    id: product._id,
                    name: product.name,
                    oldUrl: product.imageUrl
                });
                console.log(`✅ Migrated: ${product.name}`);
            } else {
                skipped.push({
                    id: product._id,
                    name: product.name,
                    reason: product.imageUrls ? "Already has imageUrls" : "No imageUrl to migrate"
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Migration completed successfully",
            stats: {
                total: productsWithOldFormat.length,
                migrated: migrated.length,
                skipped: skipped.length
            },
            migrated,
            skipped
        });

    } catch (err) {
        console.error("❌ Migration failed:", err);
        return res.status(500).json({
            error: "Migration failed",
            message: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
};

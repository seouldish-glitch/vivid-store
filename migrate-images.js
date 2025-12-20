// migrate-images.js
// Run this once to migrate old imageUrl to imageUrls array

require("dotenv").config();
const mongoose = require("mongoose");

async function migrateImages() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        const Product = mongoose.model("Product", new mongoose.Schema({}, { strict: false }));

        // Find all products with imageUrl (old format)
        const productsWithOldFormat = await Product.find({ imageUrl: { $exists: true } });

        console.log(`Found ${productsWithOldFormat.length} products with old imageUrl format`);

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
                console.log(`✅ Migrated: ${product.name}`);
            }
        }

        console.log("✅ Migration complete!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrateImages();

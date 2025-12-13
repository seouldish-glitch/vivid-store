
try {
    const cloudinary = require("cloudinary").v2;
    const { CloudinaryStorage } = require("multer-storage-cloudinary");

    console.log("Cloudinary version:", require("cloudinary/package.json").version);

    cloudinary.config({
        cloud_name: 'test',
        api_key: 'test',
        api_secret: 'test'
    });

    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'test',
        }
    });

    console.log("Storage initialized successfully");
} catch (error) {
    console.error("Error initializing storage:", error);
    process.exit(1);
}

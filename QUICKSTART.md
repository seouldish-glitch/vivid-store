# 🚀 Quick Start Guide

## Current Status

✅ All configuration files created
✅ Google OAuth configured  
✅ Cloudinary configured
✅ Admin emails configured
❌ **MongoDB connection needed**

## What You Need To Do

### Option 1: I Already Have MongoDB (2 minutes)

1. Open `.env` file
2. Add your MongoDB connection string to line 2:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vivid-store
   ```
3. Save the file
4. Run: `npm run dev`
5. Visit: http://localhost:3000

### Option 2: I Need MongoDB (10 minutes)

1. Follow the guide: [MONGODB_SETUP.md](./MONGODB_SETUP.md)
2. Create free MongoDB Atlas account
3. Get connection string
4. Add to `.env` file
5. Run: `npm run dev`
6. Visit: http://localhost:3000

## Test Your Setup

### 1. Check Environment Variables

```bash
node check-env.js
```

Should show all ✅ green checkmarks

### 2. Start Development Server

```bash
npm run dev
```

Should show:

```
✅ MongoDB connected
🚀 Server running on http://localhost:3000
```

### 3. Test the Application

Open browser and visit:

- **Homepage**: http://localhost:3000
- **Products**: http://localhost:3000/products.html
- **Login**: http://localhost:3000/login.html
- **Admin Panel**: http://localhost:3000/admin.html (after login with admin email)
- **API Health**: http://localhost:3000/api/health

### 4. Test Features

1. **Login with Google** - Click login button
2. **View Products** - Should see product list (empty initially)
3. **Admin Panel** - Login with your admin email and access admin panel
4. **Create Product** - Upload images and create a test product
5. **View Product** - Check if product displays correctly

## Troubleshooting

### "MONGODB_URI environment variable is required!"

→ Add MongoDB connection string to `.env` file (line 2)

### "MongoDB connection error"

→ Check connection string is correct
→ Verify IP `0.0.0.0/0` is whitelisted in MongoDB Atlas
→ Check username/password are correct

### "Google login not working"

→ Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
→ Verify callback URL matches in Google Console

### "Can't access admin panel"

→ Make sure your Google email is in ADMIN_EMAILS
→ Logout and login again

### "Images won't upload"

→ Check Cloudinary credentials
→ Test with small image first

## What's Next?

### Local Development ✅

Once `npm run dev` works:

1. Create test products
2. Test all features
3. Make any customizations you need

### Deploy to Vercel 🚀

When you're ready to deploy:

1. Read: [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)
2. Push to GitHub (optional but recommended)
3. Deploy to Vercel
4. Add environment variables in Vercel dashboard
5. Update Google OAuth callback URL for production

## Need Help?

### Quick Commands

```bash
# Check environment variables
node check-env.js

# Start development server
npm run dev

# Install dependencies (if needed)
npm install
```

### Documentation

- [README.md](./README.md) - Full project documentation
- [MONGODB_SETUP.md](./MONGODB_SETUP.md) - MongoDB setup guide
- [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) - Deployment guide
- [FIXES_SUMMARY.md](./FIXES_SUMMARY.md) - What was fixed

## 🎯 Current Next Step

**→ Add MongoDB connection string to `.env` file**

Then run:

```bash
node check-env.js
npm run dev
```

That's it! 🎉

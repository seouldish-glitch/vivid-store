# 🚀 Vercel Deployment - Quick Start Guide

## ✅ Project Status
Your project is now configured and ready for Vercel deployment!

## 📋 What Was Fixed
1. ✅ Created `/api/index.js` - Main serverless function entry point
2. ✅ Fixed passport.js - Admin emails now read from environment variable
3. ✅ Updated package.json - Proper entry point and scripts
4. ✅ Created vercel.json - Routing configuration
5. ✅ Created .vercelignore - Deployment optimization

## 🔧 Environment Variables Required

Before deploying, you MUST set these environment variables in Vercel:

### Required:
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `SESSION_SECRET` - Random secret for sessions (generate one!)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_CALLBACK_URL` - Your callback URL (https://your-domain.vercel.app/auth/google/callback)
- `ADMIN_EMAILS` - Comma-separated admin emails (e.g., "admin1@gmail.com,admin2@gmail.com")

### Optional:
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (for image uploads)
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `DISCORD_WEBHOOK_URL` - Discord webhook for logging

## 🚀 Deploy to Vercel

### Option 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   Follow the prompts and link to a new or existing project.

4. **Add Environment Variables**:
   ```bash
   vercel env add MONGODB_URI
   vercel env add SESSION_SECRET
   vercel env add GOOGLE_CLIENT_ID
   vercel env add GOOGLE_CLIENT_SECRET
   vercel env add GOOGLE_CALLBACK_URL
   vercel env add ADMIN_EMAILS
   vercel env add CLOUDINARY_CLOUD_NAME
   vercel env add CLOUDINARY_API_KEY
   vercel env add CLOUDINARY_API_SECRET
   ```

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Using Vercel Dashboard (GitHub Integration)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Ready for Vercel deployment"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Import in Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework Preset: **Other**
   - Click Deploy

3. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables listed above

4. **Redeploy** (if needed after adding env vars)

## ⚙️ Post-Deployment Setup

### 1. Update Google OAuth Callback URL
After deployment, update your Google Cloud Console:
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Navigate to APIs & Services → Credentials
- Edit your OAuth 2.0 Client ID
- Add to Authorized redirect URIs:
  ```
  https://your-project-name.vercel.app/auth/google/callback
  ```

### 2. Update GOOGLE_CALLBACK_URL in Vercel
- Go to Project Settings → Environment Variables
- Update `GOOGLE_CALLBACK_URL` to:
  ```
  https://your-project-name.vercel.app/auth/google/callback
  ```
- Redeploy for changes to take effect

## 🧪 Testing Your Deployment

1. Visit your Vercel URL: `https://your-project-name.vercel.app`
2. Test the health endpoint: `https://your-project-name.vercel.app/api/health`
3. Test login functionality
4. Test admin panel access (if you're an admin)
5. Test product display and creation

## 🛠️ Local Development

To run locally:

```bash
# Install dependencies
npm install

# Copy .env.example to .env and fill in your values
cp .env.example .env

# Run development server
npm run dev
```

Visit: http://localhost:3000

## 🐛 Troubleshooting

### MongoDB Connection Failed
- ✅ Check MONGODB_URI is correct
- ✅ Verify MongoDB Atlas allows connections from `0.0.0.0/0` (all IPs)
- ✅ Ensure database user has proper permissions

### Session/Login Issues
- ✅ Verify SESSION_SECRET is set
- ✅ Check cookie settings for production
- ✅ Ensure GOOGLE_CALLBACK_URL matches exactly

### Admin Panel Not Working
- ✅ Verify your email is in ADMIN_EMAILS environment variable
- ✅ Check format: "email1@domain.com,email2@domain.com" (no spaces)
- ✅ Try logging out and back in after updating admin emails

### Image Upload Issues
- ✅ Ensure Cloudinary credentials are correct
- ✅ Check Cloudinary dashboard for upload logs
- ✅ Verify file size limits

## 📚 Useful Vercel Commands

```bash
# View deployment logs
vercel logs

# List all deployments
vercel ls

# View environment variables
vercel env ls

# Pull environment variables to local
vercel env pull

# Remove a deployment
vercel remove [deployment-url]
```

## 🎉 Success Checklist

After deployment, verify:
- ✅ Homepage loads correctly
- ✅ Google login works
- ✅ Products display properly
- ✅ Admin panel accessible (for admin users)
- ✅ Image uploads work (Cloudinary)
- ✅ Sessions persist across page reloads

## 📞 Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

---

**Your project is now ready to deploy to Vercel! 🎊**

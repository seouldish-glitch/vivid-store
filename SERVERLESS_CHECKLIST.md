# ✅ Serverless Migration Checklist

## What Was Done

Your Vivid Store application is now **fully serverless** and ready for Vercel deployment!

### Files Created/Modified:

- ✅ **`/api/migrate.js`** - NEW serverless migration endpoint
- ✅ **`/vercel.json`** - Updated with migration route
- ✅ **`.env.example`** - Added MIGRATION_SECRET
- ✅ **`README.md`** - Updated with serverless information
- ✅ **`SERVERLESS_GUIDE.md`** - NEW comprehensive deployment guide

### Already Serverless:

- ✅ **`/api/index.js`** - Main application (already serverless)
- ✅ All routes and middleware
- ✅ Authentication (Google OAuth)
- ✅ Session management (MongoDB store)
- ✅ Image uploads (Cloudinary)
- ✅ Static file serving

## Pre-Deployment Checklist

### 1. Environment Variables

Make sure you have these ready for Vercel:

- [ ] `MONGODB_URI` - MongoDB Atlas connection string
- [ ] `SESSION_SECRET` - Random secret for sessions
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `GOOGLE_CALLBACK_URL` - Will be `https://your-domain.vercel.app/auth/google/callback`
- [ ] `ADMIN_EMAILS` - Your admin email(s)
- [ ] `MIGRATION_SECRET` - Random secret for migrations
- [ ] `CLOUDINARY_CLOUD_NAME` - (Optional) For image uploads
- [ ] `CLOUDINARY_API_KEY` - (Optional) For image uploads
- [ ] `CLOUDINARY_API_SECRET` - (Optional) For image uploads

### 2. MongoDB Setup

- [ ] MongoDB Atlas account created
- [ ] Database cluster created
- [ ] Database user created with read/write permissions
- [ ] Network access configured (allow 0.0.0.0/0 for Vercel)
- [ ] Connection string copied

### 3. Google OAuth Setup

- [ ] Google Cloud Console project created
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Authorized redirect URIs added:
  - [ ] `http://localhost:3000/auth/google/callback` (for local)
  - [ ] `https://your-domain.vercel.app/auth/google/callback` (for production)

### 4. Cloudinary Setup (Optional)

- [ ] Cloudinary account created
- [ ] Cloud name, API key, and API secret copied

## Deployment Steps

### Option 1: Vercel CLI

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to preview
vercel

# 4. Add environment variables (do this in Vercel dashboard)

# 5. Deploy to production
vercel --prod
```

### Option 2: GitHub + Vercel Dashboard

```bash
# 1. Initialize git (if not already)
git init
git add .
git commit -m "Serverless migration complete"

# 2. Push to GitHub
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main

# 3. Go to vercel.com/new and import your repository

# 4. Add environment variables in Vercel dashboard

# 5. Deploy!
```

## Post-Deployment Checklist

### 1. Verify Deployment

- [ ] Homepage loads: `https://your-domain.vercel.app`
- [ ] Health check works: `https://your-domain.vercel.app/api/health`
- [ ] API responds: `https://your-domain.vercel.app/api`

### 2. Test Authentication

- [ ] Google login button appears
- [ ] Can click "Login with Google"
- [ ] Redirects to Google OAuth
- [ ] Successfully redirects back to site
- [ ] User is logged in (check `/auth/me`)

### 3. Test Admin Access

- [ ] Admin panel loads: `https://your-domain.vercel.app/admin.html`
- [ ] Can access admin features
- [ ] Can view users
- [ ] Can view products

### 4. Test Products

- [ ] Products page loads
- [ ] Can view product details
- [ ] Images display correctly
- [ ] Can add comments (if logged in)

### 5. Run Migrations (If Needed)

```bash
# Using curl
curl -X POST "https://your-domain.vercel.app/api/migrate?secret=YOUR_MIGRATION_SECRET"

# Using PowerShell
Invoke-WebRequest -Uri "https://your-domain.vercel.app/api/migrate?secret=YOUR_MIGRATION_SECRET" -Method POST
```

Expected response:

```json
{
  "success": true,
  "message": "Migration completed successfully",
  "stats": {
    "total": 10,
    "migrated": 8,
    "skipped": 2
  }
}
```

## Common Issues & Solutions

### Issue: "MONGODB_URI is required"

**Solution:** Add MONGODB_URI in Vercel dashboard → Project Settings → Environment Variables

### Issue: "Session not persisting"

**Solution:**

- Check SESSION_SECRET is set
- Verify cookie settings in production
- Ensure MongoDB connection is working

### Issue: "Google OAuth fails"

**Solution:**

- Verify GOOGLE_CALLBACK_URL matches exactly
- Check Google Cloud Console authorized redirect URIs
- Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct

### Issue: "Can't access admin panel"

**Solution:**

- Add your email to ADMIN_EMAILS
- Format: `email1@gmail.com,email2@gmail.com` (no spaces)
- Logout and login again

### Issue: "Migration endpoint returns 403"

**Solution:**

- Check MIGRATION_SECRET matches in URL and environment variables
- Use POST request, not GET
- Verify secret is URL-encoded if it contains special characters

## Testing Locally

Before deploying, test everything locally:

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Fill in .env with your values

# 4. Run development server
npm run dev

# 5. Visit http://localhost:3000

# 6. Test migration locally
curl -X POST "http://localhost:3000/api/migrate?secret=your-secret"
```

## Monitoring

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Recent logs
vercel logs
```

### Check Function Status

Visit: `https://vercel.com/dashboard` → Your Project → Functions

### Monitor Database

Visit: MongoDB Atlas Dashboard → Metrics

## Security Reminders

- ✅ Never commit `.env` file to git
- ✅ Use strong, random secrets for SESSION_SECRET and MIGRATION_SECRET
- ✅ Keep MIGRATION_SECRET secure - it allows database modifications
- ✅ Regularly rotate secrets
- ✅ Monitor Vercel logs for suspicious activity
- ✅ Keep dependencies updated

## Success! 🎉

Once all checklist items are complete, your application is:

- ✅ Fully serverless
- ✅ Deployed to Vercel
- ✅ Connected to MongoDB Atlas
- ✅ Using Google OAuth
- ✅ Storing images in Cloudinary
- ✅ Ready for production use!

## Need Help?

- 📖 [SERVERLESS_GUIDE.md](./SERVERLESS_GUIDE.md) - Detailed guide
- 📖 [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) - Deployment instructions
- 📖 [README.md](./README.md) - Project documentation
- 🌐 [Vercel Documentation](https://vercel.com/docs)
- 🌐 [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)

---

**Your application is serverless and ready to scale! 🚀**

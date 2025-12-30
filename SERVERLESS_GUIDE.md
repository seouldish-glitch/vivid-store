# 🚀 Serverless Migration Guide for Vercel

## ✅ What's Changed

Your application is now **fully serverless** and ready for Vercel deployment!

### Key Changes:

1. **✅ Main Application** (`/api/index.js`)

   - Already configured as a serverless function
   - Handles all routes, authentication, and API endpoints
   - Exports Express app for Vercel

2. **✅ Image Migration** (`/api/migrate.js`)

   - Converted from standalone script to serverless API endpoint
   - Can be triggered via HTTP POST request
   - Secured with a secret key

3. **✅ Vercel Configuration** (`vercel.json`)
   - Routes configured for serverless functions
   - CORS headers set up
   - Static file serving enabled

## 🔧 Environment Variables

Add these to your Vercel project settings:

### Required:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
SESSION_SECRET=your-random-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.vercel.app/auth/google/callback
ADMIN_EMAILS=admin1@gmail.com,admin2@gmail.com
```

### For Image Migration:

```
MIGRATION_SECRET=your-migration-secret-key
```

### Optional (for Cloudinary):

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📦 Deployment Steps

### Option 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables
5. Deploy!

## 🔄 Running Migrations on Vercel

Since Vercel is serverless, you can't run scripts directly. Instead, trigger migrations via HTTP:

### Step 1: Set Migration Secret

In Vercel dashboard, add environment variable:

```
MIGRATION_SECRET=your-secure-secret-key-here
```

### Step 2: Trigger Migration

Use curl, Postman, or your browser:

```bash
# Using curl
curl -X POST "https://your-domain.vercel.app/api/migrate?secret=your-secure-secret-key-here"

# Using PowerShell
Invoke-WebRequest -Uri "https://your-domain.vercel.app/api/migrate?secret=your-secure-secret-key-here" -Method POST
```

### Expected Response:

```json
{
  "success": true,
  "message": "Migration completed successfully",
  "stats": {
    "total": 10,
    "migrated": 8,
    "skipped": 2
  },
  "migrated": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Product 1",
      "oldUrl": "https://old-url.com/image.jpg"
    }
  ],
  "skipped": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Product 2",
      "reason": "Already has imageUrls"
    }
  ]
}
```

## 🛡️ Security Notes

1. **Migration Endpoint**: Protected by `MIGRATION_SECRET` - keep this secure!
2. **POST Only**: Migration endpoint only accepts POST requests
3. **One-time Use**: Run migrations only when needed, not on every deployment

## 🧪 Testing Locally

```bash
# Install dependencies
npm install

# Create .env file with your variables
cp .env.example .env

# Run development server
npm run dev

# Test migration locally
curl -X POST "http://localhost:3000/api/migrate?secret=your-secret"
```

## 📊 Monitoring

### Check Deployment Status:

```bash
vercel ls
```

### View Logs:

```bash
vercel logs
```

### Health Check:

Visit: `https://your-domain.vercel.app/api/health`

## 🐛 Troubleshooting

### Migration Fails

- ✅ Check `MONGODB_URI` is correct
- ✅ Verify `MIGRATION_SECRET` matches
- ✅ Ensure MongoDB allows connections from all IPs (0.0.0.0/0)
- ✅ Check Vercel function logs for errors

### Serverless Function Timeout

- ✅ Vercel free tier: 10s timeout
- ✅ Pro tier: 60s timeout
- ✅ For large migrations, consider batching or upgrading

### Environment Variables Not Working

- ✅ Redeploy after adding/changing env vars
- ✅ Check variable names match exactly (case-sensitive)
- ✅ Use `vercel env pull` to verify locally

## 🎯 Best Practices

1. **Run migrations during low traffic** - Avoid peak hours
2. **Backup your database** - Before running any migration
3. **Test locally first** - Use local MongoDB for testing
4. **Monitor logs** - Check Vercel logs after migration
5. **Secure your secrets** - Never commit secrets to git

## 📝 Local Development vs Production

| Feature        | Local                    | Vercel                         |
| -------------- | ------------------------ | ------------------------------ |
| Run migrations | `node migrate-images.js` | `POST /api/migrate?secret=xxx` |
| Server start   | `npm run dev`            | Automatic                      |
| Environment    | `.env` file              | Vercel dashboard               |
| Logs           | Terminal                 | `vercel logs`                  |
| Database       | Local/Atlas              | MongoDB Atlas                  |

## ✨ What's Serverless-Ready

✅ **Main Application** - Fully serverless
✅ **Authentication** - Google OAuth works
✅ **Sessions** - Stored in MongoDB
✅ **Static Files** - Served by Vercel
✅ **API Routes** - All converted to serverless
✅ **Image Uploads** - Using Cloudinary (cloud storage)
✅ **Migrations** - HTTP-triggered serverless function

## 🚫 What to Avoid

❌ **File System Writes** - Vercel filesystem is read-only
❌ **Long-running Processes** - Use background jobs instead
❌ **app.listen()** - Already handled in `/api/index.js`
❌ **Local File Storage** - Use Cloudinary or S3

## 🎉 You're Ready!

Your application is now fully serverless and Vercel-compatible. Deploy with confidence! 🚀

---

**Need help?** Check the [Vercel Documentation](https://vercel.com/docs) or [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)

# Vercel Deployment Guide for Vivid Vision

## Prerequisites
1. Install Vercel CLI: `npm install -g vercel`
2. Create a Vercel account at https://vercel.com

## Environment Variables Setup
Before deploying, you need to set up these environment variables in Vercel:

### Required Variables:
- `MONGODB_URI` - Your MongoDB connection string
- `SESSION_SECRET` - A random secret string for sessions
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
- `GOOGLE_CALLBACK_URL` - Your callback URL (will be `https://your-domain.vercel.app/auth/google/callback`)
- `DISCORD_WEBHOOK_URL` - Your Discord webhook URL (optional)

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Navigate to your project directory**
   ```bash
   cd "c:\Users\Dell\Downloads\vivid-vision\VIVID VISION CODE"
   ```

3. **Deploy to Vercel**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Link to existing project or create new one
   - Set project name (e.g., `vivid-vision`)

4. **Add Environment Variables**
   ```bash
   vercel env add MONGODB_URI
   vercel env add SESSION_SECRET
   vercel env add GOOGLE_CLIENT_ID
   vercel env add GOOGLE_CLIENT_SECRET
   vercel env add GOOGLE_CALLBACK_URL
   vercel env add DISCORD_WEBHOOK_URL
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository (push to GitHub first)
3. Configure project:
   - Framework Preset: **Other**
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
4. Add environment variables in Settings → Environment Variables
5. Deploy!

## Post-Deployment Configuration

### 1. Update Google OAuth Callback URL
- Go to Google Cloud Console
- Update authorized redirect URIs to include:
  ```
  https://your-project-name.vercel.app/auth/google/callback
  ```

### 2. Update GOOGLE_CALLBACK_URL in Vercel
- Set it to: `https://your-project-name.vercel.app/auth/google/callback`

### 3. File Uploads Consideration
⚠️ **Important**: Vercel has a read-only filesystem. For file uploads (product images), you have two options:

**Option A: Use Vercel Blob Storage (Recommended)**
- Install: `npm install @vercel/blob`
- Update multer configuration to use Vercel Blob
- Requires code changes in `routes/adminRoutes.js`

**Option B: Use External Storage (Cloudinary, AWS S3, etc.)**
- Sign up for Cloudinary (free tier available)
- Update multer to use cloudinary storage
- Add cloudinary credentials to environment variables

## MongoDB Atlas Setup (if not already done)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (free tier available)
3. Create database user
4. Whitelist all IPs (0.0.0.0/0) for Vercel
5. Get connection string and add to `MONGODB_URI`

## Testing Your Deployment

1. Visit your Vercel URL: `https://your-project-name.vercel.app`
2. Test login functionality
3. Test admin panel access
4. Check product display

## Troubleshooting

### Build Errors
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Database Connection Issues
- Verify MongoDB URI is correct
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

### Session Issues
- Verify `SESSION_SECRET` is set
- Check cookie settings in production

### Image Upload Issues
- Implement Vercel Blob or external storage
- Update file upload routes accordingly

## Useful Commands

```bash
# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel remove [deployment-url]

# View environment variables
vercel env ls
```

## Need Help?
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Discord: Check deployment logs for errors

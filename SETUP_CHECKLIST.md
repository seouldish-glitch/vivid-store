# Quick Setup Checklist

## ✅ Before Deploying - Get These Ready:

### 1. Cloudinary (Image Storage) - FREE
**Sign up**: https://cloudinary.com/users/register/free

After signup, copy from dashboard:
```
CLOUDINARY_CLOUD_NAME=_____________
CLOUDINARY_API_KEY=_____________
CLOUDINARY_API_SECRET=_____________
```

### 2. MongoDB Atlas (Database) - FREE
**Sign up**: https://www.mongodb.com/cloud/atlas/register

After setup, copy connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### 3. Google OAuth (Login) - FREE
**Console**: https://console.cloud.google.com/

After creating credentials:
```
GOOGLE_CLIENT_ID=_____________
GOOGLE_CLIENT_SECRET=_____________
```

### 4. Generate Session Secret
Run this in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output:
```
SESSION_SECRET=_____________
```

### 5. Discord Webhook (Optional)
**Create webhook**: Server Settings → Integrations → Webhooks
```
DISCORD_WEBHOOK_URL=_____________
```

---

## 🚀 Ready to Deploy?

1. ✅ Got all credentials above?
2. ✅ Code pushed to GitHub?
3. ✅ Vercel account created?

**Then go to**: https://vercel.com/new

Import your GitHub repo and paste the environment variables!

---

## 📝 Local Testing First?

Add all credentials to your `.env` file:

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your credentials
# Then run:
npm install
npm run dev
```

Visit: http://localhost:3000

---

## 🎯 Deployment Steps Summary:

1. **Get Cloudinary credentials** (5 min)
2. **Get MongoDB Atlas connection** (5 min)
3. **Get Google OAuth credentials** (5 min)
4. **Push to GitHub** (2 min)
5. **Deploy on Vercel** (3 min)
6. **Add environment variables** (2 min)
7. **Update Google callback URL** (1 min)

**Total time**: ~25 minutes ⏱️

---

Good luck! 🍀

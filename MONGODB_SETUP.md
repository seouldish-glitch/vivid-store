# 🗄️ Quick MongoDB Atlas Setup Guide

## Why You Need MongoDB

Your application needs a database to store:

- User accounts
- Products
- Categories
- Comments
- Admin data

## Create Free MongoDB Atlas Account (5 minutes)

### Step 1: Sign Up

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google (fastest) or email
3. Choose the **FREE** tier (M0 Sandbox)

### Step 2: Create Cluster

1. Choose **AWS** as provider
2. Select closest region to you (e.g., `ap-south-1` for India)
3. Cluster Name: `vivid-store` (or any name)
4. Click **"Create Deployment"**

### Step 3: Create Database User

1. Choose **"Username and Password"**
2. Username: `vividadmin` (or any name)
3. Password: Click **"Autogenerate Secure Password"** and **SAVE IT**
4. Click **"Create Database User"**

### Step 4: Configure Network Access

1. Click **"Add My Current IP Address"**
2. For Vercel deployment, also add:
   - Click **"Add IP Address"**
   - IP Address: `0.0.0.0/0` (allows all IPs - needed for Vercel)
   - Description: `Vercel Access`
   - Click **"Add Entry"**

### Step 5: Get Connection String

1. Click **"Connect"** button on your cluster
2. Choose **"Connect your application"**
3. Driver: **Node.js**
4. Version: **5.5 or later**
5. **Copy the connection string** - it looks like:
   ```
   mongodb+srv://vividadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Update Connection String

1. Replace `<password>` with your actual password
2. Add database name after `.mongodb.net/`: add `vivid-store`
3. Final format:
   ```
   mongodb+srv://vividadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/vivid-store?retryWrites=true&w=majority
   ```

### Step 7: Add to .env File

Open your `.env` file and update line 2:

```
MONGODB_URI=mongodb+srv://vividadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/vivid-store?retryWrites=true&w=majority
```

## ✅ Test Connection

Run this command to verify:

```bash
node check-env.js
```

All variables should show ✅ green checkmarks!

## 🚀 Start Your Server

```bash
npm run dev
```

Visit: http://localhost:3000

## 🎉 Success!

Your application should now be running with:

- ✅ MongoDB database connected
- ✅ Google OAuth ready
- ✅ Cloudinary images ready
- ✅ Admin panel ready

## 🔒 Security Notes

- ✅ Never commit `.env` file to git (it's in `.gitignore`)
- ✅ Use different passwords for dev and production
- ✅ Keep your credentials secure

## 📝 Database Collections Created

When you first run the app, MongoDB will automatically create these collections:

- `users` - User accounts
- `products` - Product catalog
- `categories` - Product categories
- `comments` - Product reviews
- `bannedusers` - Banned user records
- `sessions` - User sessions

## Need Help?

- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Can't connect? Check IP whitelist includes `0.0.0.0/0`
- Wrong credentials? Reset password in Database Access section

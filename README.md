# 🎨 Vivid Store - E-commerce Platform

A modern, feature-rich e-commerce platform built with Express.js, MongoDB, and Google OAuth authentication. **Fully serverless** and optimized for Vercel deployment.

> 🚀 **NEW**: Now fully serverless! See [SERVERLESS_GUIDE.md](./SERVERLESS_GUIDE.md) for deployment details.

## ✨ Features

- **🔐 Google OAuth Authentication** - Secure login with Google accounts
- **🛍️ Product Management** - Full CRUD operations for products with multiple images
- **📸 Cloudinary Integration** - Cloud-based image storage and optimization
- **👥 User Management** - Admin panel for managing users and bans
- **💬 Comments System** - Product reviews with admin replies
- **📊 Admin Dashboard** - Statistics, analytics, and management tools
- **🎯 Categories** - Organize products by category
- **⭐ Featured Products** - Highlight special products
- **📱 Responsive Design** - Works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- MongoDB Atlas account (or local MongoDB)
- Google Cloud Console account (for OAuth)
- Cloudinary account (for image uploads)

### Installation

1. **Clone the repository**

   ```bash
   cd c:\Users\Dell\Downloads\vivid-store-main\vivid-store-main
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

   Fill in your environment variables in `.env`:

   ```env
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_random_secret_string
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ADMIN_EMAILS=your-email@gmail.com
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Run development server**

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000

## 📁 Project Structure

```
vivid-store-main/
├── api/
│   ├── index.js           # Main serverless function entry point
│   └── migrate.js         # Serverless migration endpoint
├── config/
│   └── passport.js        # Passport OAuth configuration
├── models/
│   ├── User.js           # User model
│   ├── Product.js        # Product model
│   ├── Category.js       # Category model
│   ├── Comment.js        # Comment model
│   └── BannedUser.js     # Banned user model
├── routes/
│   ├── authRoutes.js     # Authentication routes
│   ├── productRoutes.js  # Product API routes
│   ├── adminRoutes.js    # Admin panel routes
│   └── _middleware.js    # Auth middleware
├── public/
│   ├── index.html        # Homepage
│   ├── products.html     # Products page
│   ├── product.html      # Single product page
│   ├── admin.html        # Admin panel
│   └── ...               # Other static files
├── utils/
│   └── discordLogger.js  # Discord webhook logger
├── .env.example          # Environment variables template
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies and scripts
```

## 🔧 Environment Variables

### Required Variables

| Variable               | Description                   | Example                                          |
| ---------------------- | ----------------------------- | ------------------------------------------------ |
| `MONGODB_URI`          | MongoDB connection string     | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `SESSION_SECRET`       | Secret for session encryption | `random-32-character-string`                     |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID        | `123456789-abc.apps.googleusercontent.com`       |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret    | `GOCSPX-abc123def456`                            |
| `GOOGLE_CALLBACK_URL`  | OAuth callback URL            | `http://localhost:3000/auth/google/callback`     |
| `ADMIN_EMAILS`         | Comma-separated admin emails  | `admin1@gmail.com,admin2@gmail.com`              |
| `MIGRATION_SECRET`     | Secret for migration endpoint | `random-secure-string-for-migrations`            |

### Optional Variables

| Variable                | Description                 | Default |
| ----------------------- | --------------------------- | ------- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name       | -       |
| `CLOUDINARY_API_KEY`    | Cloudinary API key          | -       |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret       | -       |
| `DISCORD_WEBHOOK_URL`   | Discord webhook for logging | -       |
| `PORT`                  | Server port                 | `3000`  |

## 🎯 Setting Up OAuth

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (for local dev)
   - `https://your-domain.vercel.app/auth/google/callback` (for production)
7. Copy Client ID and Client Secret to your `.env` file

## 📸 Setting Up Cloudinary

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Go to Dashboard
3. Copy your Cloud Name, API Key, and API Secret
4. Add them to your `.env` file

## 🗄️ Setting Up MongoDB Atlas

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for all IPs)
5. Get connection string and add to `.env`

## 🚢 Deployment

### Deploy to Vercel

See [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) for detailed deployment instructions.

**Quick Deploy:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

Remember to set all environment variables in Vercel dashboard!

## 🛠️ Available Scripts

| Script                 | Command                 | Description                               |
| ---------------------- | ----------------------- | ----------------------------------------- |
| `npm start`            | `node api/index.js`     | Start production server                   |
| `npm run dev`          | `nodemon api/index.js`  | Start development server with auto-reload |
| `npm run vercel-build` | `echo 'Build complete'` | Vercel build command                      |

## 🔒 Admin Access

To make a user an admin:

1. Add their Google email to the `ADMIN_EMAILS` environment variable
2. Format: `admin1@gmail.com,admin2@gmail.com` (comma-separated, no spaces)
3. User needs to logout and login again for changes to take effect
4. Access admin panel at: `/admin.html`

## 🌟 Key Features Explained

### Product Management

- Multiple image uploads via Cloudinary
- Drag-and-drop image reordering
- Primary image selection
- Stock status tracking
- Featured product highlighting
- Category organization

### User Management

- View all registered users
- Ban/unban functionality
- Ban duration options (permanent or temporary)
- Admin role management

### Comments System

- User comments on products
- Admin replies to comments
- Threaded comment display

### Security

- Session-based authentication
- Admin-only route protection
- Ban system to prevent unauthorized access
- Secure cookie settings for production

## 📝 API Endpoints

### Authentication

- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Products

- `GET /api/products` - List all active products
- `GET /api/products/:id` - Get single product

### Admin (Requires Admin)

- `GET /api/admin/users` - List users
- `POST /api/admin/users/:id/ban` - Ban user
- `POST /api/admin/users/:id/unban` - Unban user
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/categories` - List categories
- `POST /api/admin/categories` - Create category
- `DELETE /api/admin/categories/:id` - Delete category
- `GET /api/admin/statistics` - Get stats
- `GET /api/admin/comments/unreplied` - Get comments
- `POST /api/admin/comments/:id/reply` - Reply to comment

### Migrations (Serverless)

- `POST /api/migrate?secret=YOUR_SECRET` - Run database migrations

**Usage:**

```bash
# Using curl
curl -X POST "https://your-domain.vercel.app/api/migrate?secret=your-migration-secret"

# Using PowerShell
Invoke-WebRequest -Uri "https://your-domain.vercel.app/api/migrate?secret=your-migration-secret" -Method POST
```

See [SERVERLESS_GUIDE.md](./SERVERLESS_GUIDE.md) for detailed migration instructions.

## 🐛 Troubleshooting

### Server won't start

- Check if `.env` file exists with correct values
- Verify MONGODB_URI is correct
- Ensure Node.js version is 18 or higher

### Can't login

- Verify Google OAuth credentials are correct
- Check GOOGLE_CALLBACK_URL matches in both `.env` and Google Console
- Make sure session secret is set

### Can't access admin panel

- Verify your email is in ADMIN_EMAILS
- Logout and login again
- Check console for errors

### Images won't upload

- Verify Cloudinary credentials
- Check network connectivity
- Ensure file size is under limits

## 📞 Support

For issues and questions:

- Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- Review [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) for deployment help
- Check console logs for error messages

## 📄 License

This project is private and proprietary.

---

**Made with ❤️ for Vivid Vision**

# Vivid Vision - E-commerce Platform

A modern, feature-rich e-commerce platform built with Node.js, Express, and MongoDB.

## Features

- 🛍️ Product catalog with image carousel
- 🔐 Google OAuth authentication
- 👤 User profiles and cart management
- 💬 Product comments and reviews
- 🎨 Beautiful dark theme UI with animations
- 📱 Fully responsive design
- 🔧 Admin panel for product management
- 🖼️ Automatic image optimization (1200×900px)
- 📊 Statistics and analytics
- 🚫 Comment moderation system

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js (Google OAuth)
- **File Upload**: Multer
- **Session Management**: Express-session with MongoDB store
- **Frontend**: Vanilla JavaScript, CSS3

## Local Development

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Google OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd vivid-vision
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in root directory:
```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_random_secret_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
DISCORD_WEBHOOK_URL=your_discord_webhook_url (optional)
PORT=3000
```

4. Start the development server:
```bash
npm run dev
```

5. Visit `http://localhost:3000`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for Vercel.

## Project Structure

```
vivid-vision/
├── models/           # MongoDB schemas
├── public/           # Static files (HTML, CSS, JS)
├── routes/           # Express routes
├── uploads/          # Uploaded product images
├── utils/            # Utility functions
├── server.js         # Main server file
└── package.json      # Dependencies
```

## Admin Panel

Access the admin panel at `/admin` (requires admin privileges).

Features:
- Product management (CRUD)
- User management
- Comment moderation
- Statistics dashboard
- Image converter tool
- Developer tools

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `SESSION_SECRET` | Secret for session encryption | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | Yes |
| `DISCORD_WEBHOOK_URL` | Discord webhook for logging | No |
| `PORT` | Server port (default: 3000) | No |

## License

MIT

## Author

Vivid Vision Team
```

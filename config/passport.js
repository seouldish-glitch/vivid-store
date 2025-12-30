const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

module.exports = function () {
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("🔐 Google Strategy callback triggered");
        console.log("Profile ID:", profile.id);
        console.log("Display Name:", profile.displayName);
        
        const email = profile.emails && profile.emails[0].value;
        const photo = profile.photos && profile.photos[0]?.value;

        console.log("Email:", email);

        // Check if user is admin based on env variable
        const adminEmails = process.env.ADMIN_EMAILS 
          ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim()) 
          : [];
        const isAdmin = adminEmails.includes(email);

        console.log("Is Admin:", isAdmin);

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          console.log("Creating new user...");
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
            picture: photo || "",
            isAdmin
          });
          console.log("✅ User created:", user._id);
        } else {
          console.log("Updating existing user...");
          user.name = profile.displayName || user.name;
          user.email = email || user.email;
          if (photo) user.picture = photo;
          user.isAdmin = isAdmin;
          await user.save();
          console.log("✅ User updated:", user._id);
        }

        done(null, user);
      } catch (err) {
        console.error("❌ Google Strategy error:", err);
        done(err, null);
      }
    }
  )
);


  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};

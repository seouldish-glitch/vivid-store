const express = require("express");
const passport = require("passport");
const { isAdminUser } = require("./_middleware");
const { logEvent } = require("../utils/discordLogger");

const router = express.Router();


router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);


router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/?login=failed"
  }),
  async (req, res) => {
    await logEvent({
      category: "AUTH",
      action: "LOGIN_SUCCESS",
      user: {
        email: req.user.email,
        name: req.user.name,
        id: req.user._id
      },
      meta: {
        isAdmin: isAdminUser(req.user)
      }
    });

    res.redirect("/?login=success");
  }
);


router.get("/me", (req, res) => {
  if (!req.user) return res.json({ user: null });

  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      isAdmin: isAdminUser(req.user)
    }
  });
});


router.post("/logout", async (req, res) => {
  if (req.user) {
    await logEvent({
      category: "AUTH",
      action: "LOGOUT",
      user: {
        email: req.user.email,
        name: req.user.name,
        id: req.user._id
      }
    });
  }

  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
});

module.exports = router;

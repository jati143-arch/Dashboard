const express = require('express');
const passport = require('passport');
const router = express.Router();

// GET /auth/google — redirect to Google consent screen
router.get('/google', passport.authenticate('google', {
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/drive.file',
  ],
  accessType: 'offline',
  prompt: 'consent',
}));

// GET /auth/callback — Google redirects here after consent
router.get('/callback',
  passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
  (req, res) => {
    res.redirect('/');
  }
);

// GET /auth/me — returns current user (or 401)
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({
    id:          req.user.id,
    name:        req.user.displayName,
    email:       req.user.emails?.[0]?.value,
    photo:       req.user.photos?.[0]?.value,
    accessToken: req.user.accessToken,
  });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

module.exports = router;

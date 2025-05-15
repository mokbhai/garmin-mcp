const passport = require("passport");
const OAuth1Strategy = require("passport-oauth1").Strategy;

// Configure Passport OAuth 1.0a strategy
passport.use(
  new OAuth1Strategy(
    {
      requestTokenURL:
        "https://connectapi.garmin.com/oauth-service/oauth/request_token",
      accessTokenURL:
        "https://connectapi.garmin.com/oauth-service/oauth/access_token",
      userAuthorizationURL: "https://connect.garmin.com/oauthConfirm",
      consumerKey: process.env.GARMIN_CONSUMER_KEY,
      consumerSecret: GARMIN_CONSUMER_SECRET,
      callbackURL: CALLBACK_URL,
      signatureMethod: "HMAC-SHA1",
    },
    function (token, tokenSecret, profile, done) {
      // Store the token and tokenSecret
      return done(null, {
        token: token,
        tokenSecret: tokenSecret,
      });
    }
  )
);

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

export { passport };

const dotenv = require("dotenv");
dotenv.config();

// Environment variables with defaults
const config = {
  port: process.env.PORT || 3000,
  strava: {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri:
      process.env.STRAVA_REDIRECT_URI ||
      "http://localhost:3000/auth/strava/callback",
  },
  apiKey: process.env.API_KEY || "your-secure-api-key",
  redisUri: process.env.REDIS_URI || "redis://localhost:6379",
};

module.exports = { config };

import dotenv from "dotenv";

dotenv.config();

// Environment variables with defaults
export const config = {
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

// Initialize Strava client
strava.config({
  access_token: "",
  client_id: config.strava.clientId,
  client_secret: config.strava.clientSecret,
  redirect_uri: config.strava.redirectUri,
});

export { strava };

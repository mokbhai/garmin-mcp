const express = require("express");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const passport = require("passport");
const OAuth1Strategy = require("passport-oauth1").Strategy;
const activityController = require("./controllers/activityController");
const ActivityController = require("./controllers/activityController");
const {
  setDataRedisClient,
  getDataRedisClient,
  redisClient,
} = require("./config/redis");
require("dotenv").config();

const app = express();

// Session configuration
app.use(
  session({
    name: "garmin-session",
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Garmin OAuth 1.0a configuration
const GARMIN_CONSUMER_KEY = process.env.GARMIN_CONSUMER_KEY;
const GARMIN_CONSUMER_SECRET = process.env.GARMIN_CONSUMER_SECRET;
const CALLBACK_URL =
  process.env.CALLBACK_URL || "http://localhost:3000/auth/garmin/callback";

// console.log(GARMIN_CONSUMER_KEY, GARMIN_CONSUMER_SECRET, CALLBACK_URL);

// Configure Passport OAuth 1.0a strategy
passport.use(
  new OAuth1Strategy(
    {
      requestTokenURL:
        "https://connectapi.garmin.com/oauth-service/oauth/request_token",
      accessTokenURL:
        "https://connectapi.garmin.com/oauth-service/oauth/access_token",
      userAuthorizationURL: "https://connect.garmin.com/oauthConfirm",
      consumerKey: GARMIN_CONSUMER_KEY,
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

// Routes
app.get("/auth/garmin", passport.authenticate("oauth"));

app.get(
  "/auth/garmin/callback",
  passport.authenticate("oauth", {
    failureRedirect: "/login",
  }),
  async (req, res) => {
    try {
      // Store user data in Redis
      const userData = {
        token: req.user.token,
        tokenSecret: req.user.tokenSecret,
        timestamp: new Date().toISOString(),
      };

      // Create a unique key for the user using their token
      const userKey = `user:${req.user.token}`;

      // Store in Redis with 24 hour expiry
      await setDataRedisClient(userKey, JSON.stringify(userData), 24 * 60 * 60);

      // Successful authentication
      res.redirect("/dashboard");
    } catch (error) {
      console.error("Error storing user data in Redis:", error);
      res.redirect("/dashboard");
    }
  }
);

// Protected route example
app.get("/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    const activityController = new ActivityController(
      GARMIN_CONSUMER_KEY,
      GARMIN_CONSUMER_SECRET
    );

    // Get activities data from Redis first
    let activities = await getDataRedisClient(
      `activities:user:${req.user.token}`
    );

    if (activities) {
      activities = JSON.parse(activities);
    } else {
      // If not in Redis, fetch from Garmin API
      activities = await activityController.getActivities(req, res);

      // Store in Redis with 24 hour expiry
      if (activities) {
        await setDataRedisClient(
          `activities:user:${req.user.token}`,
          JSON.stringify(activities),
          24 * 60 * 60
        );
      }
    }

    // Render dashboard with activities
    res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Garmin Activity Dashboard</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background-color: #f5f5f5;
                    }
                    .activity-card {
                        background: white;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .activity-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    }
                    .activity-type {
                        font-size: 1.2em;
                        font-weight: bold;
                        color: #2c3e50;
                    }
                    .activity-time {
                        color: #7f8c8d;
                    }
                    .activity-stats {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 10px;
                        margin-top: 10px;
                    }
                    .stat-item {
                        background: #f8f9fa;
                        padding: 10px;
                        border-radius: 4px;
                    }
                    .stat-label {
                        font-size: 0.8em;
                        color: #7f8c8d;
                    }
                    .stat-value {
                        font-size: 1.1em;
                        color: #2c3e50;
                        font-weight: bold;
                    }
                    .error-message {
                        background: #fee;
                        color: #c00;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <h1>Your Recent Activities</h1>
                ${
                  activities && activities.length > 0
                    ? `
                    <div id="activities">
                        ${activities
                          .map(
                            (activity) => `
                            <div class="activity-card">
                                <div class="activity-header">
                                    <span class="activity-type">${activity.type}</span>
                                    <span class="activity-time">${activity.startTime}</span>
                                </div>
                                <div class="activity-stats">
                                    <div class="stat-item">
                                        <div class="stat-label">Duration</div>
                                        <div class="stat-value">${activity.duration}</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-label">Distance</div>
                                        <div class="stat-value">${activity.distance}</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-label">Calories</div>
                                        <div class="stat-value">${activity.calories}</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-label">Average Speed</div>
                                        <div class="stat-value">${activity.averageSpeed}</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-label">Average Pace</div>
                                        <div class="stat-value">${activity.averagePace}</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-label">Device</div>
                                        <div class="stat-value">${activity.device}</div>
                                    </div>
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                `
                    : `
                    <div class="error-message">
                        No activities found for the last 24 hours. Try syncing your Garmin device or check back later.
                    </div>
                `
                }
            </body>
            </html>
        `);
  } catch (error) {
    console.error("Error rendering dashboard:", error);
    res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - Garmin Activity Dashboard</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background-color: #f5f5f5;
                    }
                    .error-message {
                        background: #fee;
                        color: #c00;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <h1>Error Loading Dashboard</h1>
                <div class="error-message">
                    ${
                      error.message ||
                      "An error occurred while loading your activities. Please try again later."
                    }
                </div>
            </body>
            </html>
        `);
  }
});

// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/garmin");
}

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

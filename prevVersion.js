require("dotenv").config();
const express = require("express");
const session = require("express-session");
const Grant = require("grant").express();
const MemoryStore = require("memorystore")(session);

const app = express();

// Session configuration
app.use(
  session({
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Initialize Grant
app.use(
  Grant({
    defaults: {
      origin: process.env.APP_URL || "http://localhost:3000",
      transport: "session",
      state: true,
    },
    garmin: {
      key: process.env.GARMIN_CONSUMER_KEY,
      secret: process.env.GARMIN_CONSUMER_SECRET,
      callback: "/callback",
      custom_params: {
        access_type: "offline",
      },
    },
  })
);

// Routes
app.get("/", (req, res) => {
  res.send('<a href="/connect/garmin">Connect with Garmin</a>');
});

app.get("/callback", async (req, res) => {
  try {
    const { oauth_token, oauth_verifier } = req.query;

    if (!oauth_token || !oauth_verifier) {
      throw new Error("Missing required OAuth parameters");
    }

    // Exchange request token for access token
    const accessTokenResponse = await exchangeRequestTokenForAccessToken(
      oauth_token,
      requestTokenSecret,
      oauth_verifier
    );

    // Store the tokens in session
    req.session.garminTokens = {
      access_token: accessTokenResponse.oauth_token,
      access_secret: accessTokenResponse.oauth_token_secret,
    };

    // Get user ID
    const userId = await getUserProfile(
      accessTokenResponse.oauth_token,
      accessTokenResponse.oauth_token_secret
    );

    res.json({
      message: "Successfully connected to Garmin",
      userId,
      tokens: {
        access_token: accessTokenResponse.oauth_token,
        access_secret: accessTokenResponse.oauth_token_secret,
      },
    });
  } catch (error) {
    console.error("Error in callback:", error);
    res.status(500).json({ error: "Failed to complete Garmin connection" });
  }
});

// Helper function to exchange request token for access token
async function exchangeRequestTokenForAccessToken(
  requestToken,
  verifier
) {
  const OAuth = require("oauth-1.0a");
  const crypto = require("crypto");
  const axios = require("axios");

  const oauth = new OAuth({
    consumer: {
      key: process.env.GARMIN_CONSUMER_KEY,
      secret: process.env.GARMIN_CONSUMER_SECRET,
    },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto
        .createHmac("sha1", key)
        .update(base_string)
        .digest("base64");
    },
  });

  const request = {
    url: "https://connectapi.garmin.com/oauth-service/oauth/access_token",
    method: "POST",
  };

  const headers = oauth.toHeader(
    oauth.authorize(request, {
      key: requestToken,
      secret: requestTokenSecret,
      verifier: verifier,
    })
  );

  const response = await axios.post(request.url, null, { headers });

  // Parse the response which is in the format: oauth_token=xxx&oauth_token_secret=yyy
  const params = new URLSearchParams(response.data);
  return {
    oauth_token: params.get("oauth_token"),
    oauth_token_secret: params.get("oauth_token_secret"),
  };
}

// Helper function to get user profile
async function getUserProfile(accessToken, accessSecret) {
  const OAuth = require("oauth-1.0a");
  const crypto = require("crypto");
  const axios = require("axios");

  const oauth = new OAuth({
    consumer: {
      key: process.env.GARMIN_CONSUMER_KEY,
      secret: process.env.GARMIN_CONSUMER_SECRET,
    },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto
        .createHmac("sha1", key)
        .update(base_string)
        .digest("base64");
    },
  });

  const request = {
    url: "https://apis.garmin.com/wellness-api/rest/user/id",
    method: "GET",
  };

  const headers = oauth.toHeader(
    oauth.authorize(request, {
      key: accessToken,
      secret: accessSecret,
    })
  );

  const response = await axios.get(request.url, { headers });
  return response.data.userId;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const axios = require("axios");
const OAuth = require("oauth-1.0a");
const crypto = require("crypto");

class ActivityController {
  constructor(GARMIN_CONSUMER_KEY, GARMIN_CONSUMER_SECRET) {
    if (!GARMIN_CONSUMER_KEY || !GARMIN_CONSUMER_SECRET) {
      throw new Error(
        "Garmin consumer key and secret must be set in environment variables"
      );
    }

    this.oauth = new OAuth({
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
  }

  // Helper method to make authenticated requests to Garmin API
  async makeAuthenticatedRequest(url, token, tokenSecret) {
    if (!token || !tokenSecret) {
      throw new Error(
        "Token and token secret are required for authenticated requests"
      );
    }

    const requestData = {
      url: url,
      method: "GET",
    };

    const headers = this.oauth.toHeader(
      this.oauth.authorize(requestData, {
        key: token,
        secret: tokenSecret,
      })
    );

    try {
      console.log("Making request to:", url);
      console.log("With headers:", headers);

      const response = await axios.get(url, {
        headers: {
          ...headers,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error making authenticated request:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      throw error;
    }
  }

  // Get user's activities
  async getActivities(req, res) {
    try {
      const { token, tokenSecret } = req.user;

      if (!token || !tokenSecret) {
        return res
          .status(401)
          .json({ error: "User not properly authenticated" });
      }

      // Get activities for the last 24 hours
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - 24 * 60 * 60; // 24 hours ago

      const url = `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`;

      const activities = await this.makeAuthenticatedRequest(
        url,
        token,
        tokenSecret
      );

      // Format activities for display
      const formattedActivities = activities.map((activity) => ({
        id: activity.summaryId,
        type: activity.activityType,
        startTime: new Date(
          activity.startTimeInSeconds * 1000
        ).toLocaleString(),
        duration: Math.floor(activity.durationInSeconds / 60) + " minutes",
        distance: (activity.distanceInMeters / 1000).toFixed(2) + " km",
        calories: activity.activeKilocalories,
        device: activity.deviceName,
        averageSpeed:
          activity.averageSpeedInMetersPerSecond.toFixed(2) + " m/s",
        averagePace:
          activity.averagePaceInMinutesPerKilometer.toFixed(2) + " min/km",
      }));

      return formattedActivities;
    } catch (error) {
      console.error("Error fetching activities:", error);
      throw error;
    }
  }

  // Get detailed activity information
  async getActivityDetails(req, res) {
    try {
      const { token, tokenSecret } = req.user;
      const { activityId } = req.params;

      if (!token || !tokenSecret) {
        return res
          .status(401)
          .json({ error: "User not properly authenticated" });
      }

      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - 24 * 60 * 60; // 24 hours ago

      const url = `https://apis.garmin.com/wellness-api/rest/activityDetails?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`;

      const activityDetails = await this.makeAuthenticatedRequest(
        url,
        token,
        tokenSecret
      );

      // Find the specific activity
      const activity = activityDetails.find((a) => a.summaryId === activityId);

      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Format detailed activity data
      const formattedDetails = {
        summary: {
          ...activity.summary,
          startTime: new Date(
            activity.summary.startTimeInSeconds * 1000
          ).toLocaleString(),
          duration:
            Math.floor(activity.summary.durationInSeconds / 60) + " minutes",
        },
        samples:
          activity.samples?.map((sample) => ({
            time: new Date(sample.startTimeInSeconds * 1000).toLocaleString(),
            heartRate: sample.heartRate,
            speed: sample.speedMetersPerSecond?.toFixed(2) + " m/s",
            distance: (sample.totalDistanceInMeters / 1000).toFixed(2) + " km",
            elevation: sample.elevationInMeters?.toFixed(1) + " m",
          })) || [],
        laps:
          activity.laps?.map((lap) => ({
            time: new Date(lap.startTimeInSeconds * 1000).toLocaleString(),
          })) || [],
      };

      return formattedDetails;
    } catch (error) {
      console.error("Error fetching activity details:", error);
      throw error;
    }
  }
}

module.exports = ActivityController;

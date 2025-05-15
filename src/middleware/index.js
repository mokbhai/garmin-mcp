import { config } from "../config/index.js";
import { redisClient } from "../config/redis.js";
import { v4 as uuidv4 } from "uuid";

// API key validation middleware
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== config.apiKey) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
};

// Input validation middleware
export const validateUserId = (req, res, next) => {
  next();
};

// Generate and store CSRF token
export const generateCsrfToken = async (userId) => {
  const existingToken = await redisClient.get(`csrf:${userId}`);
  if (existingToken) return existingToken;

  const token = uuidv4();
  await redisClient.set(`csrf:${userId}`, token, { EX: 15 * 60 }); // Expires in 15 minutes
  return token;
};

// Verify CSRF token
export const verifyCsrfToken = async (req, res, next) => {
  const userId = req.params.userId;
  const token = req.headers["x-csrf-token"];

  if (!token) {
    return res.status(403).json({ error: "CSRF token missing" });
  }

  const storedToken = await redisClient.get(`csrf:${userId}`);
  if (!storedToken || storedToken !== token) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
};

import { createClient } from "redis";
import { config } from "./index.js";
// Initialize Redis client
export const redisClient = createClient({
  url: config.redisUri,
});

export const setDataRedisClient = async (key, value, ttl = 60 * 60) => {
  await redisClient.set(key, value, { EX: ttl });
};

export const getDataRedisClient = async (key) => {
  return await redisClient.get(key);
};

export const deleteDataRedisClient = async (key) => {
  await redisClient.del(key);
};

export const checkDataRedisClient = async (key) => {
  return await redisClient.exists(key);
};

export const getAllDataRedisClient = async (key) => {
  return await redisClient.keys(key);
};

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.connect();
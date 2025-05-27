const { createClient } = require("redis");
const { config } = require("./index.js");

// Initialize Redis client
const redisClient = createClient({
  url: config.redisUri,
});

const setDataRedisClient = async (key, value, ttl = 60 * 60) => {
  await redisClient.set(key, value, { EX: ttl });
};

const getDataRedisClient = async (key) => {
  return await redisClient.get(key);
};

const deleteDataRedisClient = async (key) => {
  await redisClient.del(key);
};

const checkDataRedisClient = async (key) => {
  return await redisClient.exists(key);
};

const getAllDataRedisClient = async (key) => {
  return await redisClient.keys(key);
};

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.connect();

module.exports = {
  redisClient,
  setDataRedisClient,
  getDataRedisClient,
  deleteDataRedisClient,
  checkDataRedisClient,
  getAllDataRedisClient,
};

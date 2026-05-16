import redisClient from "../infrastructure/redisClient.js";
export const saveRefreshToken = async (userId, refreshToken, ttlSeconds) => {
    await redisClient.setex(`refresh_token:${refreshToken}`, ttlSeconds, userId);
};
export const findUserIdByRefreshToken = async (refreshToken) => {
    return redisClient.get(`refresh_token:${refreshToken}`);
};
export const deleteRefreshToken = async (refreshToken) => {
    await redisClient.del(`refresh_token:${refreshToken}`);
};

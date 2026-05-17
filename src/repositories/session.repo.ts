import redisClient from "../infrastructure/redisClient.js";

export const saveRefreshToken = async (userId: string, refreshToken: string, ttlSeconds: number): Promise<void> => {
  await redisClient.setex(`refresh_token:${refreshToken}`, ttlSeconds, userId);
};

export const findUserIdByRefreshToken = async (refreshToken: string): Promise<string | null> => {
  return redisClient.get(`refresh_token:${refreshToken}`);
};

export const deleteRefreshToken = async (refreshToken: string): Promise<void> => {
  await redisClient.del(`refresh_token:${refreshToken}`);
};

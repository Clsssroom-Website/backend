import { v4 as uuidv4 } from "uuid";
import * as UserRepo from "../repositories/user.repo.js";
import * as SessionRepo from "../repositories/session.repo.js";
import { HashStrategy } from "./token/hash.strategy.js";
import { TokenStrategy } from "./token/token.strategy.js";
const hashStrategy = new HashStrategy();
const tokenStrategy = new TokenStrategy();
// TTL for refresh token in Redis (7 days in seconds)
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
export const register = async (data) => {
    const existing = await UserRepo.findUserByEmail(data.email);
    if (existing) {
        const error = new Error("Email này đã được đăng ký!");
        error.statusCode = 409;
        throw error;
    }
    const passwordHash = await hashStrategy.hash(data.password);
    const userId = uuidv4();
    const newUser = await UserRepo.createUser({
        userId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
    });
    return {
        user: {
            userId: newUser.userId,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
        },
    };
};
export const login = async (data) => {
    const user = await UserRepo.findUserByEmail(data.email);
    if (!user) {
        const error = new Error("Email hoặc mật khẩu không đúng!");
        error.statusCode = 401;
        throw error;
    }
    const isMatch = await hashStrategy.compare(data.password, user.passwordHash);
    if (!isMatch) {
        const error = new Error("Email hoặc mật khẩu không đúng!");
        error.statusCode = 401;
        throw error;
    }
    const accessToken = tokenStrategy.generateAccessToken({ userId: user.userId, role: user.role });
    const refreshToken = tokenStrategy.generateRefreshToken({ userId: user.userId });
    await SessionRepo.saveRefreshToken(user.userId, refreshToken, REFRESH_TOKEN_TTL);
    return {
        accessToken,
        refreshToken,
        user: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };
};
export const refreshAccessToken = async (refreshToken) => {
    const userId = await SessionRepo.findUserIdByRefreshToken(refreshToken);
    if (!userId) {
        const error = new Error("Refresh token không hợp lệ hoặc đã hết hạn!");
        error.statusCode = 401;
        throw error;
    }
    try {
        tokenStrategy.verifyRefreshToken(refreshToken);
    }
    catch (err) {
        const error = new Error("Refresh token không hợp lệ hoặc đã hết hạn!");
        error.statusCode = 401;
        throw error;
    }
    const user = await UserRepo.findUserById(userId);
    if (!user) {
        const error = new Error("Không tìm thấy người dùng!");
        error.statusCode = 404;
        throw error;
    }
    const accessToken = tokenStrategy.generateAccessToken({ userId: user.userId, role: user.role });
    return accessToken;
};
export const logout = async (refreshToken) => {
    if (refreshToken) {
        await SessionRepo.deleteRefreshToken(refreshToken);
    }
};

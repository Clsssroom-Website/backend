import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET ?? "classroom_secret_key";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? "classroom_refresh_secret_key";
const JWT_EXPIRES_IN = "1m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
export class TokenStrategy {
    generateAccessToken(payload) {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
    generateRefreshToken(payload) {
        return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
    }
    verifyAccessToken(token) {
        return jwt.verify(token, JWT_SECRET);
    }
    verifyRefreshToken(token) {
        return jwt.verify(token, REFRESH_TOKEN_SECRET);
    }
}

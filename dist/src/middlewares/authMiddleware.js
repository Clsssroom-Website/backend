import { UnauthorizedError } from "../errors/index.js";
import { TokenStrategy } from "../services/strategies/token.strategy.js";
const tokenStrategy = new TokenStrategy();
export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedError("Token không hợp lệ hoặc bị thiếu.");
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            throw new UnauthorizedError("Token không được cung cấp.");
        }
        const decoded = tokenStrategy.verifyAccessToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error.name === "TokenExpiredError") {
            next(new UnauthorizedError("Token đã hết hạn."));
        }
        else if (error instanceof UnauthorizedError) {
            next(error);
        }
        else {
            next(new UnauthorizedError("Token không hợp lệ."));
        }
    }
};

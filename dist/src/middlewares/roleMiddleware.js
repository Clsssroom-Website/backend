export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Yêu cầu xác thực!" });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ success: false, message: "Bạn không có quyền truy cập!" });
            return;
        }
        next();
    };
};

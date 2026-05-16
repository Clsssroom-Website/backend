export const notFoundHandler = (req, res, _next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found.`,
        code: "ROUTE_NOT_FOUND",
        errors: []
    });
};

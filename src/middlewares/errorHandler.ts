import { type ErrorRequestHandler } from "express";

// Middleware xử lý lỗi toàn cục
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode: number =
    typeof (err as { statusCode?: number }).statusCode === "number"
      ? (err as { statusCode?: number }).statusCode
      : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";

  console.error("❌ Error:", message);

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;

import type { NextFunction, Request, RequestHandler, Response } from "express";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `No API route matches ${req.method} ${req.originalUrl}.`));
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const appError = error instanceof AppError ? error : new AppError(error instanceof SyntaxError ? 400 : 500, error instanceof SyntaxError ? "INVALID_JSON" : "INTERNAL_ERROR", error instanceof SyntaxError ? "The request body contains invalid JSON." : "An unexpected server error occurred.");
  if (appError.statusCode >= 500) console.error(error);
  res.status(appError.statusCode).json({ error: { code: appError.code, message: appError.message, ...(appError.details === undefined ? {} : { details: appError.details }) } });
};

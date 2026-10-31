import { NextFunction, Request, Response } from 'express';

/*
    Centralized error handler. Registered last in app.ts.
*/
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
    const error = err instanceof Error ? err : new Error('Internal Server Error');
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500;

    console.error(`[error] ${req.method} ${req.originalUrl}:`, error.message);

    res.status(statusCode).json({
        success: false,
        message: statusCode === 500 ? 'Internal Server Error' : error.message,
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
    });
}

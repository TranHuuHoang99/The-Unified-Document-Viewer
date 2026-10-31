import { NextFunction, Request, Response } from 'express';

/*
    A VIN is exactly 17 characters, alphanumeric,
    excluding I, O and Q (to avoid confusion with 1 and 0).
*/
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

/*
    Validates :vin / ?vin= before any upstream call is made.
*/
export function validateVin(req: Request, res: Response, next: NextFunction): void {
    const raw = req.query.vin;
    const vin = typeof raw === 'string' ? raw.trim().toUpperCase() : '';

    if (!vin) {
        res.status(400).json({
            success: false,
            message: 'Missing required query parameter: vin',
        });
        return;
    }

    if (!VIN_PATTERN.test(vin)) {
        res.status(400).json({
            success: false,
            message: 'Invalid VIN. A VIN must be exactly 17 alphanumeric characters (I, O and Q are not allowed).',
        });
        return;
    }

    // pass the normalized value downstream
    req.query.vin = vin;
    next();
}

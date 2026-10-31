import express, { Application, NextFunction, Request, Response } from 'express';
import { ENV } from './config/env.config.js';
import ApiRoutes from './routes/api.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

/*
    Aggregation API.
    The two dealership systems are separate processes (npm run mock:all).
*/
class App {
    private m_app: Application;
    private m_apiRoute: ApiRoutes = new ApiRoutes();

    constructor() {
        this.m_app = express();

        this._configureMiddlewares();
        this._configureRoutes();
        this._configureErrorHandling();
    }

    private _configureMiddlewares(): void {
        this.m_app.use(express.json());
        this.m_app.use(express.urlencoded({ extended: true }));
    }

    private _configureRoutes(): void {
        // request logging
        this.m_app.use('/api', (req: Request, res: Response, next: NextFunction) => {
            console.log(`[Incoming Request]: ${req.method} ${req.originalUrl}`);
            next();
        });

        this.m_app.use('/api', this.m_apiRoute.router);

        this.m_app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({ status: 'OK', timestamp: new Date() });
        });
    }

    private _configureErrorHandling(): void {
        this.m_app.use(errorHandler);
    }

    public startServer(): void {
        this.m_app.listen(ENV.PORT, () => {
            console.log(`Aggregation API running on http://localhost:${ENV.PORT}`);
            console.log(`Upstreams: SALES=${ENV.SALES_API_URL} SERVICE=${ENV.SERVICE_API_URL}`);
        });
    }
}

const app = new App();
app.startServer();

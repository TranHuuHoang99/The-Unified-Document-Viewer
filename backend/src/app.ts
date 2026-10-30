import { expectFailure } from 'node:test';
import { ENV } from './config/env.config.js'
import express, {Application, NextFunction, Request, Response} from 'express'
import ApiRoutes from './routes/api.routes.js';
import { generateDatabases } from '../database/sqlite.config.js';

class App {
    private m_app: Application;
    private m_apiRoute: ApiRoutes = new ApiRoutes();

    constructor() {
        this.m_app = express();

        this._configureMiddlewares();
        this._configureRoutes();
        this._configureErrorHandling();
    }

    /*
        configure all default filters for reading data
    */
    private _configureMiddlewares(): void {
        this.m_app.use(express.json());
        this.m_app.use(express.urlencoded({extended:true}));
    }

    /*
        centralized routing: all API request from frontend will go here
    */
    private _configureRoutes(): void {
        this.m_app.use('/api', (req: Request, res: Response, next: NextFunction) => {
            console.log("----------------------------------------");
            console.log(`[Incoming Request]: ${req.method} ${req.originalUrl}`);
            console.log("----------------------------------------");
            // pass to next route
            next();
        });

        /*
            register route
        */
        this.m_app.use('/api', this.m_apiRoute.router);

        this.m_app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({status: 'OK', timestamp: new Date()});
        });
    }

    /*
        centralized error handle for the entire of project
    */
    private _configureErrorHandling(): void {
        this.m_app.use((err: any, req: Request, res: Response, next: NextFunction) => {
            const statusCode = err.statusCode || 500;
            res.status(statusCode).json({
                success: false,
                message: err.message || 'Internal Server Error',
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
        });
    }

    public async startServer(): Promise<void> {
        try {
            await this._configureSQLite();

            const PORT = ENV.PORT || 5000;
            console.log('Connecting kafka system consumers ...');
            // await kafka.connect();

            this.m_app.listen(PORT, () => {
                console.log(`Server running on port: http://localhost:${PORT}`);
            });
        } catch (error) {
            console.error('Failed to start server : ', error);
            process.exit(1);
        }
    }

    private async _configureSQLite(): Promise<void> {
        await generateDatabases();
        console.log("All VIN already loaded to RAM");
    }
}

const app = new App();
app.startServer();

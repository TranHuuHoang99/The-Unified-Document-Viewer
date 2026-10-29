import { expectFailure } from 'node:test';
import { ENV } from './config/env.config.js'
import express, {Application, NextFunction, Request, Response} from 'express'

class App {
    private m_app: Application;

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
        // if receive prefix request api
        this.m_app.use('/api', (req: Request, res: Response, next: NextFunction) => {
            console.log("----------------------------------------");
            console.log(`[Incoming Request]: ${req.method} ${req.originalUrl}`);
            console.log("----------------------------------------");
            
        });
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
}

const app = new App();
app.startServer();

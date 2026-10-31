import path from 'path';
import express, { Application, Request, Response } from 'express';
import { ENV } from '../config/env.config.js';
import { DocumentStore } from '../database/sqlite.config.js';

/*
    Mocked Service dealership system (upstream API).
    Serves service documents from its own sqlite database on its own port.
*/
export function createServiceMockApp(store: DocumentStore): Application {
    const app = express();
    app.use(express.json());

    app.get('/api/service/docs', async (req: Request, res: Response) => {
        const vin = typeof req.query.vin === 'string' ? req.query.vin.trim() : '';
        if (!vin) {
            res.status(400).json({ success: false, message: 'Missing required query parameter: vin' });
            return;
        }

        // optional artificial latency, for demonstrating aggregation timeouts
        const delayMs = Number(req.query.delayMs);
        if (Number.isFinite(delayMs) && delayMs > 0 && delayMs <= 10000) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        try {
            const rows = await store.findByVin('service_documents', vin, 'service_date');
            res.status(200).json({ success: true, vin, count: rows.length, documents: rows });
        } catch (error) {
            console.error('[service-mock] query failed:', error);
            res.status(500).json({ success: false, message: 'Upstream service system error' });
        }
    });

    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ system: 'service-mock', status: 'OK', timestamp: new Date() });
    });

    return app;
}

export async function startServiceMock(): Promise<void> {
    const store = await DocumentStore.open(path.join(process.cwd(), ENV.DATABASE_SERVICE_OUTPUT));
    const app = createServiceMockApp(store);

    app.listen(ENV.SERVICE_API_PORT, () => {
        console.log(`[service-mock] mocked service system listening on http://localhost:${ENV.SERVICE_API_PORT}`);
    });
}

// allow running this file directly: npm run mock:service
if (process.argv[1]?.endsWith('service-mock.server.ts') || process.argv[1]?.endsWith('service-mock.server.js')) {
    startServiceMock().catch((error) => {
        console.error('[service-mock] failed to start:', error);
        process.exit(1);
    });
}

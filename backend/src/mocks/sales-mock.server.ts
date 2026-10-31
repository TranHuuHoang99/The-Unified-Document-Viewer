import path from 'path';
import express, { Application, Request, Response } from 'express';
import { ENV } from '../config/env.config.js';
import { DocumentStore } from '../database/sqlite.config.js';

/*
    Mocked Sales dealership system (upstream API).
    Serves sales documents from its own sqlite database on its own port.
*/
export function createSalesMockApp(store: DocumentStore): Application {
    const app = express();
    app.use(express.json());

    app.get('/api/sales/docs', async (req: Request, res: Response) => {
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
            const rows = await store.findByVin('sales_documents', vin, 'sale_date');
            res.status(200).json({ success: true, vin, count: rows.length, documents: rows });
        } catch (error) {
            console.error('[sales-mock] query failed:', error);
            res.status(500).json({ success: false, message: 'Upstream sales system error' });
        }
    });

    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ system: 'sales-mock', status: 'OK', timestamp: new Date() });
    });

    return app;
}

export async function startSalesMock(): Promise<void> {
    const store = await DocumentStore.open(path.join(process.cwd(), ENV.DATABASE_SALE_OUTPUT));
    const app = createSalesMockApp(store);

    app.listen(ENV.SALES_API_PORT, () => {
        console.log(`[sales-mock] mocked sales system listening on http://localhost:${ENV.SALES_API_PORT}`);
    });
}

// allow running this file directly: npm run mock:sales
if (process.argv[1]?.endsWith('sales-mock.server.ts') || process.argv[1]?.endsWith('sales-mock.server.js')) {
    startSalesMock().catch((error) => {
        console.error('[sales-mock] failed to start:', error);
        process.exit(1);
    });
}

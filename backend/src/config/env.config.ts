import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const ENV = {
    PORT: parseInt(process.env.PORT || '4444', 10),

    /*
        MOCKED DEALERSHIP SYSTEMS (upstream APIs)
    */
    SALES_API_URL: process.env.SALES_API_URL || 'http://localhost:4445',
    SERVICE_API_URL: process.env.SERVICE_API_URL || 'http://localhost:4446',
    SALES_API_PORT: parseInt(process.env.SALES_API_PORT || '4445', 10),
    SERVICE_API_PORT: parseInt(process.env.SERVICE_API_PORT || '4446', 10),

    /*
        AGGREGATION TUNING
    */
    UPSTREAM_TIMEOUT_MS: parseInt(process.env.UPSTREAM_TIMEOUT_MS || '3000', 10),
    CACHE_TTL_MS: parseInt(process.env.CACHE_TTL_MS || '60000', 10),

    /*
        MOCK DATA INPUT (json fixtures) / OUTPUT (sqlite databases)
    */
    DATABASE_SALE_INPUT: process.env.DATABASE_SALE_INPUT || '../gen_database/sales_data.json',
    DATABASE_SERVICE_INPUT: process.env.DATABASE_SERVICE_INPUT || '../gen_database/service_data.json',
    DATABASE_SALE_OUTPUT: process.env.DATABASE_SALE_OUTPUT || './database/sales.db',
    DATABASE_SERVICE_OUTPUT: process.env.DATABASE_SERVICE_OUTPUT || './database/service.db',
};

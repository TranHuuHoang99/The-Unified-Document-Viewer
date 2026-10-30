import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const ENV = {
    PORT: parseInt(process.env.PORT || '4444', 10),

    /*
        KAFKA CONFIGURATION
    */
    KAFKA_BROKERS: process.env.KAFKA_BROKERS || 'localhost:6666',
    KAFKA_CLIENT_ID: process.env.KAFKA_BROKERS || 'unified-document-viewer',
    KAFKA_GROUP_ID: process.env.KAFKA_BROKERS || 'document-viewer-group',

    /*
        DATABASE CONFIGURATION INPUT
    */
    DATABASE_SALE_INPUT: process.env.DATABASE_SALE_INPUT || '../gen_database/sales_data.json',
    DATABASE_SERVICE_INPUT: process.env.DATABASE_SERVICE_INPUT || '../gen_database/service_data.json',
    
    /*
        DATABASE CONFIGURATION OUTPUT
    */
    DATABASE_SALE_OUTPUT: process.env.DATABASE_SALE_OUTPUT || './database/sales.db',
    DATABASE_SERVICE_OUTPUT: process.env.DATABASE_SERVICE_OUTPUT || './database/service.db',
};

import path from 'path';
import { ENV } from '../config/env.config.js';
import { buildDatabaseFromJson } from './sqlite.config.js';

/*
    Standalone seed script: npm run db:generate
    The mock servers rely on the databases existing, so this runs before they start.
*/
async function main(): Promise<void> {
    const salesDbPath = path.join(process.cwd(), ENV.DATABASE_SALE_OUTPUT);
    const serviceDbPath = path.join(process.cwd(), ENV.DATABASE_SERVICE_OUTPUT);

    await buildDatabaseFromJson(
        path.join(process.cwd(), ENV.DATABASE_SALE_INPUT),
        salesDbPath,
        'sales_documents',
        'document_id'
    );
    console.log(`Sales database generated at: ${salesDbPath}`);

    await buildDatabaseFromJson(
        path.join(process.cwd(), ENV.DATABASE_SERVICE_INPUT),
        serviceDbPath,
        'service_documents',
        'document_id'
    );
    console.log(`Service database generated at: ${serviceDbPath}`);
}

main().catch((error) => {
    console.error('Failed to generate databases:', error);
    process.exit(1);
});

import { startSalesMock } from './sales-mock.server.js';
import { startServiceMock } from './service-mock.server.js';

/*
    npm run mock:all — starts both mocked dealership systems.
*/
async function main(): Promise<void> {
    await Promise.all([startSalesMock(), startServiceMock()]);
    console.log('[mocks] both dealership systems are running (ports 4445 / 4446)');
}

main().catch((error) => {
    console.error('Failed to start mock servers:', error);
    process.exit(1);
});

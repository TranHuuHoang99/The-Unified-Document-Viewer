import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises'; // Use promises version for clean async/await syntax
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '../src/config/env.config.js';

// Define TypeScript interfaces for static type checking
interface SalesDocument {
    document_id: string;
    vin: string;
    customer_id: string;
    customer_name: string;
    document_type: string;
    salesperson_name: string;
    event_date: string;
    total_cost: number;
    total_amount: number;
    status: string;
    file_url: string;
}

interface ServiceDocument {
    document_id: string;
    vin: string;
    customer_id: string;
    customer_name: string;
    document_type: string;
    service_advisor: string;
    technician_name: string;
    event_date: string;
    mileage_odometer: number;
    total_cost: number;
    total_amount: number;
    status: string;
    file_url: string;
}

export async function generateDatabases(): Promise<void> {
    try {
        // --- 1. PROCESS SALES MICROSERVICE DATABASE ---
        console.log('Initializing Sales Database...');
        const salesDbPath = path.join(process.cwd(), ENV.DATABASE_SALE_OUTPUT);
        const salesDb = await open({ filename: salesDbPath, driver: sqlite3.Database });

        // Create table structure for Sales Microservice
        await salesDb.exec(`
            CREATE TABLE IF NOT EXISTS cached_sales_documents (
                document_id TEXT PRIMARY KEY,
                vin TEXT,
                customer_id TEXT,
                customer_name TEXT,
                document_type TEXT,
                salesperson_name TEXT,
                event_date TEXT,
                total_cost REAL,
                total_amount REAL,
                status TEXT,
                file_url TEXT
            );
        `);

        // Read and parse source data from Sales JSON file
        const salesJsonPath = path.join(process.cwd(), ENV.DATABASE_SALE_INPUT);
        const salesRawData = await fs.readFile(salesJsonPath, 'utf-8');
        const salesData: SalesDocument[] = JSON.parse(salesRawData);

        // Prepare parameterized SQL statement to prevent SQL Injection
        const insertSalesStmt = await salesDb.prepare(`
            INSERT OR REPLACE INTO cached_sales_documents 
            (document_id, vin, customer_id, customer_name, document_type, salesperson_name, event_date, total_cost, total_amount, status, file_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Iterate through records and batch insert into Sales DB
        for (const doc of salesData) {
            await insertSalesStmt.run(
                doc.document_id, doc.vin, doc.customer_id, doc.customer_name,
                doc.document_type, doc.salesperson_name, doc.event_date,
                doc.total_cost, doc.total_amount, doc.status, doc.file_url
            );
        }
        await insertSalesStmt.finalize();
        await salesDb.close();
        console.log(`Sales Database successfully generated at: ${salesDbPath}`);


        // --- 2. PROCESS SERVICE MICROSERVICE DATABASE ---
        console.log('Initializing Service Database...');
        const serviceDbPath = path.join(process.cwd(), ENV.DATABASE_SERVICE_OUTPUT);
        const serviceDb = await open({ filename: serviceDbPath, driver: sqlite3.Database });

        // Create table structure for Service Microservice
        await serviceDb.exec(`
            CREATE TABLE IF NOT EXISTS cached_service_documents (
                document_id TEXT PRIMARY KEY,
                vin TEXT,
                customer_id TEXT,
                customer_name TEXT,
                document_type TEXT,
                service_advisor TEXT,
                technician_name TEXT,
                event_date TEXT,
                mileage_odometer INTEGER,
                total_cost REAL,
                total_amount REAL,
                status TEXT,
                file_url TEXT
            );
        `);

        // Read and parse source data from Service JSON file
        const serviceJsonPath = path.join(process.cwd(), ENV.DATABASE_SERVICE_INPUT);
        const serviceRawData = await fs.readFile(serviceJsonPath, 'utf-8');
        const serviceData: ServiceDocument[] = JSON.parse(serviceRawData);

        // Prepare parameterized SQL statement for Service data
        const insertServiceStmt = await serviceDb.prepare(`
            INSERT OR REPLACE INTO cached_service_documents 
            (document_id, vin, customer_id, customer_name, document_type, service_advisor, technician_name, event_date, mileage_odometer, total_cost, total_amount, status, file_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Iterate through records and batch insert into Service DB
        for (const doc of serviceData) {
            await insertServiceStmt.run(
                doc.document_id, doc.vin, doc.customer_id, doc.customer_name,
                doc.document_type, doc.service_advisor, doc.technician_name, doc.event_date,
                doc.mileage_odometer, doc.total_cost, doc.total_amount, doc.status, doc.file_url
            );
        }
        await insertServiceStmt.finalize();
        await serviceDb.close();
        console.log(`Service Database successfully generated at: ${serviceDbPath}`);

    } catch (error) {
        console.error('An error occurred during the database generation process:', error);
    }
}


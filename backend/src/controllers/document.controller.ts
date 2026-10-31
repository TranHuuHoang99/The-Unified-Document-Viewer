import { NextFunction, Request, Response } from 'express';
import DocumentService from '../services/document.service.js';
import { IDocumentSearchResponse } from '../interfaces/document.interface.js';

/*
    Single entry point for the frontend.
    The browser makes one call; the service fans out to both dealership systems.
*/
export default class DocumentController {
    private m_documentService = new DocumentService();

    // public searchSaleDocs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    //     try {
    //         const vin = String(req.query.vin);
    //         const outcome = await this.m_documentService.searchSale(vin);

    //         const body: IDocumentSearchResponse = {
    //             success: true,
    //             message: this._buildMessage(outcome.documents.length),
    //             ...outcome,
    //         };

    //         res.status(200).json(body);
    //     } catch (error) {
    //         next(error);
    //     }
    // };

    public searchDocs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const vin = String(req.query.vin);
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.status(200); // return 200 ok to establish connection flow

            await this.m_documentService.searchDocs(vin, (outcome): void => {
                const body: IDocumentSearchResponse = {
                    success: true,
                    message: this._buildMessage(outcome.documents.length),
                    ...outcome,
                };
                res.write(`${JSON.stringify(body)}\n`);
            });
        } catch (err) {
            console.log(`Error while stream data: ${err instanceof Error ? err.message : err}`);
            next(err);
        }
    }

    private _buildMessage(count: number): string {
        return count > 0
            ? `${count} document${count === 1 ? '' : 's'} found.`
            : 'No documents found for this VIN.';
    }
}

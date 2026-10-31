import { NextFunction, Request, Response } from 'express';
import DocumentService from '../services/document.service.js';
import { IDocumentSearchResponse } from '../interfaces/document.interface.js';

/*
    Single entry point for the frontend.
    The browser makes one call; the service fans out to both dealership systems.
*/
export default class DocumentController {
    private m_documentService = new DocumentService();

    public search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const vin = String(req.query.vin);
            const outcome = await this.m_documentService.search(vin);

            const body: IDocumentSearchResponse = {
                success: true,
                message: this._buildMessage(outcome.partial, outcome.documents.length),
                ...outcome,
            };

            res.status(200).json(body);
        } catch (error) {
            next(error);
        }
    };

    private _buildMessage(partial: boolean, count: number): string {
        if (partial) {
            return 'Partial results: at least one dealership system could not be reached.';
        }
        return count > 0
            ? `${count} document${count === 1 ? '' : 's'} found.`
            : 'No documents found for this VIN.';
    }
}

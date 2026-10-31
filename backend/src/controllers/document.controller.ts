import { NextFunction, Request, Response } from 'express';
import DocumentService from '../services/document.service.js';
import { IDocumentSearchResponse } from '../interfaces/document.interface.js';

/*
    Single entry point for the frontend.

    Streams newline-delimited JSON: one frame per dealership system, written the
    moment that system answers. The connection is closed after both frames, so
    the client never waits for a source it has already rendered.
*/
export default class DocumentController {
    private m_documentService = new DocumentService();

    public searchDocs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const vin = String(req.query.vin);

        res.status(200);
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        // stop the upstream work if the browser goes away mid-stream
        const onClose = (): void => {
            if (!res.writableEnded) res.end();
        };
        res.on('close', onClose);

        try {
            await this.m_documentService.searchDocs(vin, (outcome): void => {
                if (res.writableEnded) return;

                const body: IDocumentSearchResponse = {
                    success: true,
                    message: this._buildMessage(outcome.sources, outcome.documents.length),
                    ...outcome,
                };
                res.write(`${JSON.stringify(body)}\n`);
            });

            if (!res.writableEnded) res.end();
        } catch (err) {
            console.log(`Error while stream data: ${err instanceof Error ? err.message : err}`);
            if (res.writableEnded) return;
            res.end();
            next(err);
        } finally {
            res.off('close', onClose);
        }
    };

    private _buildMessage(status: { status: string; error?: string }, count: number): string {
        if (status.status === 'error') {
            return status.error ?? 'This dealership system could not be reached.';
        }

        return count > 0
            ? `${count} document${count === 1 ? '' : 's'} found.`
            : 'No documents found for this VIN.';
    }
}

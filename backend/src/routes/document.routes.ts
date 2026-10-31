import { Router } from 'express';
import DocumentController from '../controllers/document.controller.js';
import { validateVin } from '../middlewares/validation.middleware.js';

export class DocumentRoute {
    public router: Router = Router();
    private m_documentController = new DocumentController();

    constructor() {
        this._initController();
    }

    private _initController(): void {
        // unified search across both dealership systems
        this.router.get('/', validateVin, this.m_documentController.search);
    }
}

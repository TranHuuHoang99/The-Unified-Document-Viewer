import { Router } from 'express';
import { DocumentRoute } from './document.routes.js';

export default class ApiRoutes {
    public router: Router = Router();
    private m_docRoute: DocumentRoute = new DocumentRoute();

    constructor() {
        this._initRoutes();
    }

    private _initRoutes(): void {
        // GET /api/documents?vin=...
        this.router.use('/documents', this.m_docRoute.router);
    }
}

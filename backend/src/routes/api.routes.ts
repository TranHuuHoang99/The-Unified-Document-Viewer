import { Router } from 'express';
import { DocumentRoute } from './document.routes.js';
import { SuggestionRoute } from './suggestion.routes.js';

export default class ApiRoutes {
    public router: Router = Router();
    private m_docRoute: DocumentRoute = new DocumentRoute();
    private m_suggestRoute: SuggestionRoute = new SuggestionRoute();

    constructor() {
        this._initRoutes();
    }

    private _initRoutes(): void {
        // GET /api/documents?vin=...
        this.router.use('/documents', this.m_docRoute.router);
        this.router.use('/suggestions', this.m_suggestRoute.router);
    }
}

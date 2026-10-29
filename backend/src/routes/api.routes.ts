import { Router } from "express";
import { DocumentRoute } from "./document.routes.js";

export default class ApiRoutes {
    public router: Router = Router();
    private m_docRoute: DocumentRoute = new DocumentRoute();

    constructor() {
        // register all routes
        this._initRoutes();
    }

    private _initRoutes(): void {
        this.router.use('/documents', this.m_docRoute.router);
    }
};

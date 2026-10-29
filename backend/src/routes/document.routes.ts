import { Router } from "express";
import SaleDocController from "../controllers/sale-document.controller.js";
import ServiceDocController from "../controllers/service-document.controller.js";

export class DocumentRoute {
    public router: Router = Router();
    private m_saleDocController = new SaleDocController();
    private m_serviceDocController = new ServiceDocController();

    constructor() {
        this._initController();
    }

    private _initController(): void {
        // get sale documents
        this.router.get('/sales/search', this.m_saleDocController.getSaleDocs);
        // get service documents
        this.router.get('/services/search', this.m_serviceDocController.getServiceDocs);
    }
};

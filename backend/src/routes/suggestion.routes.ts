import { Router } from "express";
import { SuggestionController } from "../controllers/suggestion.controller.js";
import { validateIfAnySpecialChar, validateVin } from "../middlewares/validation.middleware.js";

export class SuggestionRoute {
    public router: Router = Router();
    private m_suggestionController: SuggestionController = new SuggestionController();

    constructor() {
        this._initController();
    }

    private _initController(): void {
        this.router.get('/', validateIfAnySpecialChar, this.m_suggestionController.loadSuggestion);
    }
}

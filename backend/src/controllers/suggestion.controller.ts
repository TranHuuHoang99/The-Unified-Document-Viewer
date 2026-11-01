import { NextFunction } from "express";
import { Request, Response } from "express";
import { SuggestionService } from "../services/suggestion.service.js";

export class SuggestionController {
    private m_suggestionService = SuggestionService.instance();

    public loadSuggestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const contentType = req.headers['content-type'];
            const acceptHeader = req.headers['accept'];
            console.log(`[LOAD SUGGESTION] content type : ${contentType}, accept header : ${acceptHeader}`);

            if (!acceptHeader || acceptHeader !== 'application/json') {
                res.status(406).send(`Loading suggestion only support request json`);
                return;
            }

            const queryVin = String(req.query.vin);
            if (!queryVin) {
                res.status(400).json({error: `Invalid required query parameter vin: ${queryVin}`});
            }

            const vin = String(queryVin);
            res.status(200).json({ data: await this.m_suggestionService.queryVinSuggestion(vin) });
        } catch (err) {
            next(err);
        }
    }
}

import { Request, Response } from "express";

export default class SaleDocController {
    constructor() {

    }

    public getSaleDocs = async (req: Request, res: Response): Promise<void> => {
        console.log("this is sale documents controller");
        res.status(200).json({
            success: true,
            message: "This is sale docs controller"
        });
    }
}

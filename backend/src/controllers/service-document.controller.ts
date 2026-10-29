import { Request, Response } from "express";

export default class ServiceDocController {
    constructor() {

    }

    public getServiceDocs = async (req: Request, res: Response): Promise<void> => {
        console.log("this is service documents controller");
        res.status(200).json({
            success: true,
            message: "this is database of services docs"
        });
    }
}

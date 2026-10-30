import { EKafkaSalesTopics } from "../enums/kafka.enums.js";
import { BaseClient } from "./base.client.js";


export class SaleClients extends BaseClient {
    constructor() {
        super();
    }

    public async postSaleDocs(payload: any): Promise<void> {
        const messages = [
            {
                key: payload.id || null,
                value: payload,
                headers: { eventType: 'CreateDocument' }
            }
        ];
        await this.emit(EKafkaSalesTopics.SALE_DOCUMENT_POST, messages);
    }

    public async putSaleDocs(payload: any): Promise<void> {
        const messages = [
            {
                key: payload.id || null,
                value: payload,
                headers: { eventType: 'ReplaceDocument' }
            }
        ];
        await this.emit(EKafkaSalesTopics.SALE_DOCUMENT_PUT, messages);
    }

    public async patchSaleDocs(payload: any): Promise<void> {
        const messages = [
            {
                key: payload.id || null,
                value: payload,
                headers: { eventType: 'UpdateDocument' }
            }
        ];
        await this.emit(EKafkaSalesTopics.SALE_DOCUMENT_PATCH, messages);
    }
}

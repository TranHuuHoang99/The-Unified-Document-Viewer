import { EKafkaServicesTopics } from "../enums/kafka.enums.js";
import { BaseClient } from "./base.client.js";


export class ServiceClients extends BaseClient {
    constructor() {
        super();
    }

    public async postServiceDocs(payload: any): Promise<void> {
        const messages = [
            {
                key: payload.id || null,
                value: payload,
                headers: { eventType: 'CreateDocument' }
            }
        ];
        await this.emit(EKafkaServicesTopics.SERVICE_DOCUMENT_POST, messages);
    }

    public async putServiceDocs(payload: any): Promise<void> {
        const messages = [
            {
                key: payload.id || null,
                value: payload,
                headers: { eventType: 'ReplaceDocument' }
            }
        ];
        await this.emit(EKafkaServicesTopics.SERVICE_DOCUMENT_PUT, messages);
    }

    public async patchServiceDocs(payload: any): Promise<void> {
        const messages = [
            {
                key: payload.id || null,
                value: payload,
                headers: { eventType: 'UpdateDocument' }
            }
        ];
        await this.emit(EKafkaServicesTopics.SERVICE_DOCUMENT_PATCH, messages);
    }
}

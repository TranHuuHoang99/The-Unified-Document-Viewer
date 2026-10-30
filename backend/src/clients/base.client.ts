import { Kafka, Producer, Message } from "kafkajs";
import { ENV } from "../config/env.config.js";

export abstract class BaseClient {
    protected static m_kafka: Kafka;
    protected static m_producer: Producer;
    protected static m_isConnected: boolean =  false;

    constructor() {
        if (BaseClient.m_kafka === undefined) {
            BaseClient.m_kafka = new Kafka({
                clientId: ENV.KAFKA_CLIENT_ID || 'default-id',
                brokers: ENV.KAFKA_BROKERS ? ENV.KAFKA_BROKERS.split(',') : ['localhost:6666'],
            });
        }

        if (BaseClient.m_producer === undefined) {
            BaseClient.m_producer = BaseClient.m_kafka.producer();
        }
    }

    protected async connectProducer(): Promise<void> {
        if (!BaseClient.m_isConnected) {
            await BaseClient.m_producer.connect();
            BaseClient.m_isConnected = true;
        }
    }

    /*
        use for post/put/patch -> push to kafka and let microservice handle
    */
    protected async emit(topic: string, messages: Message[]): Promise<void> {
        try {
            await this.connectProducer();
            await BaseClient.m_producer.send({
                topic,
                messages: messages.map((msg) => ({
                    ...msg,
                    value: typeof msg.value === 'object' ? JSON.stringify(msg.value) : msg.value
                }))
            });
        } catch (err) {
            console.error(`[kafka base client] failed to send data to topc ${topic}`);
            throw err;
        }
    }

    public async disconnect(): Promise<void> {
        if (BaseClient.m_isConnected) {
            await BaseClient.m_producer.disconnect();
            BaseClient.m_isConnected = false;
        }
    }
}

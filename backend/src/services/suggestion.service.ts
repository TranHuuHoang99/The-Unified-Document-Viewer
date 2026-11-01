import { BaseHttpClient } from "../clients/base.client.js";
import { SalesClient } from "../clients/sales.client.js";
import { ServiceClient } from "../clients/service.client.js";
import { ENV } from "../config/env.config.js";

class Trie {
    public children: Map<string, Trie>;
    public isEndOfVinCode: boolean;
    constructor() {
        this.children = new Map();
        this.isEndOfVinCode = false;
    }
};

class VinTrie {
    private m_root: Trie;

    constructor() {
        this.m_root = new Trie();
    }

    public insert(vin: string): void {
        const cleanVin = vin.toUpperCase();
        let currentNode = this.m_root;
        for (const char of cleanVin) {
            if (!currentNode.children.has(char)) {
                currentNode.children.set(char, new Trie());
            }
            currentNode = currentNode.children.get(char)!;
        }
        currentNode.isEndOfVinCode = true;
    }

    public *query(vinSubstr: string): Generator<string> {
        const cleanVinSuf = vinSubstr.trim().toUpperCase();
        let currentNode = this.m_root;
        
        for (const char of cleanVinSuf) {
            if (!currentNode.children.has(char)) return;
            currentNode = currentNode.children.get(char)!;
        }

        function* dfs(node: Trie, currentPrefix: string): Generator<string> {
            if (node.isEndOfVinCode) {
                yield currentPrefix;
            }
            for (const [char, childNode] of node.children) {
                yield* dfs(childNode, currentPrefix + char);
            }
        }

        yield* dfs(currentNode, cleanVinSuf);
    }
};

export class SuggestionService {
    private m_vins: Set<string> = new Set<string>();
    private m_saleClient: SalesClient = SalesClient.instance();
    private m_serviceClient: ServiceClient = ServiceClient.instance();
    private static m_vinTrie: VinTrie = new VinTrie();
    private static m_instance: SuggestionService | undefined;
    private static m_loadPromise: Promise<void> | undefined;

    public static initialize(): Promise<void> {
        if (!SuggestionService.m_loadPromise) {
            SuggestionService.m_loadPromise = SuggestionService.instance()
                ._fetchAllVinId()
                .catch((error) => {
                    console.error('failed to initialize vin suggestions:', error);
                    SuggestionService.m_loadPromise = undefined;
                });
        }
        return SuggestionService.m_loadPromise;
    }

    public static instance(): SuggestionService {
        if (!SuggestionService.m_instance) {
            SuggestionService.m_instance = new SuggestionService();
        }
        return SuggestionService.m_instance;
    }

    // private so the vin fetch cannot be started before m_vinTrie exists
    private constructor() {}

    private async _fetchAllVinId(): Promise<void> {

        const responseVal = await Promise.allSettled([
            this.m_saleClient.fetchVins(AbortSignal.timeout(ENV.UPSTREAM_TIMEOUT_MS)),
            this.m_serviceClient.fetchVins(AbortSignal.timeout(ENV.UPSTREAM_TIMEOUT_MS)),
        ]);

        const [saleArr, serviceArr] = responseVal;
        if (saleArr.status === 'fulfilled') {
            for (const item of saleArr.value as any[]) this.m_vins.add(item.vin);
        } else {
            console.error("can not load all vin from sale system");
        }

        if (serviceArr.status === 'fulfilled') {
            for (const item of serviceArr.value as any[]) this.m_vins.add(item.vin);
        } else {
            console.error("can not load all vin from service system");
        }

        if (saleArr.status === 'rejected' && serviceArr.status === 'rejected') {
            throw new Error('both dealership systems are unreachable');
        }

        const vinTrie = new VinTrie();
        for (const str of this.m_vins) {
            vinTrie.insert(str);
        }
        SuggestionService.m_vinTrie = vinTrie;
        console.log('all vins loaded: ', this.m_vins);
    }

    public async queryVinSuggestion(vinSubstr: string): Promise<string[]> {
        await SuggestionService.initialize();
        return Array.from(SuggestionService.m_vinTrie.query(vinSubstr));
    }
}

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
    private static m_vinTrie: VinTrie;

    constructor() {
        this._fetchAllVinId();
        SuggestionService.m_vinTrie = new VinTrie();
    }

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

        console.log('all vins loaded: ', this.m_vins);
        for (const str of this.m_vins) {
            SuggestionService.m_vinTrie.insert(str);
        }
    }

    public queryVinSuggestion(vinSubstr: string): Iterable<string> {
        return SuggestionService.m_vinTrie.query(vinSubstr);
    }
}

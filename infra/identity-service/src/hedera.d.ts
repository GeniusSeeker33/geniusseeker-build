import { Client } from "@hashgraph/sdk";
export declare function hederaClient(): Client;
export declare function mintNftToTreasury(params: {
    tokenId: string;
    metadataBytes: Uint8Array;
}): Promise<{
    txId: string;
    serial: number | undefined;
}>;
//# sourceMappingURL=hedera.d.ts.map
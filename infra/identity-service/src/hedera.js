"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hederaClient = hederaClient;
exports.mintNftToTreasury = mintNftToTreasury;
const sdk_1 = require("@hashgraph/sdk");
require("dotenv").config({ path: "/var/www/geniusseeker-build/infra/identity-service/.env" });

function getConfig() {
    return {
        network: process.env.HEDERA_NETWORK || "testnet",
        operatorId: process.env.HEDERA_OPERATOR_ID,
        operatorKey: process.env.HEDERA_OPERATOR_KEY,
    };
}

function hederaClient() {
    const { network, operatorId, operatorKey } = getConfig();
    const client = network === "mainnet" ? sdk_1.Client.forMainnet() : sdk_1.Client.forTestnet();
    if (operatorId && operatorKey) {
        client.setOperator(sdk_1.AccountId.fromString(operatorId), sdk_1.PrivateKey.fromString(operatorKey));
    } else {
        console.warn("Hedera operator credentials not set. Minting will fail.");
    }
    return client;
}

async function mintNftToTreasury(params) {
    console.log("🔍 mintNftToTreasury called, tokenId:", params.tokenId, "operator:", process.env.HEDERA_OPERATOR_ID);
    const client = hederaClient();
    const metaBuffer = Buffer.isBuffer(params.metadataBytes)
        ? params.metadataBytes
        : Buffer.from(params.metadataBytes);
    const tx = await new sdk_1.TokenMintTransaction()
        .setTokenId(sdk_1.TokenId.fromString(params.tokenId))
        .setMetadata([metaBuffer])
        .execute(client);
    const receipt = await tx.getReceipt(client);
    const serial = receipt.serials?.[0]?.toNumber();
    return {
        txId: tx.transactionId.toString(),
        serial
    };
}

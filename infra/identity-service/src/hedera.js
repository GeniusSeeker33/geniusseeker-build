"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hederaClient = hederaClient;
exports.mintNftToTreasury = mintNftToTreasury;
exports.transferNftToAccount = transferNftToAccount;
exports.mintAndTransferNft = mintAndTransferNft;

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

/**
 * Transfers an NFT from the treasury (operator) to a candidate's account.
 * The candidate must have already associated the token with their account.
 */
async function transferNftToAccount(params) {
    // params: { tokenId, serial, toAccountId }
    console.log("🔀 transferNftToAccount:", params.tokenId, "serial", params.serial, "→", params.toAccountId);
    const { operatorId } = getConfig();
    const client = hederaClient();

    const tx = await new sdk_1.TransferTransaction()
        .addNftTransfer(
            sdk_1.NftId.fromString(`${params.tokenId}/${params.serial}`),
            sdk_1.AccountId.fromString(operatorId),
            sdk_1.AccountId.fromString(params.toAccountId)
        )
        .execute(client);

    const receipt = await tx.getReceipt(client);
    console.log("✅ NFT transferred, status:", receipt.status.toString());
    return {
        txId: tx.transactionId.toString(),
        status: receipt.status.toString()
    };
}

/**
 * Mints an NFT to treasury then attempts to transfer it to the candidate.
 * If transfer fails (e.g. candidate hasn't associated the token), logs a warning
 * and returns the mint result with transferError set — badge is still recorded in DB.
 */
async function mintAndTransferNft(params) {
    // params: { tokenId, metadataBytes, toAccountId }
    const mintResult = await mintNftToTreasury({
        tokenId: params.tokenId,
        metadataBytes: params.metadataBytes
    });

    // If recipient is the treasury itself, skip transfer
    const { operatorId } = getConfig();
    if (params.toAccountId === operatorId) {
        console.log("ℹ️  Recipient is treasury, skipping transfer.");
        return { ...mintResult, transferred: false, transferSkipped: true };
    }

    try {
        const transferResult = await transferNftToAccount({
            tokenId: params.tokenId,
            serial: mintResult.serial,
            toAccountId: params.toAccountId
        });
        return {
            ...mintResult,
            transferred: true,
            transferTxId: transferResult.txId
        };
    } catch (err) {
        // Common cause: TOKEN_NOT_ASSOCIATED_TO_ACCOUNT
        // Badge is still minted and recorded — candidate can associate later
        console.warn("⚠️  NFT transfer failed (candidate may need to associate token):", err.message || err);
        return {
            ...mintResult,
            transferred: false,
            transferError: err.message || String(err)
        };
    }
}

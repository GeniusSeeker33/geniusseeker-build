import {
  Client,
  PrivateKey,
  AccountId,
  TokenMintTransaction,
  TokenId
} from "@hashgraph/sdk";

const network = process.env.HEDERA_NETWORK || "testnet";
const operatorId = process.env.HEDERA_OPERATOR_ID;
const operatorKey = process.env.HEDERA_OPERATOR_KEY;

if (!operatorId || !operatorKey) {
  console.warn("Hedera operator credentials not set. Minting endpoints will fail until configured.");
}

export function hederaClient(): Client {
  const client =
    network === "mainnet" ? Client.forMainnet() : Client.forTestnet();

  if (operatorId && operatorKey) {
    client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
  }
  return client;
}

export async function mintNftToTreasury(params: {
  tokenId: string;
  metadataBytes: Uint8Array;
}) {
  const client = hederaClient();

  const tx = await new TokenMintTransaction()
    .setTokenId(TokenId.fromString(params.tokenId))
    .setMetadata([params.metadataBytes])
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const serial = receipt.serials?.[0]?.toNumber();

  return {
    txId: tx.transactionId.toString(),
    serial
  };
}

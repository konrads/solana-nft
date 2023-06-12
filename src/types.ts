export interface Config {
  providerUrl: string;
  walletSecret: string;
  bundlrAddress: string;
  nftTemplate: NftTemplate;
  nftDistributions: NftDistribution[];
  batchExec: { size: number; delayMs: number };
}

export interface NftTemplate {
  name: string;
  symbol: string;
  description: string;
  imgUri: string;
  attributes: { trait_type: string; value: string }[];
}

export interface NftDistribution {
  destPubkey: string;
  nftMintPubkey?: string;
  imgUri?: string;
  status?: "minted" | "airdropped" | "updated";
}

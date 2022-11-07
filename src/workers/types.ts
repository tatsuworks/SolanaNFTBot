export interface Worker {
  execute: () => Promise<void>;
}

export interface Project {
  salesDiscordChannelId: string;
  listingsDiscordChannelId: string;
  mintAddress?: string;
  collection?: string;
}

export interface MEActivity {
  signature: string;
  type: string;
  source: string;
  tokenMint: string;
  collection: string;
  slot: number;
  blockTime: number;
  buyer: string;
  buyerReferral: string;
  seller: string;
  sellerReferral: string;
  price: number;
}

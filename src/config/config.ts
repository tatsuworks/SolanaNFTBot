import { Project } from "workers/types";

export enum SubscriptionType {
  Sale = "NFTSale",
  Listing = "NFTListing",
}
export interface Subscription extends Project {
  type: SubscriptionType;
}

interface TwitterConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface Config {
  twitter: TwitterConfig;
  discordBotToken: string;
  queueConcurrency: number;
  subscriptions: Subscription[];
}

export interface MutableConfig extends Config {
  setSubscriptions(subscriptions: Subscription[]): Promise<void>;
  addSubscription(subscription: Subscription): Promise<void>;
}

export function loadConfig(): MutableConfig {
  const config: Config = {
    twitter: {
      appKey: process.env.TWITTER_API_KEY || "",
      appSecret: process.env.TWITTER_API_KEY_SECRET || "",
      accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || "",
    },
    discordBotToken: process.env.DISCORD_BOT_TOKEN || "",
    queueConcurrency: parseInt(process.env.QUEUE_CONCURRENCY || "2", 10),
    subscriptions: [],
  };

  /**
   * Load config from permanent storage
   */

  // if (
  //   process.env.SUBSCRIPTION_MINT_ADDRESS &&
  //   process.env.SUBSCRIPTION_DISCORD_CHANNEL_ID
  // ) {
  //   config.subscriptions.push({
  //     type: SubscriptionType.Sale,
  //     discordChannelId: process.env.SUBSCRIPTION_DISCORD_CHANNEL_ID || "",
  //     mintAddress: process.env.SUBSCRIPTION_MINT_ADDRESS || "",
  //   });
  // }

  if (
    process.env.COLLECTION &&
    process.env.SUBSCRIPTION_DISCORD_LISTING_CHANNEL_ID
  ) {
    config.subscriptions.push({
      type: SubscriptionType.Listing,
      salesDiscordChannelId: process.env.SUBSCRIPTION_DISCORD_CHANNEL_ID || "",
      listingsDiscordChannelId:
        process.env.SUBSCRIPTION_DISCORD_LISTING_CHANNEL_ID || "",
      collection: process.env.COLLECTION || "",
    });
  }

  return {
    ...config,
    async setSubscriptions(subscriptions: Subscription[]): Promise<void> {
      this.subscriptions = subscriptions;
    },
    async addSubscription(subscription: Subscription): Promise<void> {
      this.subscriptions.push(subscription);
    },
  };
}

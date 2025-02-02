import { Config } from "config";
import { initClient as initDiscordClient } from "lib/discord";
import initTwitterClient from "lib/twitter";
import {
  notifyDiscordSale,
  notifyDiscordActivity,
} from "lib/discord/notifyDiscord";
import notifyTwitter from "lib/twitter/notifyTwitter";
import logger from "lib/logger";
import queue from "queue";
import Discord from "discord.js";
import { MEActivity } from "workers/types";

export enum NotificationType {
  Sale,
  Listing,
}

export interface Notifier {
  notify: (nType: NotificationType, data: any) => Promise<void>;
}

export enum Platform {
  Twitter = "Twitter",
  Discord = "Discord",
  Webhook = "Webhook",
}

function queueNotification(
  nQueue: queue,
  platform: Platform,
  callback: () => Promise<void>
) {
  nQueue.push(() => {
    try {
      return callback();
    } catch (err) {
      logNotificationError(err, platform);
    }
  });
}

export async function newNotifierFactory(config: Config, nQueue: queue) {
  let discordClient: Discord.Client;
  if (config.discordBotToken) {
    discordClient = await initDiscordClient(config.discordBotToken);
  }

  const twitterClient = await initTwitterClient(config.twitter);

  return {
    create(discordChannelId: string): Notifier {
      async function notifySale(data: any) {
        if (discordClient) {
          queueNotification(nQueue, Platform.Discord, async () => {
            await notifyDiscordActivity(discordClient, discordChannelId, data);
          });
        }

        if (twitterClient) {
          queueNotification(nQueue, Platform.Twitter, async () => {
            await notifyTwitter(twitterClient, data);
          });
        }
      }
      async function notifyListing(data: MEActivity) {
        if (discordClient) {
          queueNotification(nQueue, Platform.Discord, async () => {
            await notifyDiscordActivity(discordClient, discordChannelId, data);
          });
        }

        //TODO
        // if (twitterClient) {
        //   queueNotification(nQueue, Platform.Twitter, async () => {
        //     await notifyTwitter(twitterClient, data);
        //   });
        // }
      }

      return {
        async notify(nType: NotificationType, data: any) {
          if (nType === NotificationType.Sale) {
            return await notifySale(data);
          }
          if (nType === NotificationType.Listing) {
            return await notifyListing(data);
          }
        },
      };
    },
  };
}

function logNotificationError(err: unknown, platform: string) {
  logger.error(`Error occurred when notifying ${platform}`, err);
}

import { Worker, Project, MEActivity } from "./types";
import axios, { AxiosError } from "axios";
import { NotificationType, Notifier } from "lib/notifier";
import logger from "lib/logger";
import { newNotificationsTracker } from "./helpers";
const LIMIT = 100;

const getMEActivity = async (
  collectionName: string,
  offset: number = 0,
  limit: number = LIMIT
) => {
  try {
    const results = await axios.get(
      `https://api-mainnet.magiceden.dev/v2/collections/${collectionName}/activities`,
      {
        params: {
          offset,
          limit,
        },
      }
    );
    const data = <MEActivity[]>results.data;
    const salesOrListings = data.filter((mea) => {
      return mea.type === "list" || mea.type === "buyNow";
    });
    return salesOrListings;
  } catch (err: any | AxiosError) {
    if (axios.isAxiosError(err)) {
      // Access to config, request, and response
      logger.error(err?.response?.data);
    }
    throw err;
  }
};

export default function newWorker(
  salesNotifier: Notifier,
  listingsNotifier: Notifier
): Worker {
  const timestamp = Date.now();
  let notifyAfter = new Date(timestamp);

  /**
   * Keep track of the latest notifications, so we don't notify them again
   */
  const latestNotifications = newNotificationsTracker(LIMIT);

  return {
    async execute() {
      const listings = await getMEActivity("meekolony");
      let maxListedAt = new Date(0);

      listings.forEach(async (nftListing) => {
        const txCreatedAt = new Date((nftListing.blockTime || 0) * 1000);
        if (notifyAfter > txCreatedAt) {
          return;
        }
        if (txCreatedAt > maxListedAt) maxListedAt = txCreatedAt;
        // Don't notify if transaction was previously notified.
        if (latestNotifications.alreadyNotified(nftListing.signature)) {
          logger.warn(`Duplicate listing ignored: ${nftListing.signature}`);
          return;
        }

        if (nftListing.type === "list") {
          await listingsNotifier.notify(NotificationType.Listing, nftListing);
        } else {
          await salesNotifier.notify(NotificationType.Sale, nftListing);
        }
        
        latestNotifications.trackNotifiedTx(nftListing.signature);
      });

      // cut off after this batch
      if (notifyAfter < maxListedAt) {
        notifyAfter = maxListedAt;
      }
    },
  };
}

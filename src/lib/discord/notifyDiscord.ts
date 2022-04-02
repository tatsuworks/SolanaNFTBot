import Discord, {
  MessageActionRow,
  MessageAttachment,
  MessageEmbed,
  TextChannel,
} from "discord.js";
import { NFTSale, SaleMethod } from "lib/marketplaces";
import truncateForAddress from "lib/truncateForAddress";
import logger from "lib/logger";
import { fetchDiscordChannel } from "./index";
import { MEActivity } from "workers/types";
import axios, { AxiosError } from "axios";
import magicEden from "lib/marketplaces/magicEden";
import { getSOLInUSD } from "workers/priceCheck";

const status: {
  totalNotified: number;
  lastNotified?: Date;
} = {
  totalNotified: 0,
};

export function getStatus() {
  return status;
}

export async function notifyDiscordSale(
  client: Discord.Client,
  channelId: string,
  nftSale: NFTSale,
  test?: boolean
) {
  const channel = await fetchDiscordChannel(client, channelId);
  if (!channel) {
    return;
  }

  const { marketplace, nftData } = nftSale;

  if (!nftData) {
    logger.log("missing nft Data for token: ", nftSale.token);
    return;
  }

  const method = `Sold${
    nftSale.method === SaleMethod.Bid ? " via bidding" : ""
  }`;

  const description = `${method} for ${nftSale.getPriceInSOL()} SOL◎ on ${
    marketplace.name
  }`;

  const actionRowMsg = new MessageActionRow({
    type: 1,
    components: [
      {
        style: 5,
        label: `View Transaction`,
        url: `https://solscan.io/tx/${nftSale.transaction}`,
        disabled: false,
        type: 2,
      },
      {
        style: 5,
        label: `View Token`,
        url: `https://solscan.io/token/${nftSale.token}`,
        disabled: false,
        type: 2,
      },
    ],
  });

  const { data: imageDL } = await axios.get(nftData.image, {
    responseType: "arraybuffer",
  });
  const ma = new MessageAttachment(imageDL, "nft.gif");
  const priceUSD = await getSOLInUSD(nftSale.getPriceInSOL());
  const embedMsg = new MessageEmbed({
    color: 0x0099ff,
    title: nftData.name,
    url: marketplace.itemURL(nftSale.token),
    timestamp: `${nftSale.soldAt}`,
    fields: [
      {
        name: "Price",
        value: `${nftSale.getPriceInSOL()} SOL◎ ${
          nftSale.method === SaleMethod.Bid ? "(Via bidding)" : ""
        }`,
        inline: false,
      },
      {
        name: "Price (USD)",
        value: `\`${priceUSD}\``,
        inline: true,
      },
      {
        name: "Buyer",
        value: craftAccountLink(nftSale.buyer),
        inline: true,
      },
      {
        name: "Seller",
        value: craftAccountLink(nftSale.seller),
        inline: true,
      },
    ],
    image: {
      url: "attachment://nft.gif",
      width: 400,
      height: 400,
    },
    footer: {
      text: `Sold on ${marketplace.name}`,
      icon_url: marketplace.iconURL,
      proxy_icon_url: marketplace.itemURL(nftSale.token),
    },
  });

  await channel.send({
    files: [ma],
    components: [actionRowMsg],
    embeds: [embedMsg],
  });
  const logMsg = `Notified discord #${channel.name}: ${nftData.name} - ${description}`;
  logger.log(logMsg);

  if (!test) {
    status.lastNotified = new Date();
    status.totalNotified++;
  }
}
function craftAccountLink(address: string | undefined) {
  if (!address) return "unknown";

  const truncated = truncateForAddress(address);
  return `[${truncated}](https://solscan.io/account/${address})`;
}
export async function notifyDiscordListing(
  client: Discord.Client,
  channelId: string,
  listing: MEActivity,
  test?: boolean
) {
  const channel = await fetchDiscordChannel(client, channelId);
  if (!channel) {
    return;
  }

  const description = `Listed for ${listing.price} SOL◎ on MagicEden`;
  const marketplace = magicEden;
  // get mint info?
  const nftData = await getMETokenMetaData(listing.tokenMint);
  const url = `https://magiceden.io/item-details/${listing.tokenMint}`;

  const actionRowMsg = new MessageActionRow({
    type: 1,
    components: [
      {
        style: 5,
        label: `View Token`,
        url: `https://solscan.io/token/${listing.tokenMint}`,
        disabled: false,
        type: 2,
      },
      {
        style: 5,
        label: `Moonrank`,
        url: `https://moonrank.app/collection/meekolony/${listing.tokenMint}`,
        disabled: false,
        type: 2,
      },
    ],
  });
  const { data: imageDL } = await axios.get(nftData.image, {
    responseType: "arraybuffer",
  });
  const ma = new MessageAttachment(imageDL, "nft.gif");
  const priceUSD = await getSOLInUSD(listing.price);

  const embedMsg = new MessageEmbed({
    color: 0x0099ff,
    title: nftData.name,
    url,
    timestamp: new Date(listing.blockTime * 1000),
    fields: [
      {
        name: "Price (SOL◎)",
        value: `\`${listing.price}\``,
        inline: true,
      },
      {
        name: "Price (USD)",
        value: `\`${priceUSD}\``,
        inline: true,
      },
      {
        name: "Seller",
        value: craftAccountLink(listing.seller),
        inline: true,
      },
    ],
    image: {
      url: "attachment://nft.gif",
      width: 400,
      height: 400,
    },
    footer: {
      text: `Listed on ${marketplace.name}`,
      icon_url: marketplace.iconURL,
      proxy_icon_url: url,
    },
  });

  await channel.send({
    files: [ma],
    components: [actionRowMsg],
    embeds: [embedMsg],
  });
  const logMsg = `Notified discord #${channel.name}: ${nftData.name} - ${description}`;
  logger.log(logMsg);

  if (!test) {
    status.lastNotified = new Date();
    status.totalNotified++;
  }
}

interface METokenMetadata {
  name: string;
  image: string;
}
const getMETokenMetaData = async (tokenAddr: string) => {
  try {
    const results = await axios.get(
      `https://api-mainnet.magiceden.dev/v2/tokens/${tokenAddr}`
    );
    const data = <METokenMetadata>results.data;
    return data;
  } catch (err: any | AxiosError) {
    if (axios.isAxiosError(err)) {
      // Access to config, request, and response
      logger.error(err?.response?.data);
    }
    throw err;
  }
};

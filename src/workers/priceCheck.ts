import axios, { AxiosError } from "axios";
import logger from "lib/logger";

let rate: number;
let last: Date;

// retrieves the USD rate for SOL
export const getSOLInUSD = async (price: number) => {
  const dateToCheck = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
  if (!rate || last < dateToCheck) {
    try {
      const { data: solRates } = await axios.get(
        "https://api.coinbase.com/v2/exchange-rates?currency=SOL"
      );
      const newRate = solRates?.data?.rates?.USD;

      rate = newRate;
    } catch (err: any | AxiosError) {
      if (axios.isAxiosError(err)) {
        // Access to config, request, and response
        logger.error(err?.response?.data);
      }
      logger.error(err);
    }
    last = new Date();
  }
  if (!isNaN(rate) && !isNaN(price)) {
    return (rate * price).toFixed(2);
  }
  return "N/A";
};

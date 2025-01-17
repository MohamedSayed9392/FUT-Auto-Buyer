import {
  convertRangeToSeconds,
  convertToSeconds,
  formatString,
  playAudio,
  wait,
} from "./commonUtil";
import {
  getBuyerSettings,
  getValue,
  increAndGetStoreValue,
  setValue,
} from "../services/repository";
import { startAutoBuyer, stopAutoBuyer } from "../handlers/autobuyerProcessor";

import { appendTransactions } from "./statsUtil";
import { errorCodeLookUp } from "../app.constants";
import { getSellPriceFromFutBin } from "./futbinUtil";
import { idProgressAutobuyer } from "../elementIds.constants";
import { sendNotificationToUser } from "./notificationUtil";
import { writeToLog } from "./logUtil";

const errorCodeCountMap = new Map();

export const buyPlayer = (
  player,
  playerName,
  price,
  sellPrice,
  isBin,
  tradeId
) => {
  const buyerSetting = getBuyerSettings();
  return new Promise((resolve) => {
    services.Item.bid(player, price).observe(
      this,
      async function (sender, data) {
        let priceTxt = formatString(price.toString(), 6);
        const notificationType = buyerSetting["idNotificationType"] || "";

        if (data.success) {
          if (isBin) {
            increAndGetStoreValue("purchasedCardCount");
            playAudio("cardWon");
          }
          const ratingThreshold = buyerSetting["idSellRatingThreshold"];
          let playerRating = parseInt(player.rating);
          const isValidRating =
            !ratingThreshold || playerRating <= ratingThreshold;

          const useFutBinPrice = buyerSetting["idSellFutBinPrice"];
          if (isValidRating && useFutBinPrice && isBin) {
            sellPrice = await getSellPriceFromFutBin(
              buyerSetting,
              playerName,
              player
            );
          }

          const checkBuyPrice = buyerSetting["idSellCheckBuyPrice"];
          if (checkBuyPrice && price > (sellPrice * 95) / 100) {
            sellPrice = -1;
          }

          const shouldList = sellPrice && !isNaN(sellPrice) && isValidRating;
      const profit =
      (buyerSetting["idAbQuickSell"]
        ? player.discardValue
        : sellPrice * 0.95) - price;
		  
		  const userCoins = services.User.getUser().coins.amount;
		  
		  const coinsToStop = buyerSetting["idAbStopIfCoinsLessThan"];
		  const isCoinsToStopEnabled = userCoins <= coinsToStop;

      var winCount = 0;
      var bidCount = 0;
      var lossCount = 0;

          var purchasedCardCount = getValue("purchasedCardCount");
          var cardsToBuy = buyerSetting["idAbCardCount"];

          const currentStats = getValue("sessionStats");
          var currentStatsSearchCount = 0;
          var currentStatsProfit = 0;

          if(currentStats){
            currentStatsSearchCount = currentStats.searchCount;
            currentStatsProfit = currentStats.profit;
          }
          

          if (isBin) {
            winCount = increAndGetStoreValue("winCount");
            appendTransactions(
              `[${new Date().toLocaleTimeString()}] ${playerName.trim()} buy success - Price : ${price}`
            );
            writeToLog(
              `W: ${winCount} ${playerName} ${cardsToBuy != 1000 ? (`[${purchasedCardCount} Of ${cardsToBuy}]`) : ""} buy success added to sell queue`,
              idProgressAutobuyer
            );

            if (!buyerSetting["idAbDontMoveWon"]) {
              const sellQueue = getValue("sellQueue") || [];
              sellQueue.push({
                player,
                playerName,
                sellPrice,
                shouldList,
                profit,
              });
              setValue("sellQueue", sellQueue);
            }
          } else {
            bidCount = increAndGetStoreValue("bidCount");
            appendTransactions(
              `[${new Date().toLocaleTimeString()}] ${playerName.trim()} bid success - Price : ${price}`
            );
            writeToLog(
              `B:${bidCount} ${playerName} bid success`,
              idProgressAutobuyer
            );
            const filterName = getValue("currentFilter") || "default";
            if (filterName) {
              const bidItemsByFilter = getValue("filterBidItems") || new Map();
              if (bidItemsByFilter.has(filterName)) {
                bidItemsByFilter.get(filterName).add(tradeId);
              } else {
                bidItemsByFilter.set(filterName, new Set([tradeId]));
              }
              setValue("filterBidItems", bidItemsByFilter);
            }
          }

          if (notificationType.includes("B") || notificationType === "A") {
            sendNotificationToUser(
              `✅ ${isBin ? winCount : bidCount} | ${isBin ? "buy" : "bid"} | ${playerName.trim()} | ${priceTxt.trim()} (profit ${profit})\n\r 🪙 ${userCoins.toLocaleString()}\n\r 🤑 ${currentStatsProfit}\n\r 🔍 ${currentStatsSearchCount} ${cardsToBuy != 1000 ? (`\n\r #️⃣ Bought ${purchasedCardCount} Of ${cardsToBuy}`) : ""}`,true);
          }
		  
          if(isCoinsToStopEnabled){
            writeToLog(
              `⚠ | 🪙 Coins to stop threshold reached | ${userCoins.toLocaleString()}`
            );
            sendNotificationToUser(
                  "⚠ | 🪙 Coins to stop threshold reached" + " | " + userCoins.toLocaleString(),false); 
            stopAutoBuyer();
          }
        } else {
          lossCount = increAndGetStoreValue("lossCount");
          appendTransactions(
            `[${new Date().toLocaleTimeString()}] ${playerName.trim()} buy failed - Price : ${price}`
          );
          let status = ((data.error && data.error.code) || data.status) + "";
          writeToLog(
            `L: ${lossCount} ${playerName} ${
              isBin ? "buy" : "bid"
            } failure ERR: (${
              errorCodeLookUp[status] + "(" + status + ")" || status
            })`,
            idProgressAutobuyer
          );
          if (notificationType.includes("L") || notificationType === "A") {
            sendNotificationToUser(
              `❌ ${lossCount} | ${playerName.trim()} | ${priceTxt.trim()}\n\r🔍 ${currentStatsSearchCount}`, false);
          }

          if (buyerSetting["idAbStopErrorCode"]) {
            const errorCodes = new Set(
              buyerSetting["idAbStopErrorCode"].split(",")
            );

            if (!errorCodeCountMap.has(status))
              errorCodeCountMap.set(status, { currentVal: 0 });

            errorCodeCountMap.get(status).currentVal++;

            if (
              errorCodes.has(status) &&
              errorCodeCountMap.get(status).currentVal >=
                buyerSetting["idAbStopErrorCodeCount"]
            ) {
              writeToLog(
                `[!!!] Autostopping bot since error code ${status} has occured ${
                  errorCodeCountMap.get(status).currentVal
                } times\n`,
                idProgressAutobuyer
              );
              errorCodeCountMap.clear();
              stopAutoBuyer();

              if (buyerSetting["idAbResumeAfterErrorOccured"]) {
                const pauseFor = convertRangeToSeconds(
                  buyerSetting["idAbResumeAfterErrorOccured"]
                );

                writeToLog(
                  `Bot will resume after ${pauseFor}(s)`,
                  idProgressAutobuyer
                );
                setTimeout(() => {
                  startAutoBuyer.call(getValue("AutoBuyerInstance"));
                }, pauseFor * 1000);
              }
            }
          }
        }
        buyerSetting["idAbAddBuyDelay"] &&
          (await wait(convertToSeconds(buyerSetting["idAbDelayToAdd"])));
        resolve();
      }
    );
  });
};

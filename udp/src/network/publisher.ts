import dgram from "dgram";
import {server} from "./server.js";
import {clearInterval} from "node:timers";
import {disconnectPlayer, getGameState, initializePlayer} from "../game/state.js";

const ongoingPublishing = new Map<string, NodeJS.Timeout>();

export const publishState = async (userId: string, rinfo: dgram.RemoteInfo) => {
  await initializePlayer(userId);

  const publishInterval = 1000; // 1 Hz for testing, change for the real application

  const previousIntervalId = ongoingPublishing.get(userId);
  if (previousIntervalId) {
    clearInterval(previousIntervalId);
  }

  const intervalId = setInterval(async () => {
    const gameState = await getGameState(userId);
    server.send(JSON.stringify(gameState), rinfo.port, rinfo.address, (err) => {
      if (err) {
        console.log(`Could not publish the state to the user ${userId}`);
      }
    });
  }, publishInterval);

  ongoingPublishing.set(userId, intervalId);
}

export const stopStatePublish = async (userId: string) => {
  await disconnectPlayer(userId);
  const intervalId = ongoingPublishing.get(userId);
  clearInterval(intervalId);
  ongoingPublishing.delete(userId);
};

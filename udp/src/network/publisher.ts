import dgram from "dgram";
import {server} from "./server.js";
import {clearInterval} from "node:timers";
import {redis} from "./storage.js";
import {buildUserHash, LATITUDE_HASH_KEY, LONGITUDE_HASH_KEY, ONLINE_SET_KEY} from "../../../common/index.js";
import {TGameState, TPlayerState} from "../models.js";

const ongoingPublishing = new Map<string, NodeJS.Timeout>();

const getPlayerState = async (userId: string): Promise<TPlayerState> => {
  const longitude = await redis.hget(buildUserHash(userId), LONGITUDE_HASH_KEY);
  const latitude = await redis.hget(buildUserHash(userId), LATITUDE_HASH_KEY);

  if (!latitude || !longitude) {
    throw Error('The player does not have a position assigned');
  }

  return {
    userId: userId,
    longitude: parseInt(longitude),
    latitude: parseInt(latitude),
  }
};

const getGameState = async (activeUserId: string): Promise<TGameState> => {
  const onlineUsers = await redis.smembers(ONLINE_SET_KEY);
  let player: TPlayerState | undefined;
  const otherPlayers: TPlayerState[] = [];

  for (const onlineUserId of onlineUsers) {
    const playerState = await getPlayerState(onlineUserId);
    if (activeUserId === onlineUserId) {
      player = playerState;
    } else {
      otherPlayers.push(playerState);
    }
  }

  if (!player) {
    throw Error('The active player is not online');
  }

  return {
    player: player,
    otherPlayers: otherPlayers,
  }
};

const initializePlayer = async (userId: string) => {
  await redis.sadd(ONLINE_SET_KEY, userId);
  const userHash = buildUserHash(userId);
  await redis.hset(userHash, LONGITUDE_HASH_KEY, 0);
  await redis.hset(userHash, LATITUDE_HASH_KEY, 0);
};

// TODO: handle disconnect
export const startPublishingState = async (userId: string, rinfo: dgram.RemoteInfo) => {
  await initializePlayer(userId);

  const publishInterval = 1000; // 1 Hz for testing, change for the real application

  const remoteIdentifier = `${rinfo.address}:${rinfo.port}`;
  const previousIntervalId = ongoingPublishing.get(remoteIdentifier);
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

  ongoingPublishing.set(remoteIdentifier, intervalId);
}

import {TGameState, TPlayerState} from "../models.js";
import {redis} from "../network/storage.js";
import {buildUserHash, LATITUDE_HASH_KEY, LONGITUDE_HASH_KEY, ONLINE_SET_KEY} from "../../../common/index.js";

const getPlayerState = async (userId: string): Promise<TPlayerState> => {
  const longitude = await redis.hget(buildUserHash(userId), LONGITUDE_HASH_KEY);
  const latitude = await redis.hget(buildUserHash(userId), LATITUDE_HASH_KEY);

  if (!latitude || !longitude) {
    throw Error('The player does not have a position assigned');
  }

  return {
    userId: userId,
    longitude: parseFloat(longitude),
    latitude: parseFloat(latitude),
  }
};

export const getGameState = async (activeUserId: string): Promise<TGameState> => {
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

export const initializePlayer = async (userId: string) => {
  await redis.sadd(ONLINE_SET_KEY, userId);
  const userHash = buildUserHash(userId);
  await redis.hsetnx(userHash, LONGITUDE_HASH_KEY, 0);
  await redis.hsetnx(userHash, LATITUDE_HASH_KEY, 0);
};

export const disconnectPlayer = async (userId: string) => {
  await redis.srem(ONLINE_SET_KEY, userId);
  const userHash = buildUserHash(userId);
  await redis.hdel(userHash, LATITUDE_HASH_KEY);
  await redis.hdel(userHash, LONGITUDE_HASH_KEY);
};

export const resetState = async () => {
  await redis.del(ONLINE_SET_KEY);
};

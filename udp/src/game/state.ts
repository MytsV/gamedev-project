import {TGameState, TPlayerState, TSongState} from "../models.js";
import {redis} from "../network/storage.js";
import {
  buildUserHash,
  LATITUDE_HASH_KEY,
  LONGITUDE_HASH_KEY,
  ONLINE_SET_KEY,
  USERNAME_HASH_KEY
} from "../../../common/index.js";

const getPlayerState = async (userId: string, isMain: boolean): Promise<TPlayerState> => {
  const longitude = await redis.hget(buildUserHash(userId), LONGITUDE_HASH_KEY);
  const latitude = await redis.hget(buildUserHash(userId), LATITUDE_HASH_KEY);
  const username = await redis.hget(buildUserHash(userId), USERNAME_HASH_KEY);

  if (!latitude || !longitude) {
    throw Error('The player does not have a position assigned');
  }

  if (!username) {
    throw Error('The player username is unknown');
  }

  return {
    userId: userId,
    username: username,
    longitude: parseFloat(longitude),
    latitude: parseFloat(latitude),
    isMain: isMain
  }
};

const getMockSong = (): TSongState => {
  return {
    id: '0',
    title: 'Radiohead - No Surprises',
    bpm: 157,
    onset: 0,
  }
};

export const getGameState = async (activeUserId: string): Promise<TGameState> => {
  const onlineUsers = await redis.smembers(ONLINE_SET_KEY);
  const players: TPlayerState[] = [];

  for (const onlineUserId of onlineUsers) {
    const isMain = activeUserId === onlineUserId;
    const playerState = await getPlayerState(onlineUserId, isMain);
    players.push(playerState);
  }

  return {
    players: players,
    song: getMockSong(),
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

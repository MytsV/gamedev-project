import {
  PlayerStatus,
  TGameState,
  TPlayerState,
  TSongState,
} from '../models.js';
import { prisma, redis } from '../network/storage.js';
import {
  ARROWS_HASH_KEY,
  buildLocationHash,
  buildUserHash,
  LATITUDE_HASH_KEY,
  LOCATION_ID_HASH_KEY,
  LONGITUDE_HASH_KEY,
  PLAYERS_HASH_KEY,
  SONG_HASH_KEY,
  TITLE_HASH_KEY,
  USERNAME_HASH_KEY,
} from '../../../common/index.js';
import { runDanceFloor } from './dance_deamon.js';

const getPlayerState = async (
  userId: string,
  isMain: boolean
): Promise<TPlayerState> => {
  const userHash = buildUserHash(userId);

  const locationId = await redis.hget(userHash, LOCATION_ID_HASH_KEY);
  const longitude = await redis.hget(userHash, LONGITUDE_HASH_KEY);
  const latitude = await redis.hget(userHash, LATITUDE_HASH_KEY);
  const username = await redis.hget(userHash, USERNAME_HASH_KEY);

  if (!latitude || !longitude) {
    throw Error('The player does not have a position assigned');
  }

  if (!locationId) {
    throw Error('The player is not present on any location');
  }

  if (!username) {
    throw Error('The player username is unknown');
  }

  // TODO: retrieve status and last mark
  return {
    userId: userId,
    username: username,
    longitude: parseFloat(longitude),
    latitude: parseFloat(latitude),
    isMain: isMain,
    status: PlayerStatus.IDLE,
    locationId: locationId,
  };
};

const getLocationTitle = async (locationHash: string): Promise<string> => {
  const title = await redis.hget(locationHash, TITLE_HASH_KEY);

  if (!title) {
    throw Error('The location does not have a title specified.');
  }

  return title;
};

const getLocationSong = async (
  locationHash: string
): Promise<TSongState | undefined> => {
  const songData = await redis.hgetall(`${locationHash}:${SONG_HASH_KEY}`);

  if (Object.keys(songData).length === 0) {
    return undefined;
  }

  return {
    id: songData.id,
    title: songData.title,
    startTimestamp: parseInt(songData.startTimestamp),
    onset: parseFloat(songData.onset),
    bpm: parseInt(songData.bpm),
  };
};

const getLocationArrowCombination = async (
  locationHash: string
): Promise<string[] | undefined> => {
  const arrowCombination = await redis.lrange(
    `${locationHash}:${ARROWS_HASH_KEY}`,
    0,
    -1
  );
  return arrowCombination.length === 0 ? undefined : arrowCombination;
};

export const getGameState = async (
  activeUserId: string,
  locationId: string
): Promise<TGameState> => {
  const locationHash = buildLocationHash(locationId);
  const locationPlayersHash = `${locationHash}:${PLAYERS_HASH_KEY}`;

  const onlineUsers = await redis.smembers(locationPlayersHash);
  const players: TPlayerState[] = [];

  for (const onlineUserId of onlineUsers) {
    const isMain = activeUserId === onlineUserId;
    const playerState = await getPlayerState(onlineUserId, isMain);
    if (playerState.locationId !== locationId) {
      console.error(`Player ${onlineUserId} has a faulty locationId`);
      continue;
    }
    players.push(playerState);
  }

  return {
    players: players,
    song: await getLocationSong(locationHash),
    locationTitle: await getLocationTitle(locationHash),
    arrowCombination: await getLocationArrowCombination(locationHash),
  };
};

const MAX_PLAYERS = 6;

export const initializePlayer = async (userId: string, locationId: string) => {
  const locationHash = buildLocationHash(locationId);
  const locationExists = await redis.exists(locationHash);
  if (!locationExists) {
    throw Error('Trying to connect to a location that does not exist.');
  }

  const locationPlayersHash = `${locationHash}:players`;
  const currentPlayerCount = await redis.scard(locationPlayersHash);
  if (currentPlayerCount >= MAX_PLAYERS) {
    throw Error('Cannot connect to a location as max player count is reached.');
  }

  await redis.sadd(locationPlayersHash, userId);

  const userHash = buildUserHash(userId);
  await redis.hset(userHash, LOCATION_ID_HASH_KEY, locationId);
  await redis.hsetnx(userHash, LONGITUDE_HASH_KEY, 0);
  await redis.hsetnx(userHash, LATITUDE_HASH_KEY, 0);
};

export const disconnectPlayer = async (userId: string) => {
  const userHash = buildUserHash(userId);
  const locationId = await redis.hget(userHash, LOCATION_ID_HASH_KEY);

  if (locationId) {
    const locationHash = buildLocationHash(locationId);
    await redis.srem(`${locationHash}:${PLAYERS_HASH_KEY}`, userId);
    await redis.hdel(userHash, LOCATION_ID_HASH_KEY);
  }

  await redis.hdel(userHash, LATITUDE_HASH_KEY);
  await redis.hdel(userHash, LONGITUDE_HASH_KEY);
};

const initializeLocations = async () => {
  const locations = await prisma.location.findMany();

  for (const location of locations) {
    const locationHash = buildLocationHash(location.id.toString());

    // TODO: replace with flushing the whole storage
    await redis.del(locationHash);
    await redis.del(`${locationHash}:${PLAYERS_HASH_KEY}`);
    await redis.del(`${locationHash}:${ARROWS_HASH_KEY}`);

    await redis.hmset(locationHash, TITLE_HASH_KEY, location.title);

    runDanceFloor(location);
  }
};

export const resetState = async () => {
  // TODO: refresh the whole storage
  //await redis.flushall();
  await initializeLocations();
};

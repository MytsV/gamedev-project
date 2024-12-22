import {
  PlayerStatus,
  TGameState,
  TPlayerState,
  TSongState,
} from '../models.js';
import { redis } from '../network/storage.js';
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
    onset: parseInt(songData.onset),
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

const getMockSong = (): TSongState => {
  return {
    id: '0',
    title: 'Radiohead - No Surprises',
    bpm: 157,
    onset: 0,
    startTimestamp: Date.now(),
  };
};

export const resetState = async () => {
  // TODO: refresh the whole storage
  //await redis.flushall();
  // TODO: load locations from the persistent database
  const locationHash = buildLocationHash('0');
  await redis.del(locationHash);
  await redis.del(`${locationHash}:${PLAYERS_HASH_KEY}`);

  // in general the song should be set from the daemon
  const songData: TSongState = getMockSong();

  await redis.hmset(locationHash, TITLE_HASH_KEY, 'Hip-Hop');

  await redis.hmset(`${locationHash}:${SONG_HASH_KEY}`, songData);
  await redis.del(`${locationHash}:${ARROWS_HASH_KEY}`);
  await redis.rpush(`${locationHash}:${ARROWS_HASH_KEY}`, ...[0, 1, 2, 3]);
};

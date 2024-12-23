import {
  playerColors,
  Mark,
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
  COLOR_HASH_KEY,
  LAST_MARK_HASH_KEY,
  LATITUDE_HASH_KEY,
  LOCATION_ID_HASH_KEY,
  LONGITUDE_HASH_KEY,
  PLAYERS_HASH_KEY,
  SCORES_HASH_KEY,
  SONG_HASH_KEY,
  STATUS_HASH_KEY,
  TITLE_HASH_KEY,
  USERNAME_HASH_KEY,
} from '../../../common/index.js';
import { runDanceFloor } from './dance_deamon.js';

const getPlayerState = async (
  userId: string,
  isMain: boolean
): Promise<TPlayerState> => {
  const userHash = buildUserHash(userId);

  const userHashData = await redis.hgetall(userHash);

  const locationId = userHashData[LOCATION_ID_HASH_KEY];
  const longitude = userHashData[LONGITUDE_HASH_KEY];
  const latitude = userHashData[LATITUDE_HASH_KEY];
  const username = userHashData[USERNAME_HASH_KEY];
  const status = userHashData[STATUS_HASH_KEY] as PlayerStatus;
  let lastMark: Mark | undefined = undefined;
  if (LAST_MARK_HASH_KEY in userHashData) {
    lastMark = userHashData[LAST_MARK_HASH_KEY] as Mark;
  }
  let color: string | undefined = undefined;
  if (COLOR_HASH_KEY in userHashData) {
    color = userHashData[COLOR_HASH_KEY];
  }

  if (!latitude || !longitude) {
    throw Error('The player does not have a position assigned');
  }

  if (!locationId || !status) {
    throw Error('The player is not present on any location');
  }

  if (!username) {
    throw Error('The player username is unknown');
  }

  return {
    userId: userId,
    username: username,
    longitude: parseFloat(longitude),
    latitude: parseFloat(latitude),
    isMain: isMain,
    status: status,
    locationId: locationId,
    lastMark: lastMark,
    color: color,
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

const getLocationScores = async (locationHash: string) => {
  const scores = await redis.hgetall(`${locationHash}:${SCORES_HASH_KEY}`);

  const playerScores: Record<string, number> = {};
  for (const [playerId, score] of Object.entries(scores)) {
    playerScores[playerId] = parseInt(score);
  }

  if (Object.keys(playerScores).length === 0) {
    return undefined;
  }

  return playerScores;
};

export const getGameState = async (
  activeUserId: string,
  locationId: string
): Promise<TGameState> => {
  const locationHash = buildLocationHash(locationId);
  const locationPlayersHash = `${locationHash}:${PLAYERS_HASH_KEY}`;

  const onlineUsers = await redis.smembers(locationPlayersHash);
  const players: TPlayerState[] = [];
  let isDancing = false;

  for (const onlineUserId of onlineUsers) {
    const isMain = activeUserId === onlineUserId;
    const playerState = await getPlayerState(onlineUserId, isMain);
    if (isMain) {
      isDancing = playerState.status === PlayerStatus.DANCING;
    }
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
    arrowCombination: isDancing
      ? await getLocationArrowCombination(locationHash)
      : undefined,
    scores: await getLocationScores(locationHash),
  };
};

const MAX_PLAYERS = 6;

const getRandomColor = () => {
  const randomIndex = Math.floor(Math.random() * playerColors.length);
  return playerColors[randomIndex];
};

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

  const oldLocationId = await redis.hget(userHash, LOCATION_ID_HASH_KEY);

  if (!oldLocationId || oldLocationId !== locationId) {
    await redis.hset(userHash, STATUS_HASH_KEY, PlayerStatus.IDLE);
    await redis.hset(userHash, LONGITUDE_HASH_KEY, 0);
    await redis.hset(userHash, LATITUDE_HASH_KEY, 0);

    if (oldLocationId) {
      const oldLocationHash = buildLocationHash(oldLocationId);
      await redis.srem(`${oldLocationHash}:${PLAYERS_HASH_KEY}`, userId);
    }

    await redis.hset(userHash, COLOR_HASH_KEY, getRandomColor());
  }

  await redis.hset(userHash, LOCATION_ID_HASH_KEY, locationId);
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

    await redis.hmset(locationHash, TITLE_HASH_KEY, location.title);

    runDanceFloor(location);
  }
};

export const resetState = async () => {
  await redis.flushall();
  await initializeLocations();
};

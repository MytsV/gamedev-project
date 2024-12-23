import { Location, Song } from '@prisma/client';
import { prisma, redis } from '../network/storage.js';
import {
  ARROWS_HASH_KEY,
  buildLocationHash,
  buildUserHash,
  LAST_MARK_HASH_KEY,
  MARKS_HASH_KEY,
  PLAYERS_HASH_KEY,
  SCORES_HASH_KEY,
  SONG_HASH_KEY,
  STATUS_HASH_KEY,
  USERNAME_HASH_KEY,
} from '../../../common/index.js';
import { Mark, PlayerStatus } from '../models.js';

const getRandomSong = async (): Promise<Song> => {
  const songs = await prisma.song.findMany();
  const randomIndex = Math.floor(Math.random() * songs.length);
  return songs[randomIndex];
};

const setLocationSong = async (location: Location, song: Song) => {
  const locationHash = buildLocationHash(location.id.toString());

  await redis.hmset(`${locationHash}:${SONG_HASH_KEY}`, {
    id: song.id.toString(),
    title: song.title,
    bpm: song.bpm.toString(),
    onset: song.onset.toString(),
    startTimestamp: Date.now().toString(),
  });
};

const wait = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getRandomArrowCombination = (length: number, inversion: boolean) => {
  const arrows = ['0', '1', '2', '3'];
  const combination = [];

  for (let i = 0; i < length; i++) {
    let randomArrow = arrows[Math.floor(Math.random() * arrows.length)];

    if (inversion && Math.random() > 0.5) {
      randomArrow = `-${randomArrow}`;
    }

    combination.push(randomArrow);
  }

  return combination;
};

const setNextCombination = (location: Location, combinationLength: number) => {
  const locationHash = buildLocationHash(location.id.toString());
  const arrowCombination = getRandomArrowCombination(
    combinationLength,
    location.inversion
  );
  redis.rpush(`${locationHash}:${ARROWS_HASH_KEY}`, ...arrowCombination);
};

const removeCombination = (location: Location) => {
  const locationHash = buildLocationHash(location.id.toString());
  redis.del(`${locationHash}:${ARROWS_HASH_KEY}`);
};

const removeScores = (location: Location) => {
  const locationHash = buildLocationHash(location.id.toString());
  redis.del(`${locationHash}:${SCORES_HASH_KEY}`);
};

const markScores: Record<string, number> = {
  [Mark.MISS]: 0,
  [Mark.BAD]: 500,
  [Mark.GOOD]: 1000,
  [Mark.PERFECT]: 2000,
};

const setScores = async (location: Location) => {
  const locationHash = buildLocationHash(location.id.toString());

  const locationPlayersHash = `${locationHash}:${PLAYERS_HASH_KEY}`;
  const locationMarksHash = `${locationHash}:${MARKS_HASH_KEY}`;

  const allPlayers = await redis.smembers(locationPlayersHash);
  const sentMarks = await redis.hgetall(locationMarksHash);

  const allMarks = new Map<string, string>();

  for (const playerId of allPlayers) {
    const userHash = buildUserHash(playerId);
    const playerStatus = await redis.hget(userHash, STATUS_HASH_KEY);
    const isDancing = playerStatus === PlayerStatus.DANCING;

    if (!isDancing) continue;

    if (playerId in sentMarks) {
      allMarks.set(playerId, sentMarks[playerId]);
    } else {
      allMarks.set(playerId, Mark.MISS);
      await redis.hset(userHash, LAST_MARK_HASH_KEY, Mark.MISS);
    }
  }

  const locationScoresHash = `${locationHash}:${SCORES_HASH_KEY}`;

  for (const [playerId, mark] of allMarks) {
    const score = markScores[mark];

    const userHash = buildUserHash(playerId);
    const username = await redis.hget(userHash, USERNAME_HASH_KEY);
    if (!username) continue;

    const currentScore = await redis.hget(locationScoresHash, username);
    const updatedScore = currentScore ? parseInt(currentScore) + score : score;

    await redis.hset(locationScoresHash, username, updatedScore.toString());
  }
};

const removeMarks = async (location: Location) => {
  const locationHash = buildLocationHash(location.id.toString());
  const locationMarksHash = `${locationHash}:${MARKS_HASH_KEY}`;
  await redis.del(locationMarksHash);

  const locationPlayersHash = `${locationHash}:${PLAYERS_HASH_KEY}`;
  const allPlayers = await redis.smembers(locationPlayersHash);

  for (const playerId of allPlayers) {
    const userHash = buildUserHash(playerId);
    await redis.hdel(userHash, LAST_MARK_HASH_KEY);
  }
};

const handleFlow = async (location: Location, song: Song) => {
  // Both onset and duration is specified in seconds
  const { onset, bpm, duration } = song;

  const msPerBeat = (60 * 1000) / bpm;

  const startTime = Date.now();

  // Wait for the onset
  await wait(onset * 1000);

  let combinationLength: number = location.minLevel;

  setNextCombination(location, combinationLength);

  while (true) {
    removeMarks(location);

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    if (elapsedSeconds >= duration) break;

    await wait(msPerBeat * 4); // Wait 4 counts

    removeCombination(location);

    await wait(msPerBeat * 6);

    setScores(location);

    await wait(msPerBeat * 4);

    setNextCombination(location, combinationLength);

    await wait(msPerBeat * 2);

    combinationLength++;
    if (combinationLength > location.maxLevel) {
      combinationLength = location.minLevel;
    }
  }

  removeCombination(location);
  removeScores(location);
};

export const runDanceFloor = async (location: Location) => {
  while (true) {
    const song = await getRandomSong();
    await setLocationSong(location, song);
    await handleFlow(location, song);
    // Wait for a few seconds before the next song
  }
};

import { Mark, PlayerStatus } from '../models.js';
import { redis } from '../network/storage.js';
import {
  buildLocationHash,
  buildUserHash,
  LAST_MARK_HASH_KEY,
  LOCATION_ID_HASH_KEY,
  MARKS_HASH_KEY,
  STATUS_HASH_KEY,
} from '../../../common/index.js';

export const changeStatus = async (userId: string, status: PlayerStatus) => {
  const userHash = buildUserHash(userId);
  await redis.hset(userHash, STATUS_HASH_KEY, status);
};

export const issueMark = async (userId: string, mark: Mark) => {
  const userHash = buildUserHash(userId);
  const locationId = await redis.hget(userHash, LOCATION_ID_HASH_KEY);

  if (locationId) {
    const locationHash = buildLocationHash(locationId);
    await redis.hset(`${locationHash}:${MARKS_HASH_KEY}`, userId, mark);
    await redis.hset(userHash, LAST_MARK_HASH_KEY, mark);
  } else {
    console.error('Cannot issue a mark for a player without locationId');
  }
};

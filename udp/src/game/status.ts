import { PlayerStatus } from '../models.js';
import { redis } from '../network/storage.js';
import { buildUserHash, STATUS_HASH_KEY } from '../../../common/index.js';

export const changeStatus = async (userId: string, status: PlayerStatus) => {
  const userHash = buildUserHash(userId);
  await redis.hset(userHash, STATUS_HASH_KEY, status);
};

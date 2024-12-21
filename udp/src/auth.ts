import { TBaseMessage } from './models.js';
import crypto from 'crypto';
import { SESSION_HASH_KEY, buildUserHash } from '../../common/models.js';
import { redis } from './network/storage.js';

const calculateHmac = (message: string, secretKey: string): string => {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
};

export const validateMessage = async (message: TBaseMessage) => {
  const secretKey = await redis.hget(
    buildUserHash(message.userId),
    SESSION_HASH_KEY
  );

  if (!secretKey) {
    throw Error('User is not logged in.');
  }

  const calculatedHmac = calculateHmac(
    JSON.stringify(message.contents),
    secretKey
  );

  return calculatedHmac === message.hmac;
};

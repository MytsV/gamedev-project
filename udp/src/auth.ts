import dotenv from 'dotenv';
import { default as Redis } from 'ioredis/built/Redis.js';
import { TBaseMessage } from './models.js';
import crypto from 'crypto';

dotenv.config();
const redis = new Redis.default(process.env.REDIS_URL!);

const calculateHmac = (message: string, secretKey: string): string => {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
};

export const validateMessage = async (message: TBaseMessage) => {
  const secretKey = await redis.hget('tokens', message.userId);

  if (!secretKey) {
    throw Error('User is not logged in.');
  }

  const calculatedHmac = calculateHmac(
    JSON.stringify(message.contents),
    secretKey
  );

  return calculatedHmac === message.hmac;
};

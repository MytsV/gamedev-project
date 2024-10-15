import dgram from 'dgram';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { default as Redis } from 'ioredis';

dotenv.config();
const redis = new Redis.default(process.env.REDIS_URL!);

const server = dgram.createSocket('udp4');

const calculateHmac = (message: string, secretKey: string): string => {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
};

server.on('message', async (msg, rinfo) => {
  try {
    // TODO: find a different way to serialize it?
    const data = JSON.parse(msg.toString()) as {
      user_id: string;
      message: string;
      hmac: string;
    };

    const { user_id, message, hmac } = data;

    const secretKey = await redis.hget('tokens', user_id);

    if (!secretKey) {
      console.log('User is not logged in.');
      return;
    }

    const calculatedHmac = calculateHmac(message, secretKey);

    if (calculatedHmac === hmac) {
      console.log(`Valid message from user_id: ${user_id}: ${message}`);
    } else {
      console.log(`Invalid HMAC for user_id: ${user_id}. Message: ${message}`);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

const PORT = parseInt(process.env.PORT!);
server.bind(PORT, () => {
  console.log(`UDP server is listening on port ${PORT}`);
});

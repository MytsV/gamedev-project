import dotenv from 'dotenv';
import { default as Redis } from 'ioredis/built/Redis.js';
import { PrismaClient } from '@prisma/client';

dotenv.config();
export const redis = new Redis.default(process.env.REDIS_URL!);
export const prisma = new PrismaClient();

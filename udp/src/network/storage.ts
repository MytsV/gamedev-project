import dotenv from "dotenv";
import {default as Redis} from "ioredis/built/Redis.js";

dotenv.config();
export const redis = new Redis.default(process.env.REDIS_URL!);
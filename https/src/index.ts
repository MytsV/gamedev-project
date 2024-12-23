import { Prisma, PrismaClient, User } from '@prisma/client';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { default as Redis } from 'ioredis';
import {
  SESSION_HASH_KEY,
  buildUserHash,
  USERNAME_HASH_KEY,
} from '../../common/models.js';

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const redis = new Redis.default(process.env.REDIS_URL!);

app.use(express.json());

app.post('/register', async (req: Request, res: Response) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    res.status(400).send('Username, password, and email are required');
    return;
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
    });

    res.status(201).send(`Successfully created the user ${username}`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint failed
        res.status(409).send('Username or email already exists');
        return;
      }
    }
    res.status(500).send('Internal Server Error');
  }
});

const TOKEN_LENGTH = 32;

const generateSessionToken = () => {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

app.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).send('Username and password are required');
    return;
  }

  try {
    const user: User = (await prisma.user.findUnique({
      where: { username },
    })) as User;

    if (!user) {
      res.status(401).send('Invalid username or password');
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).send('Invalid username or password');
      return;
    }

    const token = generateSessionToken();
    // TODO: use set instead to allow handling expiry
    const userHash = buildUserHash(user.id.toString());
    await redis.hset(userHash, SESSION_HASH_KEY, token);
    await redis.hset(userHash, USERNAME_HASH_KEY, username);

    res.status(200).json({ token, userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

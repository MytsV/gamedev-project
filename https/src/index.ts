import { Prisma, PrismaClient, User } from '@prisma/client';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.post('/register', async (req: Request, res: Response) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    res.status(400).send('Username, password, and email are required');
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

    const isPasswordValid = await bcrypt.compare(
      password,
      await user.passwordHash
    );
    if (!isPasswordValid) {
      res.status(401).send('Invalid username or password');
      return;
    }

    res.status(200).send(`Welcome back, ${username}!`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

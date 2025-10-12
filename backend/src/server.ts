import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './db';
import users from './routes/users';
import sessions from './routes/sessions';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// DB health
app.get('/health/db', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// API
app.use('/api/users', users);
app.use('/api/sessions', sessions);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API listening on :${port}`));

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './db';

// Routers
import users from './routes/users';
import sessions from './routes/sessions';                 // ✅ AUTH LOGIN (correct file)
import interviewSessions from './routes/interview-sessions'; // ✅ interview sessions
import interviews from './routes/interviews';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health
app.get('/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// API
app.use('/api/users', users);
app.use('/api/sessions', sessions);                          // ✅ login
app.use('/api/interview-sessions', interviewSessions);       // ✅ fixed path
app.use('/api/interviews', interviews);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

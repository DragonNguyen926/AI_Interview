import { Router } from 'express';
import { prisma } from '../db';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = Router();

// Create a new interview session for the logged-in user
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const session = await prisma.interviewSession.create({
    data: { candidateId: req.user!.id }
  });
  res.status(201).json({ id: session.id });
});

// List my sessions
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const sessions = await prisma.interviewSession.findMany({
    where: { candidateId: req.user!.id },
    orderBy: { createdAt: 'desc' }
  });
  res.json(sessions);
});

// Get one session (owner or ADMIN)
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const s = await prisma.interviewSession.findUnique({
    where: { id: req.params.id },
    include: {
      candidate: { select: { id: true, email: true, firstName: true } },
      questions: { select: { id: true, ordinal: true, text: true } },
      answers: true
    }
  });
  if (!s) return res.status(404).json({ error: 'session not found' });
  if (req.user!.role !== 'ADMIN' && s.candidateId !== req.user!.id) {
    return res.status(403).json({ error: 'forbidden' });
  }
  res.json(s);
});

// Helper: list questions for a session (owner or ADMIN)
router.get('/:id/questions', requireAuth, async (req: AuthedRequest, res) => {
  const s = await prisma.interviewSession.findUnique({ where: { id: req.params.id } });
  if (!s) return res.status(404).json({ error: 'session not found' });
  if (req.user!.role !== 'ADMIN' && s.candidateId !== req.user!.id) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const qs = await prisma.question.findMany({
    where: { sessionId: req.params.id },
    select: { id: true, ordinal: true, text: true },
    orderBy: { ordinal: 'asc' }
  });
  res.json(qs);
});

// Add questions (owner only)
const AddQuestions = z.object({
  questions: z.array(z.object({
    ordinal: z.number().int().min(1),
    text: z.string().min(3)
  })).min(1)
});
router.post('/:id/questions', requireAuth, async (req: AuthedRequest, res) => {
  const session = await prisma.interviewSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: 'session not found' });
  if (session.candidateId !== req.user!.id) return res.status(403).json({ error: 'forbidden' });

  const { questions } = AddQuestions.parse(req.body ?? {});
  const created = await prisma.$transaction(questions.map(q =>
    prisma.question.create({ data: { sessionId: session.id, ordinal: q.ordinal, text: q.text } })
  ));
  res.status(201).json({ count: created.length });
});

// Add an answer (owner only)
const AddAnswer = z.object({
  questionId: z.string().uuid(),
  transcript: z.string().min(1),
  aiJson: z.any().optional()
});
router.post('/:id/answers', requireAuth, async (req: AuthedRequest, res) => {
  const session = await prisma.interviewSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: 'session not found' });
  if (session.candidateId !== req.user!.id) return res.status(403).json({ error: 'forbidden' });

  const { questionId, transcript, aiJson } = AddAnswer.parse(req.body ?? {});
  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!q || q.sessionId !== session.id) {
    return res.status(400).json({ error: 'question does not belong to session' });
  }
  const ans = await prisma.answer.create({ data: { sessionId: session.id, questionId, transcript, aiJson } });
  res.status(201).json({ id: ans.id });
});

// Summary (owner or ADMIN)
router.get('/:id/summary', requireAuth, async (req: AuthedRequest, res) => {
  const s = await prisma.interviewSession.findUnique({
    where: { id: req.params.id },
    include: {
      candidate: { select: { id: true, email: true, firstName: true } },
      questions: true,
      answers: true,
      feedbacks: true
    }
  });
  if (!s) return res.status(404).json({ error: 'session not found' });
  if (req.user!.role !== 'ADMIN' && s.candidateId !== req.user!.id) {
    return res.status(403).json({ error: 'forbidden' });
  }

  res.json({
    sessionId: s.id,
    candidate: s.candidate,
    questions: s.questions.length,
    answers: s.answers.length,
    feedbackCount: s.feedbacks.length
  });
});

export default router;

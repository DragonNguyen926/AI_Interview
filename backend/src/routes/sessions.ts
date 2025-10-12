import { Router } from 'express';
import { prisma } from '../db';
import { z } from 'zod';

const router = Router();

// 1) Create a new interview session for a candidate (by userId)
const CreateSession = z.object({ candidateId: z.string().uuid() });
router.post('/', async (req, res) => {
  try {
    const { candidateId } = CreateSession.parse(req.body ?? {});
    // ensure candidate exists
    const exists = await prisma.user.findUnique({ where: { id: candidateId } });
    if (!exists) return res.status(404).json({ error: 'candidate not found' });

    const session = await prisma.interviewSession.create({
      data: { candidateId }
    });
    res.status(201).json({ id: session.id });
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'internal error' });
  }
});

// 2) Add questions (array) to a session
const AddQuestions = z.object({
  questions: z.array(z.object({
    ordinal: z.number().int().min(1),
    text: z.string().min(3)
  })).min(1)
});
router.post('/:id/questions', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { questions } = AddQuestions.parse(req.body ?? {});
    const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: 'session not found' });

    const created = await prisma.$transaction(questions.map(q =>
      prisma.question.create({ data: { sessionId, ordinal: q.ordinal, text: q.text } })
    ));
    res.status(201).json({ count: created.length });
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'internal error' });
  }
});

// 3) Add an answer (transcript) to a question
const AddAnswer = z.object({
  questionId: z.string().uuid(),
  transcript: z.string().min(1),
  aiJson: z.any().optional()
});
router.post('/:id/answers', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { questionId, transcript, aiJson } = AddAnswer.parse(req.body ?? {});
    const [session, question] = await Promise.all([
      prisma.interviewSession.findUnique({ where: { id: sessionId } }),
      prisma.question.findUnique({ where: { id: questionId } })
    ]);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (!question || question.sessionId !== sessionId) {
      return res.status(400).json({ error: 'question does not belong to session' });
    }

    const ans = await prisma.answer.create({
      data: { sessionId, questionId, transcript, aiJson }
    });
    res.status(201).json({ id: ans.id });
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'internal error' });
  }
});

// 4) Get session summary (placeholder: aggregates answers count; later add AI rubric)
router.get('/:id/summary', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        candidate: { select: { id: true, email: true, firstName: true } },
        questions: true,
        answers: true,
        feedbacks: true
      }
    });
    if (!session) return res.status(404).json({ error: 'session not found' });

    res.json({
      sessionId,
      candidate: session.candidate,
      questions: session.questions.length,
      answers: session.answers.length,
      feedbackCount: session.feedbacks.length
    });
  } catch (e) {
    res.status(500).json({ error: 'internal error' });
  }
});

export default router;

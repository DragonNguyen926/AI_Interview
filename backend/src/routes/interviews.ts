import { Router } from "express";
import { prisma } from "../db";
import type { Request, Response } from "express";

const router = Router();

// TODO: add your auth middleware if you have it, e.g. requireAuth

router.post("/", /* requireAuth, */ async (req: Request, res: Response) => {
  const { title, userId } = req.body; // or use req.user.id if you have JWT auth
  if (!title) return res.status(400).json({ error: "title is required" });
  if (!userId) return res.status(400).json({ error: "userId is required (or use auth)" });

  const session = await prisma.interviewSession.create({ data: { title, userId } });
  res.status(201).json(session);
});

router.get("/", /* requireAuth, */ async (req: Request, res: Response) => {
  const { userId } = req.query; // or req.user.id
  if (!userId) return res.status(400).json({ error: "userId is required (or use auth)" });

  const sessions = await prisma.interviewSession.findMany({
    where: { userId: String(userId) },
    orderBy: { startedAt: "desc" }
  });
  res.json(sessions);
});

export default router;

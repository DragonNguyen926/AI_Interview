import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

/**
 * Create a session for the logged-in user
 * Uses candidateId (from JWT), no title
 */
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const session = await prisma.interviewSession.create({
    data: { candidateId: req.user!.id } // ✅ matches schema
  });
  res.status(201).json(session);
});

/**
 * List MY sessions
 */
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const sessions = await prisma.interviewSession.findMany({
    where: { candidateId: req.user!.id }, // ✅ matches schema
    orderBy: { createdAt: "desc" }        // or startedAt if you prefer
  });
  res.json(sessions);
});

export default router;

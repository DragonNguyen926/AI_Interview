import { Router } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const router = Router();

const SignUp = z.object({
  email: z.string().email().regex(/@csub\.edu$/i, 'email must end with @csub.edu'),
  password: z.string().regex(/(?=.*[a-z])(?=.*[A-Z]).{8,}/, 'weak password'),
  firstName: z.string().min(2, 'first name required'),
  lastName: z.string().optional(),
  role: z.enum(['ADMIN','INTERVIEWER','CANDIDATE']).optional()
});

router.post('/', async (req, res) => {
  try {
    const data = SignUp.parse(req.body ?? {});
    const hash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? 'CANDIDATE'
      },
      select: { id: true }
    });

    res.status(201).json(user);
  } catch (e: any) {
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors });
    if (e?.code === 'P2002') return res.status(409).json({ error: 'email already exists' });
    res.status(500).json({ error: 'internal error' });
  }
});

export default router;

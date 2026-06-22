import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  const { userId } = req.query;
  try {
    const sessions = await prisma.workoutSession.findMany({
      where: userId ? { userId: String(userId) } : undefined,
      orderBy: { startedAt: 'desc' },
    });
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.post('/', async (req, res) => {
  const { userId, workoutId, status, startedAt, completedAt, durationSec } = req.body;
  if (!userId || !workoutId || !status) {
    return res.status(400).json({ error: 'userId, workoutId, and status are required' });
  }
  try {
    const session = await prisma.workoutSession.create({
      data: {
        userId,
        workoutId,
        status,
        startedAt: startedAt ? new Date(startedAt) : null,
        completedAt: completedAt ? new Date(completedAt) : null,
        durationSec,
      },
    });
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

export default router;

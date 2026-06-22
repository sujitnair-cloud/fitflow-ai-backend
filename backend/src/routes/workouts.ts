import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      include: {
        intervals: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(workouts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, category, description, intervals } = req.body;

    if (!title || !category || !Array.isArray(intervals) || intervals.length === 0) {
      return res.status(400).json({ error: 'title, category, and a non-empty intervals array are required' });
    }

    const workout = await prisma.workout.create({
      data: {
        title,
        category,
        description: description ?? null,
        intervals: {
          create: intervals.map((i: { label: string; durationSec: number; type: string; order: number; roundGroup: number }) => ({
            label: i.label,
            durationSec: i.durationSec,
            type: i.type,
            order: i.order,
            roundGroup: i.roundGroup ?? 1,
          })),
        },
      },
      include: {
        intervals: { orderBy: { order: 'asc' } },
      },
    });

    res.status(201).json(workout);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const workout = await prisma.workout.findUnique({
      where: { id: req.params.id },
      include: {
        intervals: {
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!workout) return res.status(404).json({ error: 'Workout not found' });
    res.json(workout);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

export default router;

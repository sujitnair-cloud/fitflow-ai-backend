import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/profile — returns user + profile for the authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true } }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user, profile });
});

// PUT /api/profile — updates name and/or profile fields
router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const {
    name,
    age,
    heightCm,
    weightKg,
    fitnessLevel,
    goal,
    mode,
    parqCleared,
    onboardingComplete,
  } = req.body;

  if (name !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { name } });
  }

  const profileData: Record<string, unknown> = {};
  if (age !== undefined) profileData.age = age;
  if (heightCm !== undefined) profileData.heightCm = heightCm;
  if (weightKg !== undefined) profileData.weightKg = weightKg;
  if (fitnessLevel !== undefined) profileData.fitnessLevel = fitnessLevel;
  if (goal !== undefined) profileData.goal = goal;
  if (mode !== undefined) profileData.mode = mode;
  if (parqCleared !== undefined) profileData.parqCleared = parqCleared;
  if (onboardingComplete !== undefined) profileData.onboardingComplete = onboardingComplete;

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: profileData,
    create: { userId, ...profileData },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  return res.json({ user, profile });
});

export default router;

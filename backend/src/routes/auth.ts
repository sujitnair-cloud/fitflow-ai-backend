import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { JWT_SECRET } from '../middleware/auth';

const router = Router();

// POST /api/auth/request-otp
// Generates a 6-digit OTP, stores hashed, returns plaintext in dev mode
router.post('/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }
  const normalized = email.toLowerCase().trim();

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const hash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any pending OTPs for this email
  await prisma.otpToken.updateMany({
    where: { email: normalized, used: false },
    data: { used: true },
  });

  await prisma.otpToken.create({
    data: { email: normalized, token: hash, expiresAt },
  });

  console.log(`[FitFlow] OTP for ${normalized}: ${otp}`);

  // In production: send email with otp (integrate SendGrid / SES here)
  const devPayload = process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {};

  return res.json({ message: 'Code sent to your email', ...devPayload });
});

// POST /api/auth/verify-otp
// Validates the OTP, creates user if new, returns JWT
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and code are required' });
  }
  const normalized = email.toLowerCase().trim();

  const record = await prisma.otpToken.findFirst({
    where: { email: normalized, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return res.status(400).json({ error: 'Code expired or not found. Request a new one.' });
  }

  const valid = await bcrypt.compare(String(otp), record.token);
  if (!valid) {
    return res.status(400).json({ error: 'Incorrect code. Please try again.' });
  }

  await prisma.otpToken.update({ where: { id: record.id }, data: { used: true } });

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: normalized } });
  const isNew = !user;
  if (!user) {
    user = await prisma.user.create({ data: { email: normalized } });
  }

  // Ensure profile row exists
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' },
  );

  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    isNew,
  });
});

export default router;

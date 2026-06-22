import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding workouts...');

  await prisma.workoutInterval.deleteMany();
  await prisma.workout.deleteMany();

  // 1 — Beginner Fat Loss (HIIT)
  const begFatLoss = await prisma.workout.create({
    data: {
      title: 'Beginner Fat Loss',
      category: 'hiit',
      description: '20-minute HIIT designed for beginners targeting fat loss.',
    },
  });
  const bflIntervals = [
    { label: 'Warm Up March', durationSec: 60, type: 'work', order: 1 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 2 },
    { label: 'Jumping Jacks', durationSec: 30, type: 'work', order: 3 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 4 },
    { label: 'Bodyweight Squats', durationSec: 30, type: 'work', order: 5 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 6 },
    { label: 'Push Ups', durationSec: 30, type: 'work', order: 7 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 8 },
    { label: 'High Knees', durationSec: 30, type: 'work', order: 9 },
    { label: 'Rest', durationSec: 30, type: 'rest', order: 10 },
    { label: 'Jumping Jacks', durationSec: 30, type: 'work', order: 11 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 12 },
    { label: 'Bodyweight Squats', durationSec: 30, type: 'work', order: 13 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 14 },
    { label: 'Push Ups', durationSec: 30, type: 'work', order: 15 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 16 },
    { label: 'High Knees', durationSec: 30, type: 'work', order: 17 },
    { label: 'Cool Down Stretch', durationSec: 60, type: 'rest', order: 18 },
  ];
  for (const i of bflIntervals) {
    await prisma.workoutInterval.create({ data: { ...i, workoutId: begFatLoss.id, roundGroup: 1 } });
  }

  // 2 — Walk-Jog Starter
  const walkJog = await prisma.workout.create({
    data: {
      title: 'Walk-Jog Starter',
      category: 'walk_jog',
      description: '10-round walk/jog intervals for building cardio base.',
    },
  });
  for (let round = 1; round <= 10; round++) {
    await prisma.workoutInterval.create({
      data: {
        workoutId: walkJog.id,
        order: (round - 1) * 2 + 1,
        label: 'Jog',
        durationSec: 60,
        type: 'work',
        roundGroup: round,
      },
    });
    await prisma.workoutInterval.create({
      data: {
        workoutId: walkJog.id,
        order: (round - 1) * 2 + 2,
        label: 'Walk',
        durationSec: 90,
        type: 'rest',
        roundGroup: round,
      },
    });
  }

  // 3 — Senior Chair Mobility
  const seniorChair = await prisma.workout.create({
    data: {
      title: 'Senior Chair Mobility',
      category: 'senior',
      description: 'Gentle seated mobility exercises designed for seniors.',
    },
  });
  const scIntervals = [
    { label: 'Seated March', durationSec: 45, type: 'work', order: 1 },
    { label: 'Rest & Breathe', durationSec: 30, type: 'rest', order: 2 },
    { label: 'Arm Circles', durationSec: 45, type: 'work', order: 3 },
    { label: 'Rest & Breathe', durationSec: 30, type: 'rest', order: 4 },
    { label: 'Ankle Rotations', durationSec: 45, type: 'work', order: 5 },
    { label: 'Rest & Breathe', durationSec: 30, type: 'rest', order: 6 },
    { label: 'Seated Leg Raises', durationSec: 45, type: 'work', order: 7 },
    { label: 'Rest & Breathe', durationSec: 30, type: 'rest', order: 8 },
    { label: 'Shoulder Rolls', durationSec: 45, type: 'work', order: 9 },
    { label: 'Rest & Breathe', durationSec: 30, type: 'rest', order: 10 },
    { label: 'Neck Stretches', durationSec: 45, type: 'work', order: 11 },
    { label: 'Final Rest', durationSec: 60, type: 'rest', order: 12 },
  ];
  for (const i of scIntervals) {
    await prisma.workoutInterval.create({ data: { ...i, workoutId: seniorChair.id, roundGroup: 1 } });
  }

  // 4 — Strength Builder
  const strength = await prisma.workout.create({
    data: {
      title: 'Strength Builder',
      category: 'strength',
      description: '3-round strength circuit using bodyweight and dumbbells.',
    },
  });
  const strengthExercises = [
    'Goblet Squats',
    'Push Ups',
    'Dumbbell Rows',
    'Lunges',
    'Shoulder Press',
    'Plank Hold',
  ];
  let sOrder = 1;
  for (let round = 1; round <= 3; round++) {
    for (const ex of strengthExercises) {
      await prisma.workoutInterval.create({
        data: {
          workoutId: strength.id,
          order: sOrder++,
          label: ex,
          durationSec: 40,
          type: 'work',
          roundGroup: round,
        },
      });
      await prisma.workoutInterval.create({
        data: {
          workoutId: strength.id,
          order: sOrder++,
          label: 'Rest',
          durationSec: 20,
          type: 'rest',
          roundGroup: round,
        },
      });
    }
    if (round < 3) {
      await prisma.workoutInterval.create({
        data: {
          workoutId: strength.id,
          order: sOrder++,
          label: 'Round Rest',
          durationSec: 60,
          type: 'rest',
          roundGroup: round,
        },
      });
    }
  }

  // 5 — Stretch Flow
  const stretch = await prisma.workout.create({
    data: {
      title: 'Stretch Flow',
      category: 'mobility',
      description: 'Full-body stretch and mobility flow for recovery days.',
    },
  });
  const stretchIntervals = [
    { label: 'Cat-Cow Stretch', durationSec: 60, type: 'work', order: 1 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 2 },
    { label: 'Child\'s Pose', durationSec: 60, type: 'work', order: 3 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 4 },
    { label: 'Hip Flexor Stretch Left', durationSec: 45, type: 'work', order: 5 },
    { label: 'Switch Sides', durationSec: 10, type: 'rest', order: 6 },
    { label: 'Hip Flexor Stretch Right', durationSec: 45, type: 'work', order: 7 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 8 },
    { label: 'Hamstring Stretch Left', durationSec: 45, type: 'work', order: 9 },
    { label: 'Switch Sides', durationSec: 10, type: 'rest', order: 10 },
    { label: 'Hamstring Stretch Right', durationSec: 45, type: 'work', order: 11 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 12 },
    { label: 'Shoulder Cross Stretch', durationSec: 45, type: 'work', order: 13 },
    { label: 'Rest', durationSec: 15, type: 'rest', order: 14 },
    { label: 'Spinal Twist Left', durationSec: 45, type: 'work', order: 15 },
    { label: 'Switch Sides', durationSec: 10, type: 'rest', order: 16 },
    { label: 'Spinal Twist Right', durationSec: 45, type: 'work', order: 17 },
    { label: 'Savasana', durationSec: 60, type: 'rest', order: 18 },
  ];
  for (const i of stretchIntervals) {
    await prisma.workoutInterval.create({ data: { ...i, workoutId: stretch.id, roundGroup: 1 } });
  }

  console.log('Seeding complete. 5 workouts created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

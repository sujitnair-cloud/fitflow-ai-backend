import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import workoutsRouter from './routes/workouts';
import sessionsRouter from './routes/sessions';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);

app.listen(PORT, () => {
  console.log(`FitFlow AI backend running on http://localhost:${PORT}`);
});

export default app;

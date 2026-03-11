import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import authRoutes from './routes/auth';
import courseRoutes from './routes/course';
import enrollmentRoutes from './routes/enrollment';
import materialRoutes from './routes/material';

export const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.get('/api/ping', (req, res) => {
  res.json({ message: 'server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/course', courseRoutes);
app.use('/api/material', materialRoutes);
app.use('/api/enroll', enrollmentRoutes);

import { readFile } from 'fs/promises';
import { join } from 'path';

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

app.get('/api/ping', async (req, res) => {
  try {
    const commitInfoPath = join(process.cwd(), 'commit-info.json');
    let commitInfo = null;

    try {
      const data = await readFile(commitInfoPath, 'utf-8');
      commitInfo = JSON.parse(data);
    } catch {
      // commit-info.json not found or unreadable
      commitInfo = {
        commitHash: 'unknown',
        commitDate: 'unknown',
        buildTime: 'unknown',
      };
    }

    res.json({
      message: 'server is running',
      deployment: commitInfo,
    });
  } catch (error) {
    console.error('Error reading commit info:', error);
    res.json({
      message: 'server is running',
      deployment: {
        commitHash: 'unknown',
        commitDate: 'unknown',
        buildTime: 'unknown',
      },
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/course', courseRoutes);
app.use('/api/material', materialRoutes);
app.use('/api/enroll', enrollmentRoutes);

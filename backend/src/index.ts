import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';

app.listen(Number(process.env.PORT), '0.0.0.0', () => {
  console.info(`Server is running on port ${process.env.PORT}`);
});

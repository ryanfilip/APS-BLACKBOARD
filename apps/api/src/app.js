import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler } from './interfaces/http/middlewares/errorHandler.js';
import routes from './interfaces/http/routes/index.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api', routes);

app.use(errorHandler);

export default app;

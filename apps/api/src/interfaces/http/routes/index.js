import { Router } from 'express';
import authRoutes from './authRoutes.js';
import diagnosisRoutes from './diagnosisRoutes.js';
import incidentRoutes from './incidentRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/incidents', incidentRoutes);
router.use('/incidents', diagnosisRoutes);

export default router;

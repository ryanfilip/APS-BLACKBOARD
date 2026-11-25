import { Router } from 'express';
import { GetDiagnosis } from '../../../application/use-cases/diagnosis/GetDiagnosis.js';
import { ReviewHypothesis } from '../../../application/use-cases/diagnosis/ReviewHypothesis.js';
import { RunDiagnosis } from '../../../application/use-cases/diagnosis/RunDiagnosis.js';
import { PrismaDiagnosisRepository } from '../../../infra/database/repositories/PrismaDiagnosisRepository.js';
import { PrismaIncidentRepository } from '../../../infra/database/repositories/PrismaIncidentRepository.js';
import { PrismaUserRepository } from '../../../infra/database/repositories/PrismaUserRepository.js';
import { DiagnosisController } from '../controllers/DiagnosisController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';

// Composição das dependências (injeção manual): portas -> implementações de infra.
const incidentRepository = new PrismaIncidentRepository();
const diagnosisRepository = new PrismaDiagnosisRepository();
const userRepository = new PrismaUserRepository();

const controller = new DiagnosisController({
  runDiagnosis: new RunDiagnosis({ incidentRepository, diagnosisRepository }),
  getDiagnosis: new GetDiagnosis({ incidentRepository, diagnosisRepository }),
  reviewHypothesis: new ReviewHypothesis({ incidentRepository, diagnosisRepository, userRepository }),
});

const router = Router();

// Montado em /incidents (ver routes/index.js).
router.post('/:id/diagnose', authMiddleware, controller.run);
router.get('/:id/diagnosis', authMiddleware, controller.get);
router.patch(
  '/:id/diagnoses/:diagnosisId/hypotheses/:hypothesisId',
  authMiddleware,
  requireRole('TECH', 'ADMIN'),
  controller.review,
);

export default router;

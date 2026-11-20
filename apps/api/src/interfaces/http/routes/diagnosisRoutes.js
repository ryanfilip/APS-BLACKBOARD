import { Router } from 'express';
import { GetDiagnosis } from '../../../application/use-cases/diagnosis/GetDiagnosis.js';
import { RunDiagnosis } from '../../../application/use-cases/diagnosis/RunDiagnosis.js';
import { PrismaDiagnosisRepository } from '../../../infra/database/repositories/PrismaDiagnosisRepository.js';
import { PrismaIncidentRepository } from '../../../infra/database/repositories/PrismaIncidentRepository.js';
import { DiagnosisController } from '../controllers/DiagnosisController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

// Composição das dependências (injeção manual): portas -> implementações de infra.
const incidentRepository = new PrismaIncidentRepository();
const diagnosisRepository = new PrismaDiagnosisRepository();

const controller = new DiagnosisController({
  runDiagnosis: new RunDiagnosis({ incidentRepository, diagnosisRepository }),
  getDiagnosis: new GetDiagnosis({ incidentRepository, diagnosisRepository }),
});

const router = Router();

// Montado em /incidents (ver routes/index.js).
router.post('/:id/diagnose', authMiddleware, controller.run);
router.get('/:id/diagnosis', authMiddleware, controller.get);

export default router;

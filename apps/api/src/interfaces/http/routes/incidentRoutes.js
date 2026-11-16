import { Router } from 'express';
import { CreateIncident } from '../../../application/use-cases/incidents/CreateIncident.js';
import { GetIncident } from '../../../application/use-cases/incidents/GetIncident.js';
import { ListIncidents } from '../../../application/use-cases/incidents/ListIncidents.js';
import { PrismaIncidentRepository } from '../../../infra/database/repositories/PrismaIncidentRepository.js';
import { IncidentController } from '../controllers/IncidentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

// Composição das dependências (injeção manual): portas -> implementações de infra.
const incidentRepository = new PrismaIncidentRepository();

const controller = new IncidentController({
  createIncident: new CreateIncident({ incidentRepository }),
  listIncidents: new ListIncidents({ incidentRepository }),
  getIncident: new GetIncident({ incidentRepository }),
});

const router = Router();

// Todas as rotas de incidentes exigem autenticação.
router.use(authMiddleware);

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);

export default router;

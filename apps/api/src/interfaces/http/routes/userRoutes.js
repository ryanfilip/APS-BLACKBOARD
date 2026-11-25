import { Router } from 'express';
import { ChangeUserRole } from '../../../application/use-cases/users/ChangeUserRole.js';
import { ListUsers } from '../../../application/use-cases/users/ListUsers.js';
import { PrismaUserRepository } from '../../../infra/database/repositories/PrismaUserRepository.js';
import { UserController } from '../controllers/UserController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';

// Composição das dependências (injeção manual): portas -> implementações de infra.
const userRepository = new PrismaUserRepository();

const controller = new UserController({
  listUsers: new ListUsers({ userRepository }),
  changeUserRole: new ChangeUserRole({ userRepository }),
});

const router = Router();

// Administração de usuários: somente ADMIN.
router.use(authMiddleware, requireRole('ADMIN'));

router.get('/', controller.list);
router.patch('/:id/role', controller.changeRole);

export default router;

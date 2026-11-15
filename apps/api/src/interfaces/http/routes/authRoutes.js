import { Router } from 'express';
import { GetCurrentUser } from '../../../application/use-cases/auth/GetCurrentUser.js';
import { LoginUser } from '../../../application/use-cases/auth/LoginUser.js';
import { RegisterUser } from '../../../application/use-cases/auth/RegisterUser.js';
import { PrismaUserRepository } from '../../../infra/database/repositories/PrismaUserRepository.js';
import { BcryptHashService } from '../../../infra/security/BcryptHashService.js';
import { jwtTokenService } from '../../../infra/security/JwtTokenService.js';
import { AuthController } from '../controllers/AuthController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

// Composição das dependências (injeção manual): portas -> implementações de infra.
const userRepository = new PrismaUserRepository();
const hashService = new BcryptHashService();
const tokenService = jwtTokenService;

const controller = new AuthController({
  registerUser: new RegisterUser({ userRepository, hashService, tokenService }),
  loginUser: new LoginUser({ userRepository, hashService, tokenService }),
  getCurrentUser: new GetCurrentUser({ userRepository }),
});

const router = Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', authMiddleware, controller.me);

export default router;

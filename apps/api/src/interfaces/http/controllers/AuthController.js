import { handleDomainError } from '../middlewares/handleDomainError.js';
import { loginSchema, registerSchema } from '../validators/authValidators.js';

/**
 * Controller fino: valida a entrada, chama o caso de uso e traduz erros em status HTTP.
 * Nenhuma regra de negócio vive aqui.
 */
export class AuthController {
  constructor({ registerUser, loginUser, getCurrentUser }) {
    this.registerUser = registerUser;
    this.loginUser = loginUser;
    this.getCurrentUser = getCurrentUser;
  }

  register = async (req, res, next) => {
    try {
      const input = registerSchema.parse(req.body ?? {});
      const result = await this.registerUser.execute(input);
      return res.status(201).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  login = async (req, res, next) => {
    try {
      const input = loginSchema.parse(req.body ?? {});
      const result = await this.loginUser.execute(input);
      return res.status(200).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };

  me = async (req, res, next) => {
    try {
      const result = await this.getCurrentUser.execute({ userId: req.user.id });
      return res.status(200).json(result);
    } catch (error) {
      return handleDomainError(error, res, next);
    }
  };
}

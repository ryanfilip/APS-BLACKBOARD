import { ZodError } from 'zod';
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  ValidationError,
} from '../../../domain/errors/DomainErrors.js';
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
      return this.#handleError(error, res, next);
    }
  };

  login = async (req, res, next) => {
    try {
      const input = loginSchema.parse(req.body ?? {});
      const result = await this.loginUser.execute(input);
      return res.status(200).json(result);
    } catch (error) {
      return this.#handleError(error, res, next);
    }
  };

  me = async (req, res, next) => {
    try {
      const result = await this.getCurrentUser.execute({ userId: req.user.id });
      return res.status(200).json(result);
    } catch (error) {
      return this.#handleError(error, res, next);
    }
  };

  #handleError(error, res, next) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: error.issues[0]?.message ?? 'Dados inválidos',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof EmailAlreadyExistsError) {
      return res.status(409).json({ error: error.message });
    }
    if (error instanceof InvalidCredentialsError) {
      return res.status(401).json({ error: error.message });
    }
    return next(error);
  }
}

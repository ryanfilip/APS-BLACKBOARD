import jwt from 'jsonwebtoken';
import { TokenService } from '../../application/ports/TokenService.js';
import { env } from '../../config/env.js';

export class JwtTokenService extends TokenService {
  sign(payload) {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  }

  /** Lança erro se o token for inválido ou estiver expirado. */
  verify(token) {
    return jwt.verify(token, env.JWT_SECRET);
  }
}

export const jwtTokenService = new JwtTokenService();

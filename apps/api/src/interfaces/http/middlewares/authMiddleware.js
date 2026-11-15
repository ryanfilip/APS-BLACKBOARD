import { jwtTokenService } from '../../../infra/security/JwtTokenService.js';

export function createAuthMiddleware(tokenService) {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Token de autenticação ausente' });
    }

    try {
      const payload = tokenService.verify(token);
      req.user = { id: payload.sub, role: payload.role, email: payload.email };
      return next();
    } catch {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  };
}

export const authMiddleware = createAuthMiddleware(jwtTokenService);
export default authMiddleware;

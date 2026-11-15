/** Uso: router.get('/x', authMiddleware, requireRole('ADMIN', 'TECH'), handler) */
export function requireRole(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado: permissão insuficiente' });
    }
    return next();
  };
}

export default requireRole;

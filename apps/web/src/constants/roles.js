export const ROLE_LABELS = {
  USER: 'Usuário',
  TECH: 'Técnico',
  ADMIN: 'Administrador',
};

/** TECH e ADMIN formam a equipe de suporte: veem e atendem os chamados de todos. */
export const isStaff = (role) => role === 'TECH' || role === 'ADMIN';

/**
 * Ações de status disponíveis para a equipe, espelhando a máquina de estados do backend
 * (domain/entities/Incident.js). O backend é quem valida de fato.
 */
export const STATUS_ACTIONS = {
  OPEN: [{ to: 'IN_PROGRESS', label: 'Assumir chamado' }],
  IN_PROGRESS: [
    { to: 'RESOLVED', label: 'Marcar como resolvido' },
    { to: 'OPEN', label: 'Devolver para a fila' },
  ],
  RESOLVED: [{ to: 'IN_PROGRESS', label: 'Reabrir chamado' }],
};

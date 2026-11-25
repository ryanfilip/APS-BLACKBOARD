import { z } from 'zod';

export const changeRoleSchema = z.object({
  role: z.enum(['USER', 'TECH', 'ADMIN'], {
    errorMap: () => ({ message: 'Papel inválido: use USER, TECH ou ADMIN' }),
  }),
});

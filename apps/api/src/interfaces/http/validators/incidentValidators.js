import { z } from 'zod';

export const createIncidentSchema = z.object({
  title: z
    .string({ required_error: 'O título é obrigatório' })
    .trim()
    .min(3, 'O título deve ter no mínimo 3 caracteres'),
  description: z
    .string({ required_error: 'A descrição é obrigatória' })
    .trim()
    .min(10, 'A descrição deve ter no mínimo 10 caracteres'),
  equipment: z
    .string({ required_error: 'O equipamento é obrigatório' })
    .trim()
    .min(2, 'O equipamento deve ter no mínimo 2 caracteres'),
});

export const changeStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED'], {
    errorMap: () => ({ message: 'Status inválido: use OPEN, IN_PROGRESS ou RESOLVED' }),
  }),
});

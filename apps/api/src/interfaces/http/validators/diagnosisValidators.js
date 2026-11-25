import { z } from 'zod';

export const reviewHypothesisSchema = z.object({
  status: z.enum(['OPEN', 'CONFIRMED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status inválido: use CONFIRMED, REJECTED ou OPEN' }),
  }),
});

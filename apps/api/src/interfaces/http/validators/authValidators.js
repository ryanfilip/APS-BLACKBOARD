import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'O nome é obrigatório' })
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres'),
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .trim()
    .email('E-mail inválido'),
  password: z
    .string({ required_error: 'A senha é obrigatória' })
    .min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .trim()
    .email('E-mail inválido'),
  password: z.string({ required_error: 'A senha é obrigatória' }).min(1, 'A senha é obrigatória'),
});

import { describe, expect, it, vi } from 'vitest';
import {
  DiagnosisNotFoundError,
  IncidentNotFoundError,
  ValidationError,
} from '../../../../domain/errors/DomainErrors.js';
import { DiagnosisController } from '../DiagnosisController.js';

const makeRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const makeReq = () => ({ params: { id: 'inc-1' }, user: { id: 'user-1', role: 'USER', email: 'a@a.com' } });

const build = ({ run, get } = {}) => {
  const runDiagnosis = { execute: run ?? vi.fn() };
  const getDiagnosis = { execute: get ?? vi.fn() };
  return { controller: new DiagnosisController({ runDiagnosis, getDiagnosis }), runDiagnosis, getDiagnosis };
};

const result = { diagnosis: { id: 'diag-1', incidentId: 'inc-1', iterations: 2 } };

describe('DiagnosisController', () => {
  describe('run', () => {
    it('chama o caso de uso com o id da URL e o usuário do token e responde 201', async () => {
      const { controller, runDiagnosis } = build({ run: vi.fn().mockResolvedValue(result) });
      const res = makeRes();
      const next = vi.fn();

      await controller.run(makeReq(), res, next);

      expect(runDiagnosis.execute).toHaveBeenCalledWith({ incidentId: 'inc-1', userId: 'user-1', role: 'USER' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(result);
      expect(next).not.toHaveBeenCalled();
    });

    it.each([
      ['IncidentNotFoundError', new IncidentNotFoundError(), 404, 'Incidente não encontrado'],
      ['ValidationError', new ValidationError('O usuário é obrigatório'), 400, 'O usuário é obrigatório'],
    ])('traduz %s em %i', async (_name, error, status, message) => {
      const { controller } = build({ run: vi.fn().mockRejectedValue(error) });
      const res = makeRes();

      await controller.run(makeReq(), res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith({ error: message });
    });

    it('repassa erros desconhecidos ao errorHandler via next', async () => {
      const failure = new Error('falha inesperada');
      const { controller } = build({ run: vi.fn().mockRejectedValue(failure) });
      const res = makeRes();
      const next = vi.fn();

      await controller.run(makeReq(), res, next);

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('chama o caso de uso com o id da URL e o usuário do token e responde 200', async () => {
      const { controller, getDiagnosis } = build({ get: vi.fn().mockResolvedValue(result) });
      const res = makeRes();

      await controller.get(makeReq(), res, vi.fn());

      expect(getDiagnosis.execute).toHaveBeenCalledWith({ incidentId: 'inc-1', userId: 'user-1', role: 'USER' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it.each([
      ['IncidentNotFoundError', new IncidentNotFoundError(), 'Incidente não encontrado'],
      ['DiagnosisNotFoundError', new DiagnosisNotFoundError(), 'Este incidente ainda não possui diagnóstico'],
    ])('traduz %s em 404 com mensagem em português', async (_name, error, message) => {
      const { controller } = build({ get: vi.fn().mockRejectedValue(error) });
      const res = makeRes();

      await controller.get(makeReq(), res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: message });
    });

    it('repassa erros desconhecidos via next', async () => {
      const failure = new Error('boom');
      const { controller } = build({ get: vi.fn().mockRejectedValue(failure) });
      const next = vi.fn();

      await controller.get(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith(failure);
    });
  });
});

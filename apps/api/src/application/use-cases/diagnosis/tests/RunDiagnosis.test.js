import { describe, expect, it, vi } from 'vitest';
import { Diagnosis } from '../../../../domain/entities/Diagnosis.js';
import { Incident } from '../../../../domain/entities/Incident.js';
import { IncidentNotFoundError, ValidationError } from '../../../../domain/errors/DomainErrors.js';
import { RunDiagnosis } from '../RunDiagnosis.js';

const makeIncident = (overrides = {}) =>
  new Incident({
    id: 'inc-1',
    title: 'Computador com problemas',
    description: 'Computador lento e sem internet',
    equipment: 'Desktop Dell',
    status: 'OPEN',
    userId: 'user-1',
    createdAt: new Date('2026-11-16T10:00:00Z'),
    updatedAt: new Date('2026-11-16T10:00:00Z'),
    ...overrides,
  });

// O repositório de incidentes só tem leitura.
const makeIncidentRepository = (incident) => ({ findById: vi.fn().mockResolvedValue(incident) });

// O repositório de diagnósticos devolve o que recebeu, já com id e data (como o banco faria).
const makeDiagnosisRepository = () => ({
  create: vi.fn(async (diagnosis) => new Diagnosis({ ...diagnosis, id: 'diag-1', createdAt: new Date('2026-11-20T10:00:00Z') })),
});

const build = ({ incident = makeIncident(), maxIterations } = {}) => {
  const incidentRepository = makeIncidentRepository(incident);
  const diagnosisRepository = makeDiagnosisRepository();
  const useCase = new RunDiagnosis({ incidentRepository, diagnosisRepository, maxIterations });
  return { useCase, incidentRepository, diagnosisRepository };
};

const run = (useCase) => useCase.execute({ incidentId: 'inc-1', userId: 'user-1' });
const sourcesOf = (state) => [...new Set(state.hypotheses.map((h) => h.source))];

describe('RunDiagnosis', () => {
  describe('persistência', () => {
    it('salva o resultado no repositório de diagnósticos', async () => {
      const { useCase, diagnosisRepository } = build();

      await run(useCase);

      expect(diagnosisRepository.create).toHaveBeenCalledTimes(1);
      const saved = diagnosisRepository.create.mock.calls[0][0];
      expect(saved).toMatchObject({ incidentId: 'inc-1', iterations: 2, finishedBy: 'NO_MORE_ACTIONS' });
      expect(saved.state.hypotheses).toHaveLength(4);
      expect(Object.keys(saved.state).sort()).toEqual(['evidences', 'facts', 'hypotheses', 'incident']);
    });

    it('devolve o diagnóstico salvo, incluindo o id, e o state é exatamente o que foi gravado', async () => {
      const { useCase, diagnosisRepository } = build();

      const { diagnosis } = await run(useCase);

      const saved = diagnosisRepository.create.mock.calls[0][0];
      expect(diagnosis).toEqual({
        id: 'diag-1',
        incidentId: 'inc-1',
        state: saved.state,
        iterations: 2,
        finishedBy: 'NO_MORE_ACTIONS',
        createdAt: new Date('2026-11-20T10:00:00Z'),
      });
    });

    it('não salva nada quando o incidente não é encontrado, é de outro usuário ou falta o userId', async () => {
      const notFound = build({ incident: null });
      await expect(run(notFound.useCase)).rejects.toBeInstanceOf(IncidentNotFoundError);

      const foreign = build({ incident: makeIncident({ userId: 'outro-usuario' }) });
      await expect(run(foreign.useCase)).rejects.toBeInstanceOf(IncidentNotFoundError);

      const noUser = build();
      await expect(noUser.useCase.execute({ incidentId: 'inc-1' })).rejects.toBeInstanceOf(ValidationError);
      expect(noUser.incidentRepository.findById).not.toHaveBeenCalled();

      for (const scenario of [notFound, foreign, noUser]) {
        expect(scenario.diagnosisRepository.create).not.toHaveBeenCalled();
      }
    });

    it('consulta o incidente já escopado pelo usuário', async () => {
      const { useCase, incidentRepository } = build();

      await run(useCase);

      expect(incidentRepository.findById).toHaveBeenCalledWith('inc-1', 'user-1');
    });

    it('propaga a falha do repositório ao salvar', async () => {
      const { useCase, diagnosisRepository } = build();
      diagnosisRepository.create.mockRejectedValue(new Error('banco indisponível'));

      await expect(run(useCase)).rejects.toThrow('banco indisponível');
    });
  });

  describe('integração com o motor de diagnóstico (múltiplos sintomas)', () => {
    it('"Computador lento e sem internet" gera hipóteses da KS1 (Hardware) e da KS2 (Network)', async () => {
      const { useCase } = build();

      const { diagnosis } = await run(useCase);

      const descriptionsBySource = (source) =>
        diagnosis.state.hypotheses.filter((h) => h.source === source).map((h) => h.description).sort();

      expect(diagnosis.finishedBy).toBe('NO_MORE_ACTIONS');
      expect(diagnosis.iterations).toBe(2);
      expect(sourcesOf(diagnosis.state).sort()).toEqual(['KS1_Hardware', 'KS2_Network']);
      expect(descriptionsBySource('KS1_Hardware')).toEqual([
        'Disco rígido com setores defeituosos',
        'Possível falha ou sobrecarga na memória RAM',
      ]);
      expect(descriptionsBySource('KS2_Network')).toEqual([
        'Falha na placa de rede ou driver',
        'Perda de pacotes na rede',
      ]);
    });

    it('o estado salvo traz o incidente como primeiro fato, evidências SUPPORTS e é serializável', async () => {
      const { useCase } = build();

      const { diagnosis } = await run(useCase);
      const { state } = diagnosis;

      expect(state.incident).toEqual({
        title: 'Computador com problemas',
        description: 'Computador lento e sem internet',
        equipment: 'Desktop Dell',
      });
      expect(state.facts).toHaveLength(1);
      expect(state.evidences.every((e) => e.polarity === 'SUPPORTS')).toBe(true);
      const hypothesisIds = new Set(state.hypotheses.map((h) => h.id));
      expect(state.evidences.every((e) => hypothesisIds.has(e.supports))).toBe(true);
      expect(state.hypotheses.every((h) => h.confidence >= 50 && h.confidence <= 90)).toBe(true);
      expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    });

    it('usa as 5 KS: um incidente com sintomas de todas as áreas termina em 5 iterações', async () => {
      const incident = makeIncident({
        description: 'Computador lento, sem internet, com tela azul, o Excel fechando e um pop-up de vírus',
      });
      const { useCase } = build({ incident });

      const { diagnosis } = await run(useCase);

      expect(diagnosis.iterations).toBe(5);
      expect(diagnosis.finishedBy).toBe('NO_MORE_ACTIONS');
      expect(sourcesOf(diagnosis.state).sort()).toEqual([
        'KS1_Hardware',
        'KS2_Network',
        'KS3_OperatingSystem',
        'KS4_Software',
        'KS5_Security',
      ]);
    });

    it('incidente sem sintomas conhecidos também é salvo (0 iterações, sem hipóteses)', async () => {
      const incident = makeIncident({ description: 'Preciso trocar a cadeira do escritório', equipment: 'Cadeira' });
      const { useCase, diagnosisRepository } = build({ incident });

      const { diagnosis } = await run(useCase);

      expect(diagnosis.iterations).toBe(0);
      expect(diagnosis.state.hypotheses).toEqual([]);
      expect(diagnosisRepository.create).toHaveBeenCalledTimes(1);
    });

    it('repassa o maxIterations ao Control Component e salva MAX_ITERATIONS_REACHED', async () => {
      const { useCase, diagnosisRepository } = build({ maxIterations: 1 });

      const { diagnosis } = await run(useCase);

      expect(diagnosis.iterations).toBe(1);
      expect(diagnosis.finishedBy).toBe('MAX_ITERATIONS_REACHED');
      expect(diagnosisRepository.create.mock.calls[0][0].finishedBy).toBe('MAX_ITERATIONS_REACHED');
    });

    it('cada execução usa um Blackboard novo', async () => {
      const { useCase } = build();

      const first = await run(useCase);
      const second = await run(useCase);

      expect(second.diagnosis.iterations).toBe(first.diagnosis.iterations);
      expect(second.diagnosis.state.hypotheses[0].id).not.toBe(first.diagnosis.state.hypotheses[0].id);
    });
  });
});

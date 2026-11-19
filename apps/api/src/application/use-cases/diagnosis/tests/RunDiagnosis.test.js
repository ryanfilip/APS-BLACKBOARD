import { describe, expect, it, vi } from 'vitest';
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

// O repositório só tem leitura: se o caso de uso tentasse salvar algo, o teste falharia.
const makeRepository = (incident) => ({ findById: vi.fn().mockResolvedValue(incident) });

const sourcesOf = (state) => [...new Set(state.hypotheses.map((h) => h.source))];

describe('RunDiagnosis', () => {
  describe('teste de integração: incidente com múltiplos sintomas', () => {
    it('"Computador lento e sem internet" gera hipóteses da KS1 (Hardware) e da KS2 (Network)', async () => {
      const incidentRepository = makeRepository(makeIncident());
      const useCase = new RunDiagnosis({ incidentRepository });

      const { state, iterations, finishedBy } = await useCase.execute({ incidentId: 'inc-1', userId: 'user-1' });

      expect(incidentRepository.findById).toHaveBeenCalledWith('inc-1', 'user-1');
      expect(finishedBy).toBe('NO_MORE_ACTIONS');
      expect(iterations).toBe(2);

      const descriptionsBySource = (source) =>
        state.hypotheses.filter((h) => h.source === source).map((h) => h.description).sort();

      expect(sourcesOf(state).sort()).toEqual(['KS1_Hardware', 'KS2_Network']);
      expect(descriptionsBySource('KS1_Hardware')).toEqual([
        'Disco rígido com setores defeituosos',
        'Possível falha ou sobrecarga na memória RAM',
      ]);
      expect(descriptionsBySource('KS2_Network')).toEqual([
        'Falha na placa de rede ou driver',
        'Perda de pacotes na rede',
      ]);
    });

    it('o estado final traz o incidente como primeiro fato, evidências SUPPORTS e é serializável', async () => {
      const useCase = new RunDiagnosis({ incidentRepository: makeRepository(makeIncident()) });

      const { state } = await useCase.execute({ incidentId: 'inc-1', userId: 'user-1' });

      expect(state.incident).toEqual({
        title: 'Computador com problemas',
        description: 'Computador lento e sem internet',
        equipment: 'Desktop Dell',
      });
      expect(state.facts).toHaveLength(1);
      expect(state.facts[0].description).toContain('Computador lento e sem internet');

      expect(state.evidences.length).toBeGreaterThanOrEqual(state.hypotheses.length);
      expect(state.evidences.every((e) => e.polarity === 'SUPPORTS')).toBe(true);
      const hypothesisIds = new Set(state.hypotheses.map((h) => h.id));
      expect(state.evidences.every((e) => hypothesisIds.has(e.supports))).toBe(true);
      expect(state.hypotheses.every((h) => h.confidence >= 50 && h.confidence <= 90)).toBe(true);

      expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    });
  });

  it('usa as 5 KS: um incidente com sintomas de todas as áreas termina em 5 iterações', async () => {
    const incident = makeIncident({
      description:
        'Computador lento, sem internet, com tela azul, o Excel fechando e um pop-up de vírus',
    });
    const useCase = new RunDiagnosis({ incidentRepository: makeRepository(incident) });

    const { state, iterations, finishedBy } = await useCase.execute({ incidentId: 'inc-1', userId: 'user-1' });

    expect(iterations).toBe(5);
    expect(finishedBy).toBe('NO_MORE_ACTIONS');
    expect(sourcesOf(state).sort()).toEqual([
      'KS1_Hardware',
      'KS2_Network',
      'KS3_OperatingSystem',
      'KS4_Software',
      'KS5_Security',
    ]);
  });

  it('incidente sem nenhum sintoma conhecido termina com 0 iterações e só o fato inicial', async () => {
    const incident = makeIncident({ description: 'Preciso trocar a cadeira do escritório', equipment: 'Cadeira' });
    const useCase = new RunDiagnosis({ incidentRepository: makeRepository(incident) });

    const result = await useCase.execute({ incidentId: 'inc-1', userId: 'user-1' });

    expect(result.iterations).toBe(0);
    expect(result.finishedBy).toBe('NO_MORE_ACTIONS');
    expect(result.state.hypotheses).toEqual([]);
    expect(result.state.facts).toHaveLength(1);
  });

  it('repassa o maxIterations ao Control Component', async () => {
    const useCase = new RunDiagnosis({ incidentRepository: makeRepository(makeIncident()), maxIterations: 1 });

    const result = await useCase.execute({ incidentId: 'inc-1', userId: 'user-1' });

    expect(result.iterations).toBe(1);
    expect(result.finishedBy).toBe('MAX_ITERATIONS_REACHED');
    expect(sourcesOf(result.state)).toEqual(['KS1_Hardware']);
  });

  it('cada execução usa um Blackboard novo (resultados independentes e iguais em estrutura)', async () => {
    const useCase = new RunDiagnosis({ incidentRepository: makeRepository(makeIncident()) });

    const first = await useCase.execute({ incidentId: 'inc-1', userId: 'user-1' });
    const second = await useCase.execute({ incidentId: 'inc-1', userId: 'user-1' });

    expect(second.iterations).toBe(first.iterations);
    expect(second.state.hypotheses).toHaveLength(first.state.hypotheses.length);
    expect(second.state.hypotheses[0].id).not.toBe(first.state.hypotheses[0].id);
  });

  describe('acesso ao incidente', () => {
    it('lança IncidentNotFoundError quando o incidente não existe', async () => {
      const useCase = new RunDiagnosis({ incidentRepository: makeRepository(null) });

      await expect(useCase.execute({ incidentId: 'x', userId: 'user-1' })).rejects.toBeInstanceOf(
        IncidentNotFoundError,
      );
    });

    it('lança IncidentNotFoundError se o repositório devolver incidente de outro usuário', async () => {
      const useCase = new RunDiagnosis({
        incidentRepository: makeRepository(makeIncident({ userId: 'outro-usuario' })),
      });

      await expect(useCase.execute({ incidentId: 'inc-1', userId: 'user-1' })).rejects.toBeInstanceOf(
        IncidentNotFoundError,
      );
    });

    it('lança ValidationError sem userId e nem consulta o repositório', async () => {
      const incidentRepository = makeRepository(makeIncident());
      const useCase = new RunDiagnosis({ incidentRepository });

      await expect(useCase.execute({ incidentId: 'inc-1' })).rejects.toBeInstanceOf(ValidationError);
      expect(incidentRepository.findById).not.toHaveBeenCalled();
    });
  });
});

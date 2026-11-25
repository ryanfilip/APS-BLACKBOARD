import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiagnosisResult from '../pages/DiagnosisResult.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const authState = vi.hoisted(() => ({ user: { id: 'user-1', name: 'Ana', role: 'USER' } }));
vi.mock('../contexts/AuthContext.jsx', () => ({ useAuth: () => authState }));

const diagnosis = {
  id: 'diag-1',
  incidentId: 'inc-1',
  iterations: 2,
  finishedBy: 'NO_MORE_ACTIONS',
  createdAt: '2026-11-20T10:00:00.000Z',
  state: {
    incident: {
      title: 'Computador lento e sem internet',
      description: 'Computador lento e sem internet',
      equipment: 'Desktop Dell',
    },
    facts: [{ id: 'f1', description: 'Incidente relatado', createdAt: '2026-11-20T10:00:00.000Z' }],
    // Fora de ordem de propósito: a tela deve ordenar por confiança (maior primeiro).
    hypotheses: [
      { id: 'h1', description: 'Perda de pacotes na rede', source: 'KS2_Network', confidence: 50, status: 'OPEN' },
      { id: 'h2', description: 'Possível falha ou sobrecarga na memória RAM', source: 'KS1_Hardware', confidence: 70, status: 'OPEN' },
    ],
    evidences: [
      { id: 'e1', description: "Sintoma 'internet' relatado", supports: 'h1', polarity: 'SUPPORTS', source: 'KS2_Network' },
      { id: 'e2', description: "Sintoma 'lento' relatado", supports: 'h2', polarity: 'SUPPORTS', source: 'KS1_Hardware' },
      { id: 'e3', description: "Sintoma 'ram' relatado", supports: 'h2', polarity: 'SUPPORTS', source: 'KS1_Hardware' },
      { id: 'e4', description: 'Teste de memória sem falhas', supports: 'h2', polarity: 'REFUTES', source: 'KS1_Hardware' },
    ],
  },
};

function renderPage(path = '/incidents/inc-1/diagnosis') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/incidents/:id/diagnosis" element={<DiagnosisResult />} />
        <Route path="/dashboard" element={<p>Página da dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DiagnosisResult', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.patch.mockReset();
    authState.user = { id: 'user-1', name: 'Ana', role: 'USER' };
  });

  it('lê o id da URL e chama GET /incidents/:id/diagnosis', async () => {
    api.get.mockResolvedValue({ data: { diagnosis } });

    renderPage('/incidents/inc-1/diagnosis');
    await screen.findByRole('heading', { level: 1 });

    expect(api.get).toHaveBeenCalledWith('/incidents/inc-1/diagnosis');
  });

  it('mostra o título do incidente no topo e o resumo do diagnóstico', async () => {
    api.get.mockResolvedValue({ data: { diagnosis } });

    renderPage();

    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Computador lento e sem internet');
    expect(screen.getByText(/Desktop Dell/)).toBeTruthy();
    const summary = screen.getByRole('region', { name: 'Resumo do diagnóstico' });
    expect(within(summary).getByText('Análise concluída')).toBeTruthy();
    expect(within(summary).getByText('Hipóteses').nextSibling.textContent).toBe('2');
    expect(within(summary).getByText('Evidências').nextSibling.textContent).toBe('4');
    expect(within(summary).getByText('Iterações').nextSibling.textContent).toBe('2');
  });

  it('lista um card por hipótese, da maior para a menor confiança, com a KS de origem', async () => {
    api.get.mockResolvedValue({ data: { diagnosis } });

    renderPage();

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByRole('heading', { level: 3 }).textContent).toBe(
      'Possível falha ou sobrecarga na memória RAM',
    );
    expect(within(cards[0]).getByText('KS1_Hardware')).toBeTruthy();
    expect(within(cards[1]).getByRole('heading', { level: 3 }).textContent).toBe('Perda de pacotes na rede');
    expect(within(cards[1]).getByText('KS2_Network')).toBeTruthy();
  });

  it('mostra a confiança em porcentagem e em barra de progresso', async () => {
    api.get.mockResolvedValue({ data: { diagnosis } });

    renderPage();

    const [first, second] = await screen.findAllByRole('article');
    expect(within(first).getByText('70%')).toBeTruthy();
    expect(within(first).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('70');
    expect(within(second).getByText('50%')).toBeTruthy();
    expect(within(second).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  });

  it('cada card lista só as evidências daquela hipótese (filtradas pelo id), com a polaridade', async () => {
    api.get.mockResolvedValue({ data: { diagnosis } });

    renderPage();

    const [ram, network] = await screen.findAllByRole('article');

    expect(within(ram).getByText("Sintoma 'lento' relatado")).toBeTruthy();
    expect(within(ram).getByText("Sintoma 'ram' relatado")).toBeTruthy();
    expect(within(ram).getByText('Teste de memória sem falhas')).toBeTruthy();
    expect(within(ram).getAllByText('Apoia')).toHaveLength(2);
    expect(within(ram).getAllByText('Refuta')).toHaveLength(1);
    expect(within(ram).queryByText("Sintoma 'internet' relatado")).toBeNull();

    expect(within(network).getByText("Sintoma 'internet' relatado")).toBeTruthy();
    expect(within(network).queryByText("Sintoma 'lento' relatado")).toBeNull();
  });

  it('o botão "Voltar para a Dashboard" leva para /dashboard', async () => {
    api.get.mockResolvedValue({ data: { diagnosis } });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar para a Dashboard' }));

    expect(await screen.findByText('Página da dashboard')).toBeTruthy();
  });

  it('mostra aviso quando nenhuma hipótese foi gerada', async () => {
    const empty = { ...diagnosis, iterations: 0, state: { ...diagnosis.state, hypotheses: [], evidences: [] } };
    api.get.mockResolvedValue({ data: { diagnosis: empty } });

    renderPage();

    expect(await screen.findByText('Nenhuma hipótese foi gerada para este incidente.')).toBeTruthy();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('mostra o aviso de limite de iterações quando o diagnóstico parou por isso', async () => {
    api.get.mockResolvedValue({ data: { diagnosis: { ...diagnosis, finishedBy: 'MAX_ITERATIONS_REACHED' } } });

    renderPage();

    expect(await screen.findByText('Limite de iterações atingido')).toBeTruthy();
  });

  it('mostra "Carregando" enquanto busca', () => {
    api.get.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('Carregando diagnóstico...')).toBeTruthy();
  });

  it('mostra o erro em português quando a API falha, mantendo o botão de voltar', async () => {
    api.get.mockRejectedValue({ response: { data: { error: 'Este incidente ainda não possui diagnóstico' } } });

    renderPage();

    expect((await screen.findByRole('alert')).textContent).toBe('Este incidente ainda não possui diagnóstico');
    expect(screen.getByRole('button', { name: 'Voltar para a Dashboard' })).toBeTruthy();
  });

  it('usa uma mensagem padrão quando a API não responde', async () => {
    api.get.mockRejectedValue(new Error('Network Error'));

    renderPage();

    expect((await screen.findByRole('alert')).textContent).toBe('Não foi possível carregar o diagnóstico.');
  });

  describe('Revisão das hipóteses (TECH/ADMIN)', () => {
    it('USER vê o status "Em análise", mas não os botões de revisão', async () => {
      api.get.mockResolvedValue({ data: { diagnosis } });

      renderPage();

      const [first] = await screen.findAllByRole('article');
      expect(within(first).getByText('Em análise')).toBeTruthy();
      expect(within(first).queryByRole('button', { name: /Confirmar/ })).toBeNull();
    });

    it('TECH confirma: chama PATCH com o id do diagnóstico e da hipótese e atualiza o card', async () => {
      authState.user = { id: 'tech-1', name: 'Téo', role: 'TECH' };
      api.get.mockResolvedValue({ data: { diagnosis } });
      const reviewed = {
        ...diagnosis,
        state: {
          ...diagnosis.state,
          hypotheses: diagnosis.state.hypotheses.map((h) =>
            h.id === 'h2' ? { ...h, status: 'CONFIRMED', reviewedBy: 'Téo', reviewedAt: '2026-11-21T10:00:00.000Z' } : h,
          ),
        },
      };
      api.patch.mockResolvedValue({ data: { diagnosis: reviewed } });

      renderPage();
      const [ram] = await screen.findAllByRole('article');
      fireEvent.click(within(ram).getByRole('button', { name: /^Confirmar/ }));

      expect(await within(ram).findByText('Confirmada')).toBeTruthy();
      expect(api.patch).toHaveBeenCalledWith('/incidents/inc-1/diagnoses/diag-1/hypotheses/h2', { status: 'CONFIRMED' });
      expect(within(ram).getByText(/Revisada por Téo/)).toBeTruthy();
      expect(within(ram).getByRole('button', { name: /^Reabrir/ })).toBeTruthy();
    });

    it('mostra o erro da API quando a revisão falha', async () => {
      authState.user = { id: 'tech-1', name: 'Téo', role: 'TECH' };
      api.get.mockResolvedValue({ data: { diagnosis } });
      api.patch.mockRejectedValue({ response: { data: { error: 'Hipótese não encontrada neste diagnóstico' } } });

      renderPage();
      const [ram] = await screen.findAllByRole('article');
      fireEvent.click(within(ram).getByRole('button', { name: /^Descartar/ }));

      expect((await screen.findByRole('alert')).textContent).toBe('Hipótese não encontrada neste diagnóstico');
    });
  });
});

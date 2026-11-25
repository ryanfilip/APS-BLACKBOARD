import { describe, expect, it } from 'vitest';
import { Incident, STATUS_TRANSITIONS } from '../Incident.js';
import { InvalidStatusTransitionError, ValidationError } from '../../errors/DomainErrors.js';
import { isStaff } from '../User.js';

const makeIncident = (status = 'OPEN') =>
  new Incident({ id: 'inc-1', title: 't', description: 'd', equipment: 'e', status, userId: 'user-1' });

describe('Incident: máquina de estados do status', () => {
  it.each([
    ['OPEN', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'RESOLVED'],
    ['IN_PROGRESS', 'OPEN'],
    ['RESOLVED', 'IN_PROGRESS'],
  ])('permite %s -> %s', (from, to) => {
    const incident = makeIncident(from);

    incident.changeStatus(to);

    expect(incident.status).toBe(to);
  });

  it.each([
    ['OPEN', 'RESOLVED'],
    ['OPEN', 'OPEN'],
    ['RESOLVED', 'OPEN'],
    ['RESOLVED', 'RESOLVED'],
    ['IN_PROGRESS', 'IN_PROGRESS'],
  ])('rejeita %s -> %s sem alterar o status', (from, to) => {
    const incident = makeIncident(from);

    expect(() => incident.changeStatus(to)).toThrow(InvalidStatusTransitionError);
    expect(incident.status).toBe(from);
  });

  it('rejeita status desconhecido com ValidationError', () => {
    expect(() => makeIncident().changeStatus('CLOSED')).toThrow(ValidationError);
  });

  it('toda transição leva a um status válido', () => {
    for (const targets of Object.values(STATUS_TRANSITIONS)) {
      for (const target of targets) expect(Object.keys(STATUS_TRANSITIONS)).toContain(target);
    }
  });
});

describe('Incident: controle de acesso', () => {
  it('o dono acessa o próprio incidente', () => {
    expect(makeIncident().canBeAccessedBy({ userId: 'user-1', role: 'USER' })).toBe(true);
  });

  it('outro USER não acessa', () => {
    expect(makeIncident().canBeAccessedBy({ userId: 'user-2', role: 'USER' })).toBe(false);
  });

  it.each(['TECH', 'ADMIN'])('%s acessa incidentes de qualquer usuário', (role) => {
    expect(makeIncident().canBeAccessedBy({ userId: 'staff-1', role })).toBe(true);
  });

  it('isStaff reconhece só TECH e ADMIN', () => {
    expect(isStaff('TECH')).toBe(true);
    expect(isStaff('ADMIN')).toBe(true);
    expect(isStaff('USER')).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });
});

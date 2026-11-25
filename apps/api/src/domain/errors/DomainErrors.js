export class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Dados inválidos') {
    super(message);
  }
}

export class EmailAlreadyExistsError extends DomainError {
  constructor(message = 'Já existe um usuário cadastrado com este e-mail') {
    super(message);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor(message = 'E-mail ou senha inválidos') {
    super(message);
  }
}

export class IncidentNotFoundError extends DomainError {
  constructor(message = 'Incidente não encontrado') {
    super(message);
  }
}

export class DiagnosisNotFoundError extends DomainError {
  constructor(message = 'Este incidente ainda não possui diagnóstico') {
    super(message);
  }
}

export class UserNotFoundError extends DomainError {
  constructor(message = 'Usuário não encontrado') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Acesso negado: permissão insuficiente') {
    super(message);
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(message = 'Mudança de status não permitida') {
    super(message);
  }
}

export class HypothesisNotFoundError extends DomainError {
  constructor(message = 'Hipótese não encontrada neste diagnóstico') {
    super(message);
  }
}

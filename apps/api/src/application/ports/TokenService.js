/** Porta (interface abstrata) para emissão e verificação de tokens. */
export class TokenService {
  // eslint-disable-next-line no-unused-vars
  sign(payload) {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  verify(token) {
    throw new Error('Not implemented');
  }
}

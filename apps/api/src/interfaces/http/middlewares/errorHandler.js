// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status ?? err.statusCode ?? 500;

  if (status >= 500) {
    console.error(err);
    return res.status(status).json({ error: 'Erro interno do servidor' });
  }

  return res.status(status).json({ error: err.message || 'Requisição inválida' });
}

export default errorHandler;

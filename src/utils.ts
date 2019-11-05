import { ErrorRequestHandler, Handler, Request } from 'express';

export function asyncHandler(fn: (req: Request) => any): Handler {
  return async (req, res, next) => {
    try {
      const result = await fn(req);
      res.send(result);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Wrapper para o express reconhecer com certeza que a função passada é um error handler.
 * O express só reconhece se a função recebe exatamente 4 argumentos.
 */
export function errorHandler(fn: ErrorRequestHandler): ErrorRequestHandler {
  return (err, req, res, next) => fn(err, req, res, next);
}

export function randomItem(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffleInPlace<T>(array: T[]): T[] {
  for (let i = 0; i < array.length; i++) {
    const j = i + Math.floor(Math.random() * (array.length - i));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

import { ErrorRequestHandler, Handler, Request } from 'express';
import { validateSync, ValidationError } from 'class-validator';
import { ClassType } from 'class-transformer/ClassTransformer';
import { plainToClass } from 'class-transformer';

export function asyncHandler(fn: Handler): Handler {
  return async (req, res, next) => {
    try {
      const result = await fn(req, res, next);
      res.send(result);
    } catch (err) {
      next(err);
    }
  };
}

export function asyncMiddleware(fn: Handler): Handler {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
      next();
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

export function fromEntries<T>(keyValuePairs: [string, T][]): { [key: string]: T } {
  const obj = {} as any;

  for (const [key, value] of keyValuePairs) {
    obj[key] = value;
  }

  return obj;
}

export function prettyFormatErrors(errors: ValidationError[]) {
  return fromEntries(errors.map(e => [e.property, e.constraints]));
}

export function validate<T, V>(cls: ClassType<T>, plain: V): { instance: T, errors: ValidationError[] } {
  const instance = plainToClass(cls, plain);
  const errors = validateSync(instance);
  return { instance, errors };
}

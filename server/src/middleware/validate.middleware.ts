import type { AnyZodObject, ZodTypeAny } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: AnyZodObject | ZodTypeAny, target: ValidationTarget = 'body') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(error);
      }
    }
  };
}

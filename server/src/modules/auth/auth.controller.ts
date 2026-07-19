import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../shared/utils/response.util';

const service = new AuthService();

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokens = await service.login(req.body);
    sendSuccess(res, tokens, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await service.refresh(refreshToken);
    sendSuccess(res, tokens, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

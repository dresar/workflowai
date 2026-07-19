import type { Request, Response, NextFunction } from 'express';
import { GenerateService } from './generate.service';
import { sendSuccess } from '../../shared/utils/response.util';

const service = new GenerateService();

function getPreferredProvider(req: Request): string | undefined {
  const body = req.body as { provider?: string };
  return body.provider;
}

export async function generateCanvas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { provider, revision } = req.body as { provider?: string; revision?: string };
    const result = await service.generateCanvas(req.params.projectId as string, provider, revision);
    sendSuccess(res, result, 'Canvas generated successfully');
  } catch (err) { next(err); }
}

export async function generatePRD(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.generatePRD(req.params.projectId as string, getPreferredProvider(req));
    sendSuccess(res, result, 'PRD generated successfully');
  } catch (err) { next(err); }
}

export async function generateArchitecture(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.generateArchitecture(req.params.projectId as string, getPreferredProvider(req));
    sendSuccess(res, result, 'Architecture generated successfully');
  } catch (err) { next(err); }
}

export async function generateDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.generateDatabase(req.params.projectId as string, getPreferredProvider(req));
    sendSuccess(res, result, 'Database design generated successfully');
  } catch (err) { next(err); }
}

export async function generateAPI(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.generateAPI(req.params.projectId as string, getPreferredProvider(req));
    sendSuccess(res, result, 'API design generated successfully');
  } catch (err) { next(err); }
}

export async function generateTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.generateTasks(req.params.projectId as string, getPreferredProvider(req));
    sendSuccess(res, result, 'Task breakdown generated successfully');
  } catch (err) { next(err); }
}

export async function generatePrompt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.generatePrompt(req.params.projectId as string, getPreferredProvider(req));
    sendSuccess(res, result, 'Prompt generated successfully');
  } catch (err) { next(err); }
}

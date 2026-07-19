import type { Request, Response, NextFunction } from 'express';
import { ProjectService } from './project.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response.util';

const service = new ProjectService();

export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const page = parseInt(req.query.page as string || '1', 10);
    const result = await service.list({ page, limit });
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await service.create(req.body);
    sendCreated(res, project, 'Project created successfully');
  } catch (err) { next(err); }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await service.getFullProject(req.params.id as string);
    sendSuccess(res, project);
  } catch (err) { next(err); }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await service.update(req.params.id as string, req.body);
    sendSuccess(res, project, 'Project updated');
  } catch (err) { next(err); }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.remove(req.params.id as string);
    sendNoContent(res);
  } catch (err) { next(err); }
}

export async function saveTechnologies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.saveTechnologies(req.params.id as string, req.body);
    sendSuccess(res, result, 'Technologies saved');
  } catch (err) { next(err); }
}

export async function getTechnologies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getTechnologies(req.params.id as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function saveAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.saveAnswers(req.params.id as string, req.body);
    sendSuccess(res, result, 'Answers saved');
  } catch (err) { next(err); }
}

export async function getAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getAnswers(req.params.id as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function saveCanvas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.saveCanvas(req.params.id as string, req.body);
    sendSuccess(res, result, 'Canvas saved');
  } catch (err) { next(err); }
}

export async function getCanvas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getCanvas(req.params.id as string);
    sendSuccess(res, result ?? null);
  } catch (err) { next(err); }
}

export async function getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getDocuments(req.params.id as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function getDocumentByType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getDocumentByType(req.params.id as string, req.params.type as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function getDocumentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getDocumentHistory(req.params.id as string, req.params.type as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function saveDocumentManual(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.saveDocumentManual(req.params.id as string, req.params.type as string, req.body);
    sendSuccess(res, result, 'Document saved manually');
  } catch (err) { next(err); }
}


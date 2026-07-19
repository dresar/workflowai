import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  saveTechnologiesSchema,
  saveAnswersSchema,
  saveCanvasSchema,
  projectIdParamSchema,
  documentTypeParamSchema,
  saveDocumentSchema,
} from '../modules/project/project.validation';
import * as projectController from '../modules/project/project.controller';
import * as technologyController from '../modules/technology/technology.controller';
import { getActiveQuestions } from '../modules/admin/questions/questions.controller';

const router = Router();

router.get('/technologies', technologyController.listActiveForUser);
router.get('/technologies/categories', technologyController.getCategories);
router.get('/technologies/:id', technologyController.getTechnologyById);

router.get('/interview/questions', getActiveQuestions);

router.get('/projects', projectController.listProjects);
router.post('/projects', validate(createProjectSchema), projectController.createProject);
router.get('/projects/:id', validate(projectIdParamSchema, 'params'), projectController.getProject);
router.put('/projects/:id', validate(projectIdParamSchema, 'params'), validate(updateProjectSchema), projectController.updateProject);
router.delete('/projects/:id', validate(projectIdParamSchema, 'params'), projectController.deleteProject);

router.post('/projects/:id/technologies', validate(projectIdParamSchema, 'params'), validate(saveTechnologiesSchema), projectController.saveTechnologies);
router.get('/projects/:id/technologies', validate(projectIdParamSchema, 'params'), projectController.getTechnologies);

router.post('/projects/:id/answers', validate(projectIdParamSchema, 'params'), validate(saveAnswersSchema), projectController.saveAnswers);
router.get('/projects/:id/answers', validate(projectIdParamSchema, 'params'), projectController.getAnswers);

router.post('/projects/:id/canvas', validate(projectIdParamSchema, 'params'), validate(saveCanvasSchema), projectController.saveCanvas);
router.get('/projects/:id/canvas', validate(projectIdParamSchema, 'params'), projectController.getCanvas);

router.get('/projects/:id/documents', validate(projectIdParamSchema, 'params'), projectController.getDocuments);
router.get('/projects/:id/documents/:type', projectController.getDocumentByType);
router.get('/projects/:id/documents/:type/history', projectController.getDocumentHistory);
router.post('/projects/:id/documents/:type', validate(documentTypeParamSchema, 'params'), validate(saveDocumentSchema), projectController.saveDocumentManual);

export default router;

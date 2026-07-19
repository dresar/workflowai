import { Router } from 'express';
import * as generateController from '../modules/generate/generate.controller';

const router = Router();

router.post('/canvas/:projectId', generateController.generateCanvas);
router.post('/prd/:projectId', generateController.generatePRD);
router.post('/architecture/:projectId', generateController.generateArchitecture);
router.post('/database/:projectId', generateController.generateDatabase);
router.post('/api/:projectId', generateController.generateAPI);
router.post('/tasks/:projectId', generateController.generateTasks);
router.post('/prompt/:projectId', generateController.generatePrompt);

export default router;

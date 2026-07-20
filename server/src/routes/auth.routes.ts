import { Router } from 'express';
import * as authController from '../modules/auth/auth.controller';

const router = Router();

import { authMiddleware } from '../middleware/auth.middleware';

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refresh);
router.get('/me', authMiddleware, authController.getMe);

export default router;

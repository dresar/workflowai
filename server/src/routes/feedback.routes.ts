import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { db } from '../database/connection';
import { feedbacks } from '../database/schema';
import { sendCreated } from '../shared/utils/response.util';

const router = Router();
router.use(authMiddleware);

router.post('/', async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    const { type, content } = req.body;
    const [row] = await db.insert(feedbacks).values({
      userId,
      type,
      content,
    }).returning();
    sendCreated(res, row, 'Feedback submitted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from 'express';
import { ReferrersController } from '../controllers/referrers.controller';

const router = Router();
const controller = new ReferrersController();

router.get('/', controller.getAll.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;

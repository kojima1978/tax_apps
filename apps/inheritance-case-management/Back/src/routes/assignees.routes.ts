import { Router } from 'express';
import { AssigneesController } from '../controllers/assignees.controller';

const router = Router();
const controller = new AssigneesController();

router.get('/', controller.getAll.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;

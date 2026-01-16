import { Router } from 'express';
import { CasesController } from '../controllers/cases.controller';

const router = Router();
const casesController = new CasesController();

// GET /api/cases - 全案件取得
router.get('/', casesController.getAllCases.bind(casesController));

// GET /api/cases/:id - 特定案件取得
router.get('/:id', casesController.getCaseById.bind(casesController));

// POST /api/cases - 新規案件作成
router.post('/', casesController.createCase.bind(casesController));

// PUT /api/cases/:id - 案件更新
router.put('/:id', casesController.updateCase.bind(casesController));

// DELETE /api/cases/:id - 案件削除
router.delete('/:id', casesController.deleteCase.bind(casesController));

export default router;

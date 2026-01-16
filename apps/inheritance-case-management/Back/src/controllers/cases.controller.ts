import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export class CasesController {
  // 全案件取得
  async getAllCases(_req: Request, res: Response): Promise<void> {
    try {
      const cases = await prisma.inheritanceCase.findMany({
        orderBy: { createdAt: 'desc' },
      });
      // JSON fields might need explicit casting if strictly typed, but express res.json handles generic objects.
      // However, to match InheritanceCase interface, we might need to conform the types if we were processing them.
      // Here we just send what DB gave us.
      res.json(cases);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch cases' });
    }
  }

  // 特定案件取得
  async getCaseById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const caseItem = await prisma.inheritanceCase.findUnique({
        where: { id },
      });

      if (!caseItem) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      res.json(caseItem);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch case' });
    }
  }

  // 新規案件作成
  async createCase(req: Request, res: Response): Promise<void> {
    try {
      // req.body contains the fields. We need to ensure types match what Prisma expects.
      // progress and contacts are Arrays, which maps to Json.
      const newCase = await prisma.inheritanceCase.create({
        data: {
          deceasedName: req.body.deceasedName,
          dateOfDeath: req.body.dateOfDeath,
          status: req.body.status || '未着手',
          acceptanceStatus: req.body.acceptanceStatus || '未判定',
          taxAmount: req.body.taxAmount || 0,
          assignee: req.body.assignee,
          feeAmount: req.body.feeAmount || 0,
          fiscalYear: req.body.fiscalYear,
          referrer: req.body.referrer,
          estimateAmount: req.body.estimateAmount || 0,
          propertyValue: req.body.propertyValue || 0,
          referralFeeRate: req.body.referralFeeRate,
          referralFeeAmount: req.body.referralFeeAmount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contacts: req.body.contacts as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress: req.body.progress as any,
        }
      });

      res.status(201).json(newCase);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create case' });
    }
  }

  // 案件更新
  async updateCase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Separate known fields to safely update, though Prisma ignores undefined in update if configured, 
      // but standard spread of req.body is easiest. 
      // We must be careful not to overwrite 'id' or other immutables if any.
      // And we need to cast JSON fields.

      const { id: _id, createdAt, updatedAt, ...rest } = req.body;

      const updated = await prisma.inheritanceCase.update({
        where: { id },
        data: {
          ...rest,
          // Explicitly cast if present, otherwise ignore (spread handled it if it's simple types, but complex objects might need help)
          // Actually spread ...rest works for Json fields too if they are valid Json.
        },
      });
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update case' });
    }
  }

  // 案件削除
  async deleteCase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.inheritanceCase.delete({
        where: { id },
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete case' });
    }
  }
}


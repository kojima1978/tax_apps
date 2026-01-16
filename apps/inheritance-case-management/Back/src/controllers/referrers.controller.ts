import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export class ReferrersController {
    async getAll(_req: Request, res: Response): Promise<void> {
        try {
            const referrers = await prisma.referrer.findMany({
                orderBy: { company: 'asc' }
            });
            res.json(referrers);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch referrers' });
        }
    }

    async create(req: Request, res: Response): Promise<void> {
        try {
            const newItem = await prisma.referrer.create({
                data: {
                    company: req.body.company,
                    name: req.body.name,
                    department: req.body.department,
                    active: true
                }
            });
            res.status(201).json(newItem);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create referrer' });
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updated = await prisma.referrer.update({
                where: { id },
                data: req.body
            });
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update referrer' });
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await prisma.referrer.delete({
                where: { id }
            });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete referrer' });
        }
    }
}


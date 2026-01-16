import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export class AssigneesController {
    async getAll(_req: Request, res: Response): Promise<void> {
        try {
            const assignees = await prisma.assignee.findMany({
                orderBy: { name: 'asc' }
            });
            res.json(assignees);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch assignees' });
        }
    }

    async create(req: Request, res: Response): Promise<void> {
        try {
            const newItem = await prisma.assignee.create({
                data: {
                    name: req.body.name,
                    employeeId: req.body.employeeId,
                    department: req.body.department,
                    active: true
                }
            });
            res.status(201).json(newItem);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create assignee' });
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updated = await prisma.assignee.update({
                where: { id },
                data: req.body
            });
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update assignee' });
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await prisma.assignee.delete({
                where: { id }
            });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete assignee' });
        }
    }
}


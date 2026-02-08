import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('無効なID形式です'),
});

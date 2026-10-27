import { z } from 'zod';
import { ComplaintStatus, ComplaintUrgency } from '@prisma/client';

export const createComplaintSchema = z.object({
  propertyId: z.string().uuid(),
  categoryId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  location: z.string().trim().optional(), // e.g. "Dining Hall", "Gym"
  description: z.string().min(5, 'Please provide a clear description').trim(),
  urgency: z.nativeEnum(ComplaintUrgency).default('MEDIUM'),
  assignedTo: z.string().uuid().optional(),
});

export type CreateComplaintDto = z.infer<typeof createComplaintSchema>;

export const updateComplaintStatusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  notes: z.string().optional(),
  resolution: z.string().optional(),
});

export type UpdateComplaintStatusDto = z.infer<
  typeof updateComplaintStatusSchema
>;

export const assignComplaintSchema = z.object({
  assignedTo: z.string().uuid(),
  notes: z.string().optional(),
});

export type AssignComplaintDto = z.infer<typeof assignComplaintSchema>;

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').trim(),
});

export type AddCommentDto = z.infer<typeof addCommentSchema>;

export const createComplaintCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required').trim(),
});

export type CreateComplaintCategoryDto = z.infer<
  typeof createComplaintCategorySchema
>;

export const queryComplaintsSchema = z.object({
  propertyId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.nativeEnum(ComplaintStatus).optional(),
  urgency: z.nativeEnum(ComplaintUrgency).optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryComplaintsDto = z.infer<typeof queryComplaintsSchema>;

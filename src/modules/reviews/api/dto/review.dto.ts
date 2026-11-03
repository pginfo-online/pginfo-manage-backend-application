import { z } from 'zod';

export const SurveyTriggerType = z.enum([
  'MANUAL',
  'MOVE_IN',
  'MONTHLY',
  'MOVE_OUT',
]);
export type SurveyTriggerType = z.infer<typeof SurveyTriggerType>;

export const QuestionType = z.enum([
  'RATING_5',
  'NPS_10',
  'TEXT',
  'SINGLE_CHOICE',
]);
export type QuestionType = z.infer<typeof QuestionType>;

export const surveyQuestionSchema = z.object({
  id: z.string().optional(),
  prompt: z.string().min(3),
  type: QuestionType,
  category: z
    .enum(['CLEANLINESS', 'FOOD', 'MAINTENANCE', 'STAFF', 'GENERAL'])
    .default('GENERAL'),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
});

export const createSurveySchema = z.object({
  propertyId: z.string().uuid().optional(),
  title: z.string().min(3, 'Title is required').trim(),
  description: z.string().optional(),
  triggerType: SurveyTriggerType.default('MANUAL'),
  isAutomatic: z.boolean().default(false),
  questions: z
    .array(surveyQuestionSchema)
    .min(1, 'At least one question is required'),
});

export type CreateSurveyDto = z.infer<typeof createSurveySchema>;

export const sendSurveySchema = z.object({
  surveyId: z.string(),
  propertyId: z.string().uuid().optional(),
  channel: z.enum(['WHATSAPP', 'SMS']).default('WHATSAPP'),
  target: z.enum(['ALL', 'NEW_MOVED_IN', 'SELECT_TENANTS']).default('ALL'),
  tenantIds: z.array(z.string()).optional(),
});

export type SendSurveyDto = z.infer<typeof sendSurveySchema>;

export const submitResponseSchema = z.object({
  surveyId: z.string(),
  propertyId: z.string().uuid().optional(),
  residentId: z.string().optional(),
  residentName: z.string().min(2),
  roomNumber: z.string().optional(),
  score: z.coerce.number().min(1).max(10), // 1-5 for stars, 1-10 for NPS
  categoryScores: z
    .object({
      cleanliness: z.number().min(1).max(5).optional(),
      food: z.number().min(1).max(5).optional(),
      maintenance: z.number().min(1).max(5).optional(),
      staff: z.number().min(1).max(5).optional(),
    })
    .optional(),
  comments: z.string().optional(),
});

export type SubmitResponseDto = z.infer<typeof submitResponseSchema>;

export const querySurveysSchema = z.object({
  propertyId: z.string().uuid().optional(),
  search: z.string().optional(),
  triggerType: SurveyTriggerType.optional(),
});

export type QuerySurveysDto = z.infer<typeof querySurveysSchema>;

export const queryResponsesSchema = z.object({
  propertyId: z.string().uuid().optional(),
  surveyId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryResponsesDto = z.infer<typeof queryResponsesSchema>;

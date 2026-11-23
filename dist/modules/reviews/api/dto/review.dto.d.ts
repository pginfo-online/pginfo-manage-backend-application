import { z } from 'zod';
export declare const SurveyTriggerType: z.ZodEnum<["MANUAL", "MOVE_IN", "MONTHLY", "MOVE_OUT"]>;
export type SurveyTriggerType = z.infer<typeof SurveyTriggerType>;
export declare const QuestionType: z.ZodEnum<["RATING_5", "NPS_10", "TEXT", "SINGLE_CHOICE"]>;
export type QuestionType = z.infer<typeof QuestionType>;
export declare const surveyQuestionSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    prompt: z.ZodString;
    type: z.ZodEnum<["RATING_5", "NPS_10", "TEXT", "SINGLE_CHOICE"]>;
    category: z.ZodDefault<z.ZodEnum<["CLEANLINESS", "FOOD", "MAINTENANCE", "STAFF", "GENERAL"]>>;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    required: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "RATING_5" | "NPS_10" | "TEXT" | "SINGLE_CHOICE";
    category: "STAFF" | "MAINTENANCE" | "CLEANLINESS" | "FOOD" | "GENERAL";
    prompt: string;
    required: boolean;
    id?: string | undefined;
    options?: string[] | undefined;
}, {
    type: "RATING_5" | "NPS_10" | "TEXT" | "SINGLE_CHOICE";
    prompt: string;
    id?: string | undefined;
    options?: string[] | undefined;
    category?: "STAFF" | "MAINTENANCE" | "CLEANLINESS" | "FOOD" | "GENERAL" | undefined;
    required?: boolean | undefined;
}>;
export declare const createSurveySchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    triggerType: z.ZodDefault<z.ZodEnum<["MANUAL", "MOVE_IN", "MONTHLY", "MOVE_OUT"]>>;
    isAutomatic: z.ZodDefault<z.ZodBoolean>;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        prompt: z.ZodString;
        type: z.ZodEnum<["RATING_5", "NPS_10", "TEXT", "SINGLE_CHOICE"]>;
        category: z.ZodDefault<z.ZodEnum<["CLEANLINESS", "FOOD", "MAINTENANCE", "STAFF", "GENERAL"]>>;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "RATING_5" | "NPS_10" | "TEXT" | "SINGLE_CHOICE";
        category: "STAFF" | "MAINTENANCE" | "CLEANLINESS" | "FOOD" | "GENERAL";
        prompt: string;
        required: boolean;
        id?: string | undefined;
        options?: string[] | undefined;
    }, {
        type: "RATING_5" | "NPS_10" | "TEXT" | "SINGLE_CHOICE";
        prompt: string;
        id?: string | undefined;
        options?: string[] | undefined;
        category?: "STAFF" | "MAINTENANCE" | "CLEANLINESS" | "FOOD" | "GENERAL" | undefined;
        required?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    triggerType: "MANUAL" | "MOVE_IN" | "MONTHLY" | "MOVE_OUT";
    isAutomatic: boolean;
    questions: {
        type: "RATING_5" | "NPS_10" | "TEXT" | "SINGLE_CHOICE";
        category: "STAFF" | "MAINTENANCE" | "CLEANLINESS" | "FOOD" | "GENERAL";
        prompt: string;
        required: boolean;
        id?: string | undefined;
        options?: string[] | undefined;
    }[];
    description?: string | undefined;
    propertyId?: string | undefined;
}, {
    title: string;
    questions: {
        type: "RATING_5" | "NPS_10" | "TEXT" | "SINGLE_CHOICE";
        prompt: string;
        id?: string | undefined;
        options?: string[] | undefined;
        category?: "STAFF" | "MAINTENANCE" | "CLEANLINESS" | "FOOD" | "GENERAL" | undefined;
        required?: boolean | undefined;
    }[];
    description?: string | undefined;
    propertyId?: string | undefined;
    triggerType?: "MANUAL" | "MOVE_IN" | "MONTHLY" | "MOVE_OUT" | undefined;
    isAutomatic?: boolean | undefined;
}>;
export type CreateSurveyDto = z.infer<typeof createSurveySchema>;
export declare const sendSurveySchema: z.ZodObject<{
    surveyId: z.ZodString;
    propertyId: z.ZodOptional<z.ZodString>;
    channel: z.ZodDefault<z.ZodEnum<["WHATSAPP", "SMS"]>>;
    target: z.ZodDefault<z.ZodEnum<["ALL", "NEW_MOVED_IN", "SELECT_TENANTS"]>>;
    tenantIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    target: "ALL" | "NEW_MOVED_IN" | "SELECT_TENANTS";
    channel: "WHATSAPP" | "SMS";
    surveyId: string;
    propertyId?: string | undefined;
    tenantIds?: string[] | undefined;
}, {
    surveyId: string;
    target?: "ALL" | "NEW_MOVED_IN" | "SELECT_TENANTS" | undefined;
    propertyId?: string | undefined;
    channel?: "WHATSAPP" | "SMS" | undefined;
    tenantIds?: string[] | undefined;
}>;
export type SendSurveyDto = z.infer<typeof sendSurveySchema>;
export declare const submitResponseSchema: z.ZodObject<{
    surveyId: z.ZodString;
    propertyId: z.ZodOptional<z.ZodString>;
    residentId: z.ZodOptional<z.ZodString>;
    residentName: z.ZodString;
    roomNumber: z.ZodOptional<z.ZodString>;
    score: z.ZodNumber;
    categoryScores: z.ZodOptional<z.ZodObject<{
        cleanliness: z.ZodOptional<z.ZodNumber>;
        food: z.ZodOptional<z.ZodNumber>;
        maintenance: z.ZodOptional<z.ZodNumber>;
        staff: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        staff?: number | undefined;
        cleanliness?: number | undefined;
        food?: number | undefined;
        maintenance?: number | undefined;
    }, {
        staff?: number | undefined;
        cleanliness?: number | undefined;
        food?: number | undefined;
        maintenance?: number | undefined;
    }>>;
    comments: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    residentName: string;
    surveyId: string;
    score: number;
    propertyId?: string | undefined;
    roomNumber?: string | undefined;
    residentId?: string | undefined;
    comments?: string | undefined;
    categoryScores?: {
        staff?: number | undefined;
        cleanliness?: number | undefined;
        food?: number | undefined;
        maintenance?: number | undefined;
    } | undefined;
}, {
    residentName: string;
    surveyId: string;
    score: number;
    propertyId?: string | undefined;
    roomNumber?: string | undefined;
    residentId?: string | undefined;
    comments?: string | undefined;
    categoryScores?: {
        staff?: number | undefined;
        cleanliness?: number | undefined;
        food?: number | undefined;
        maintenance?: number | undefined;
    } | undefined;
}>;
export type SubmitResponseDto = z.infer<typeof submitResponseSchema>;
export declare const querySurveysSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    triggerType: z.ZodOptional<z.ZodEnum<["MANUAL", "MOVE_IN", "MONTHLY", "MOVE_OUT"]>>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    propertyId?: string | undefined;
    triggerType?: "MANUAL" | "MOVE_IN" | "MONTHLY" | "MOVE_OUT" | undefined;
}, {
    search?: string | undefined;
    propertyId?: string | undefined;
    triggerType?: "MANUAL" | "MOVE_IN" | "MONTHLY" | "MOVE_OUT" | undefined;
}>;
export type QuerySurveysDto = z.infer<typeof querySurveysSchema>;
export declare const queryResponsesSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    surveyId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    propertyId?: string | undefined;
    surveyId?: string | undefined;
}, {
    search?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    surveyId?: string | undefined;
}>;
export type QueryResponsesDto = z.infer<typeof queryResponsesSchema>;

import { PrismaService } from '../../../platform/database/index.js';
import type { CreateSurveyDto, SendSurveyDto, SubmitResponseDto, QuerySurveysDto, QueryResponsesDto } from '../api/dto/review.dto.js';
export interface SurveyItem {
    id: string;
    organizationId: string;
    propertyId?: string;
    title: string;
    description: string;
    triggerType: 'MANUAL' | 'MOVE_IN' | 'MONTHLY' | 'MOVE_OUT';
    isAutomatic: boolean;
    status: 'ACTIVE' | 'PAUSED';
    isReadyMade: boolean;
    sentCount: number;
    responseCount: number;
    averageScore: number;
    questions: Array<{
        id: string;
        prompt: string;
        type: string;
        category: string;
        options?: string[];
    }>;
    createdAt: string;
}
export interface SurveyResponseItem {
    id: string;
    organizationId: string;
    surveyId: string;
    surveyTitle: string;
    residentId?: string;
    residentName: string;
    roomNumber?: string;
    score: number;
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    categoryScores?: {
        cleanliness?: number;
        food?: number;
        maintenance?: number;
        staff?: number;
    };
    comments?: string;
    submittedAt: string;
}
export declare class ReviewsService {
    private readonly prisma;
    private readonly logger;
    private surveys;
    private responses;
    constructor(prisma: PrismaService);
    listSurveys(orgId: string, query: QuerySurveysDto): Promise<{
        surveys: SurveyItem[];
        total: number;
    }>;
    createSurvey(dto: CreateSurveyDto, orgId: string): Promise<SurveyItem>;
    sendSurvey(dto: SendSurveyDto, orgId: string): Promise<{
        success: boolean;
        message: string;
        dispatchedCount: number;
        channel: "WHATSAPP" | "SMS";
    }>;
    listResponses(orgId: string, query: QueryResponsesDto): Promise<{
        data: SurveyResponseItem[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    submitResponse(dto: SubmitResponseDto, orgId: string): Promise<SurveyResponseItem>;
    getInsights(orgId: string, propertyId?: string): Promise<{
        overview: {
            csatScore: number;
            npsScore: number;
            totalSent: number;
            totalResponses: number;
            responseRate: number;
        };
        npsBreakdown: {
            promotersPercentage: number;
            passivesPercentage: number;
            detractorsPercentage: number;
        };
        categories: {
            cleanliness: {
                score: number;
                outOf: number;
                responses: number;
                label: string;
            };
            food: {
                score: number;
                outOf: number;
                responses: number;
                label: string;
            };
            maintenance: {
                score: number;
                outOf: number;
                responses: number;
                label: string;
            };
            staff: {
                score: number;
                outOf: number;
                responses: number;
                label: string;
            };
        };
    }>;
}

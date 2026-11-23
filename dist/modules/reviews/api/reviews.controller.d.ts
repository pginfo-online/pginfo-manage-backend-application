import { ReviewsService } from '../application/reviews.service.js';
import { type CreateSurveyDto, type SendSurveyDto, type SubmitResponseDto, type QuerySurveysDto, type QueryResponsesDto } from './dto/review.dto.js';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    listSurveys(query: QuerySurveysDto, orgId: string): Promise<{
        surveys: import("../application/reviews.service.js").SurveyItem[];
        total: number;
    }>;
    createSurvey(dto: CreateSurveyDto, orgId: string): Promise<import("../application/reviews.service.js").SurveyItem>;
    sendSurvey(surveyId: string, body: Omit<SendSurveyDto, 'surveyId'>, orgId: string): Promise<{
        success: boolean;
        message: string;
        dispatchedCount: number;
        channel: "WHATSAPP" | "SMS";
    }>;
    listResponses(query: QueryResponsesDto, orgId: string): Promise<{
        data: import("../application/reviews.service.js").SurveyResponseItem[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    submitResponse(dto: SubmitResponseDto, orgId: string): Promise<import("../application/reviews.service.js").SurveyResponseItem>;
    getInsights(propertyId: string | undefined, orgId: string): Promise<{
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

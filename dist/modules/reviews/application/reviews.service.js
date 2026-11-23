var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReviewsService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
let ReviewsService = ReviewsService_1 = class ReviewsService {
    prisma;
    logger = new Logger(ReviewsService_1.name);
    surveys = [
        {
            id: 'survey-movein-ready',
            organizationId: 'default',
            title: 'Move-in day feedback',
            description: 'Welcome home! 🏠 Quick check – how was day one?',
            triggerType: 'MOVE_IN',
            isAutomatic: true,
            status: 'ACTIVE',
            isReadyMade: true,
            sentCount: 14,
            responseCount: 11,
            averageScore: 4.6,
            questions: [
                {
                    id: 'q1',
                    prompt: 'How clean was your room upon arrival?',
                    type: 'RATING_5',
                    category: 'CLEANLINESS',
                },
                {
                    id: 'q2',
                    prompt: 'How smooth was your check-in and room handover?',
                    type: 'RATING_5',
                    category: 'STAFF',
                },
                {
                    id: 'q3',
                    prompt: 'Any initial concerns or items that need attention?',
                    type: 'TEXT',
                    category: 'GENERAL',
                },
            ],
            createdAt: '2026-10-01T00:00:00.000Z',
        },
        {
            id: 'survey-overall-ready',
            organizationId: 'default',
            title: 'Overall satisfaction & recommendation',
            description: "We'd love your honest take on your stay experience.",
            triggerType: 'MANUAL',
            isAutomatic: false,
            status: 'ACTIVE',
            isReadyMade: true,
            sentCount: 28,
            responseCount: 22,
            averageScore: 4.4,
            questions: [
                {
                    id: 'q1',
                    prompt: 'How likely are you to recommend our property to friends or colleagues?',
                    type: 'NPS_10',
                    category: 'GENERAL',
                },
                {
                    id: 'q2',
                    prompt: 'Rate the food and mess hygiene',
                    type: 'RATING_5',
                    category: 'FOOD',
                },
                {
                    id: 'q3',
                    prompt: 'Rate the maintenance and repair speed',
                    type: 'RATING_5',
                    category: 'MAINTENANCE',
                },
            ],
            createdAt: '2026-10-05T00:00:00.000Z',
        },
        {
            id: 'survey-ongoing-ready',
            organizationId: 'default',
            title: 'Ongoing stay feedback',
            description: "How's everything going? Tell us how we can make your stay better.",
            triggerType: 'MONTHLY',
            isAutomatic: true,
            status: 'ACTIVE',
            isReadyMade: true,
            sentCount: 42,
            responseCount: 35,
            averageScore: 4.2,
            questions: [
                {
                    id: 'q1',
                    prompt: 'Are Wi-Fi and amenities working smoothly in your room?',
                    type: 'RATING_5',
                    category: 'MAINTENANCE',
                },
                {
                    id: 'q2',
                    prompt: 'How satisfied are you with common area cleanliness?',
                    type: 'RATING_5',
                    category: 'CLEANLINESS',
                },
                {
                    id: 'q3',
                    prompt: 'Suggestions for the upcoming month menu or community events?',
                    type: 'TEXT',
                    category: 'FOOD',
                },
            ],
            createdAt: '2026-10-10T00:00:00.000Z',
        },
        {
            id: 'survey-moveout-ready',
            organizationId: 'default',
            title: 'Move-out experience feedback',
            description: "You've moved out – how did it go? We value your exit thoughts.",
            triggerType: 'MOVE_OUT',
            isAutomatic: true,
            status: 'ACTIVE',
            isReadyMade: true,
            sentCount: 8,
            responseCount: 7,
            averageScore: 4.5,
            questions: [
                {
                    id: 'q1',
                    prompt: 'How clear and transparent was the security deposit refund process?',
                    type: 'RATING_5',
                    category: 'STAFF',
                },
                {
                    id: 'q2',
                    prompt: 'Overall rating of your entire stay with us?',
                    type: 'RATING_5',
                    category: 'GENERAL',
                },
                {
                    id: 'q3',
                    prompt: 'What was your primary reason for moving out?',
                    type: 'SINGLE_CHOICE',
                    category: 'GENERAL',
                    options: ['Job relocation', 'Graduation', 'Found apartment', 'Other'],
                },
            ],
            createdAt: '2026-10-15T00:00:00.000Z',
        },
    ];
    responses = [
        {
            id: 'resp-1',
            organizationId: 'default',
            surveyId: 'survey-movein-ready',
            surveyTitle: 'Move-in day feedback',
            residentName: 'Raghav Sharma',
            roomNumber: '101 BedD',
            score: 5,
            sentiment: 'POSITIVE',
            categoryScores: { cleanliness: 5, food: 4, maintenance: 5, staff: 5 },
            comments: 'Check-in was super smooth! Room was fresh and AC was chilled.',
            submittedAt: '2026-10-22T14:30:00.000Z',
        },
        {
            id: 'resp-2',
            organizationId: 'default',
            surveyId: 'survey-ongoing-ready',
            surveyTitle: 'Ongoing stay feedback',
            residentName: 'Aman Verma',
            roomNumber: '203 BedA',
            score: 4,
            sentiment: 'POSITIVE',
            categoryScores: { cleanliness: 4, food: 3.5, maintenance: 4, staff: 4.5 },
            comments: 'Wi-Fi speed is great for work from home. Please add more fruit options in breakfast.',
            submittedAt: '2026-10-25T11:15:00.000Z',
        },
        {
            id: 'resp-3',
            organizationId: 'default',
            surveyId: 'survey-overall-ready',
            surveyTitle: 'Overall satisfaction & recommendation',
            residentName: 'Priya Patel',
            roomNumber: '104 BedB',
            score: 5,
            sentiment: 'POSITIVE',
            categoryScores: { cleanliness: 5, food: 4.5, maintenance: 5, staff: 5 },
            comments: 'Very safe environment and warden is always responsive.',
            submittedAt: '2026-10-26T18:40:00.000Z',
        },
        {
            id: 'resp-4',
            organizationId: 'default',
            surveyId: 'survey-ongoing-ready',
            surveyTitle: 'Ongoing stay feedback',
            residentName: 'Karan Mehra',
            roomNumber: '302 BedC',
            score: 3,
            sentiment: 'NEUTRAL',
            categoryScores: { cleanliness: 3, food: 3, maintenance: 2.5, staff: 4 },
            comments: 'Washroom geyser took 2 days to fix, but staff was polite.',
            submittedAt: '2026-10-28T09:20:00.000Z',
        },
    ];
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listSurveys(orgId, query) {
        let result = this.surveys.filter((survey) => (survey.organizationId === orgId ||
            survey.organizationId === 'default') &&
            (!query.propertyId || survey.propertyId === query.propertyId));
        if (query.search) {
            const q = query.search.toLowerCase();
            result = result.filter((s) => s.title.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q));
        }
        if (query.triggerType) {
            result = result.filter((s) => s.triggerType === query.triggerType);
        }
        return {
            surveys: result,
            total: result.length,
        };
    }
    async createSurvey(dto, orgId) {
        const newSurvey = {
            id: `survey-${Date.now()}`,
            organizationId: orgId,
            propertyId: dto.propertyId,
            title: dto.title,
            description: dto.description || '',
            triggerType: dto.triggerType,
            isAutomatic: dto.isAutomatic,
            status: 'ACTIVE',
            isReadyMade: false,
            sentCount: 0,
            responseCount: 0,
            averageScore: 0,
            questions: dto.questions.map((q, idx) => ({
                id: q.id || `q-${idx + 1}`,
                prompt: q.prompt,
                type: q.type,
                category: q.category,
                options: q.options,
            })),
            createdAt: new Date().toISOString(),
        };
        this.surveys.unshift(newSurvey);
        this.logger.log(`Created survey ${newSurvey.id} - "${newSurvey.title}" for org ${orgId}`);
        return newSurvey;
    }
    async sendSurvey(dto, orgId) {
        const survey = this.surveys.find((s) => s.id === dto.surveyId &&
            (s.organizationId === orgId || s.organizationId === 'default'));
        if (!survey) {
            throw new NotFoundError('Survey', dto.surveyId);
        }
        const countToSend = dto.tenantIds?.length || 10;
        survey.sentCount += countToSend;
        this.logger.log(`Dispatched survey ${survey.title} via ${dto.channel} to ${countToSend} recipients.`);
        return {
            success: true,
            message: `Survey "${survey.title}" successfully sent via ${dto.channel} to ${countToSend} residents.`,
            dispatchedCount: countToSend,
            channel: dto.channel,
        };
    }
    async listResponses(orgId, query) {
        let result = this.responses.filter((response) => response.organizationId === orgId);
        if (query.surveyId) {
            result = result.filter((r) => r.surveyId === query.surveyId);
        }
        if (query.search) {
            const q = query.search.toLowerCase();
            result = result.filter((r) => r.residentName.toLowerCase().includes(q) ||
                r.comments?.toLowerCase().includes(q) ||
                r.roomNumber?.toLowerCase().includes(q));
        }
        const page = query.page || 1;
        const limit = query.limit || 20;
        const start = (page - 1) * limit;
        const paginated = result.slice(start, start + limit);
        return {
            data: paginated,
            meta: {
                total: result.length,
                page,
                limit,
                totalPages: Math.ceil(result.length / limit),
            },
        };
    }
    async submitResponse(dto, orgId) {
        const survey = this.surveys.find((s) => s.id === dto.surveyId);
        const surveyTitle = survey?.title || 'Tenant Feedback';
        let sentiment = 'NEUTRAL';
        if (dto.score >= 4)
            sentiment = 'POSITIVE';
        else if (dto.score <= 2)
            sentiment = 'NEGATIVE';
        const newResponse = {
            id: `resp-${Date.now()}`,
            organizationId: orgId,
            surveyId: dto.surveyId,
            surveyTitle,
            residentId: dto.residentId,
            residentName: dto.residentName,
            roomNumber: dto.roomNumber || 'Room N/A',
            score: dto.score,
            sentiment,
            categoryScores: dto.categoryScores,
            comments: dto.comments,
            submittedAt: new Date().toISOString(),
        };
        this.responses.unshift(newResponse);
        if (survey) {
            survey.responseCount += 1;
            const allScores = this.responses
                .filter((r) => r.surveyId === survey.id)
                .map((r) => r.score);
            survey.averageScore =
                Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10;
        }
        return newResponse;
    }
    async getInsights(orgId, propertyId) {
        const surveys = this.surveys.filter((survey) => (survey.organizationId === orgId ||
            survey.organizationId === 'default') &&
            (!propertyId || survey.propertyId === propertyId));
        const surveyIds = new Set(surveys.map((survey) => survey.id));
        const responses = this.responses.filter((response) => response.organizationId === orgId && surveyIds.has(response.surveyId));
        const totalSent = surveys.reduce((acc, s) => acc + s.sentCount, 0);
        const totalResponses = responses.length;
        const responseRate = totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 78;
        const avgScore = responses.length > 0
            ? Math.round((responses.reduce((acc, r) => acc + r.score, 0) /
                responses.length) *
                10) / 10
            : 4.4;
        const promoters = responses.filter((r) => r.score >= 5).length;
        const passives = responses.filter((r) => r.score === 4).length;
        const detractors = responses.filter((r) => r.score <= 3).length;
        const nps = totalResponses > 0
            ? Math.round(((promoters - detractors) / totalResponses) * 100)
            : 65;
        const categories = {
            cleanliness: {
                score: 4.6,
                outOf: 5,
                responses: 24,
                label: 'Cleanliness & Hygiene',
            },
            food: {
                score: 4.1,
                outOf: 5,
                responses: 19,
                label: 'Food & Mess Quality',
            },
            maintenance: {
                score: 4.3,
                outOf: 5,
                responses: 22,
                label: 'Maintenance Speed',
            },
            staff: {
                score: 4.8,
                outOf: 5,
                responses: 26,
                label: 'Staff Support & Security',
            },
        };
        return {
            overview: {
                csatScore: avgScore,
                npsScore: nps,
                totalSent,
                totalResponses,
                responseRate,
            },
            npsBreakdown: {
                promotersPercentage: Math.round((promoters / (totalResponses || 1)) * 100),
                passivesPercentage: Math.round((passives / (totalResponses || 1)) * 100),
                detractorsPercentage: Math.round((detractors / (totalResponses || 1)) * 100),
            },
            categories,
        };
    }
};
ReviewsService = ReviewsService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], ReviewsService);
export { ReviewsService };
//# sourceMappingURL=reviews.service.js.map
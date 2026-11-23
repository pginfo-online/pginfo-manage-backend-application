var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { ReviewsService } from '../application/reviews.service.js';
import { createSurveySchema, sendSurveySchema, submitResponseSchema, querySurveysSchema, queryResponsesSchema, } from './dto/review.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let ReviewsController = class ReviewsController {
    reviewsService;
    constructor(reviewsService) {
        this.reviewsService = reviewsService;
    }
    async listSurveys(query, orgId) {
        return this.reviewsService.listSurveys(orgId, query);
    }
    async createSurvey(dto, orgId) {
        return this.reviewsService.createSurvey(dto, orgId);
    }
    async sendSurvey(surveyId, body, orgId) {
        return this.reviewsService.sendSurvey({ ...body, surveyId }, orgId);
    }
    async listResponses(query, orgId) {
        return this.reviewsService.listResponses(orgId, query);
    }
    async submitResponse(dto, orgId) {
        return this.reviewsService.submitResponse(dto, orgId);
    }
    async getInsights(propertyId, orgId) {
        return this.reviewsService.getInsights(orgId, propertyId);
    }
};
__decorate([
    Get('surveys'),
    ApiOperation({ summary: 'List all ready-made and custom feedback surveys' }),
    ApiResponse({ status: 200, description: 'Surveys fetched successfully' }),
    __param(0, Query(new ZodValidationPipe(querySurveysSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "listSurveys", null);
__decorate([
    Post('surveys'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Create a new tenant survey template' }),
    ApiResponse({ status: 201, description: 'Survey created' }),
    __param(0, Body(new ZodValidationPipe(createSurveySchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "createSurvey", null);
__decorate([
    Post('surveys/:id/send'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Dispatch survey via WhatsApp or SMS to tenants' }),
    ApiResponse({ status: 200, description: 'Survey sent to tenants' }),
    __param(0, Param('id')),
    __param(1, Body(new ZodValidationPipe(sendSurveySchema.omit({ surveyId: true })))),
    __param(2, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "sendSurvey", null);
__decorate([
    Get('responses'),
    ApiOperation({ summary: 'List all submitted survey and review responses' }),
    ApiResponse({ status: 200, description: 'Responses fetched successfully' }),
    __param(0, Query(new ZodValidationPipe(queryResponsesSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "listResponses", null);
__decorate([
    Post('responses'),
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Submit a tenant survey review response' }),
    ApiResponse({ status: 201, description: 'Response recorded' }),
    __param(0, Body(new ZodValidationPipe(submitResponseSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "submitResponse", null);
__decorate([
    Get('insights'),
    ApiOperation({
        summary: 'Get aggregated NPS, CSAT, and category review metrics',
    }),
    ApiResponse({ status: 200, description: 'Insights metrics calculated' }),
    __param(0, Query('propertyId')),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getInsights", null);
ReviewsController = __decorate([
    ApiTags('Property: Reviews & Feedback Surveys'),
    Controller('reviews'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [ReviewsService])
], ReviewsController);
export { ReviewsController };
//# sourceMappingURL=reviews.controller.js.map
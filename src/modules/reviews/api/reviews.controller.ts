import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReviewsService } from '../application/reviews.service.js';
import {
  createSurveySchema,
  sendSurveySchema,
  submitResponseSchema,
  querySurveysSchema,
  queryResponsesSchema,
  type CreateSurveyDto,
  type SendSurveyDto,
  type SubmitResponseDto,
  type QuerySurveysDto,
  type QueryResponsesDto,
} from './dto/review.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  RequireOrgRoles,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';

@ApiTags('Property: Reviews & Feedback Surveys')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('surveys')
  @ApiOperation({ summary: 'List all ready-made and custom feedback surveys' })
  @ApiResponse({ status: 200, description: 'Surveys fetched successfully' })
  async listSurveys(
    @Query(new ZodValidationPipe(querySurveysSchema)) query: QuerySurveysDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.reviewsService.listSurveys(orgId, query);
  }

  @Post('surveys')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new tenant survey template' })
  @ApiResponse({ status: 201, description: 'Survey created' })
  async createSurvey(
    @Body(new ZodValidationPipe(createSurveySchema)) dto: CreateSurveyDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.reviewsService.createSurvey(dto, orgId);
  }

  @Post('surveys/:id/send')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Dispatch survey via WhatsApp or SMS to tenants' })
  @ApiResponse({ status: 200, description: 'Survey sent to tenants' })
  async sendSurvey(
    @Param('id') surveyId: string,
    @Body(new ZodValidationPipe(sendSurveySchema.omit({ surveyId: true })))
    body: Omit<SendSurveyDto, 'surveyId'>,
    @CurrentOrgId() orgId: string,
  ) {
    return this.reviewsService.sendSurvey({ ...body, surveyId }, orgId);
  }

  @Get('responses')
  @ApiOperation({ summary: 'List all submitted survey and review responses' })
  @ApiResponse({ status: 200, description: 'Responses fetched successfully' })
  async listResponses(
    @Query(new ZodValidationPipe(queryResponsesSchema))
    query: QueryResponsesDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.reviewsService.listResponses(orgId, query);
  }

  @Post('responses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a tenant survey review response' })
  @ApiResponse({ status: 201, description: 'Response recorded' })
  async submitResponse(
    @Body(new ZodValidationPipe(submitResponseSchema)) dto: SubmitResponseDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.reviewsService.submitResponse(dto, orgId);
  }

  @Get('insights')
  @ApiOperation({
    summary: 'Get aggregated NPS, CSAT, and category review metrics',
  })
  @ApiResponse({ status: 200, description: 'Insights metrics calculated' })
  async getInsights(
    @Query('propertyId') propertyId: string | undefined,
    @CurrentOrgId() orgId: string,
  ) {
    return this.reviewsService.getInsights(orgId, propertyId);
  }
}

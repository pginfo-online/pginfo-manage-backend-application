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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from '../application/payments.service.js';
import {
  recordPaymentSchema,
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
  queryPaymentsSchema,
  type RecordPaymentDto,
  type CreateRazorpayOrderDto,
  type VerifyRazorpayPaymentDto,
  type QueryPaymentsDto,
} from './dto/payment.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
  CurrentUserId,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  RequireOrgRoles,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';

@ApiTags('Finance: Payments & Collections')
@Controller('payments')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({
    summary: 'Record manual/offline payment (Cash, UPI, Cheque, Bank Transfer)',
  })
  @ApiResponse({ status: 201, description: 'Payment recorded and allocated' })
  async recordPayment(
    @Body(new ZodValidationPipe(recordPaymentSchema)) dto: RecordPaymentDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.paymentsService.recordPayment(dto, orgId, userId);
  }

  @Post('razorpay/order')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a server-side Razorpay payment order' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async createRazorpayOrder(
    @Body(new ZodValidationPipe(createRazorpayOrderSchema))
    dto: CreateRazorpayOrderDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.paymentsService.createRazorpayOrder(dto, orgId, userId);
  }

  @Post('razorpay/verify')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cryptographically verify Razorpay payment HMAC signature and confirm payment',
  })
  @ApiResponse({ status: 200, description: 'Payment verified and confirmed' })
  @ApiResponse({ status: 401, description: 'Signature verification failed' })
  async verifyRazorpayPayment(
    @Body(new ZodValidationPipe(verifyRazorpayPaymentSchema))
    dto: VerifyRazorpayPaymentDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.paymentsService.verifyRazorpayPayment(dto, orgId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List payments with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated payments list' })
  async findAll(
    @Query(new ZodValidationPipe(queryPaymentsSchema)) query: QueryPaymentsDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.paymentsService.findAll(orgId, query);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Download or view official payment receipt' })
  @ApiResponse({ status: 200, description: 'Payment receipt data' })
  async getReceipt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.paymentsService.getReceipt(id, orgId);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MoneyService } from '../application/money.service.js';
import { MoneyLinksService } from '../application/money-links.service.js';
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
import {
  moneyQuerySchema,
  packageSchema,
  offerSchema,
  moneyPaymentSchema,
  remarkSchema,
  partySchema,
  bankLinkSchema,
  type MoneyQuery,
  type PackageInput,
  type OfferInput,
  type MoneyPayment,
} from './dto/money.dto.js';

@ApiTags('Money')
@ApiBearerAuth('JWT')
@Controller('money')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF')
export class MoneyController {
  constructor(
    private readonly money: MoneyService,
    private readonly links: MoneyLinksService,
  ) {}
  @Post('residents/:id/payment-link')
  createLink(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() org: string,
    @CurrentUserId() user: string,
  ) {
    return this.links.create(id, org, user);
  }
  @Post('residents/:id/payment-qr')
  createQr(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() org: string,
    @CurrentUserId() user: string,
  ) {
    return this.links.create(id, org, user, 'qr');
  }

  @Get('properties') properties(
    @CurrentOrgId() org: string,
    @Query(new ZodValidationPipe(moneyQuerySchema)) q: MoneyQuery,
  ) {
    return this.money.properties(org, q);
  }
  @Get('properties/:id') property(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() org: string,
  ) {
    return this.money.property(id, org);
  }
  @Get('reports/:kind')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  async report(
    @Param('kind') kind: string,
    @CurrentOrgId() org: string,
    @Query(new ZodValidationPipe(moneyQuerySchema)) q: MoneyQuery,
    @Res() res: Response,
  ) {
    if (!['dues', 'collections', 'expenses'].includes(kind))
      throw new BadRequestException('Unknown report type');
    if (q.startDate && q.endDate && q.startDate > q.endDate)
      throw new BadRequestException('Invalid date range');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${kind}.csv"`);
    try {
      for await (const chunk of this.money.report(kind, org, q)) {
        if (res.destroyed) break;
        if (!res.write(chunk)) {
          await new Promise<void>((resolve) => {
            const ready = () => {
              res.off('drain', ready);
              res.off('close', ready);
              resolve();
            };
            res.once('drain', ready);
            res.once('close', ready);
          });
        }
      }
      res.end();
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error instanceof Error ? error : undefined);
      } else {
        throw error;
      }
    }
  }
  @Get('packages') packages(
    @CurrentOrgId() org: string,
    @Query(new ZodValidationPipe(moneyQuerySchema)) q: MoneyQuery,
  ) {
    return this.money.packages(org, q);
  }
  @Post('packages')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  createPackage(
    @CurrentOrgId() org: string,
    @CurrentUserId() user: string,
    @Body(new ZodValidationPipe(packageSchema)) dto: PackageInput,
  ) {
    return this.money.savePackage(org, user, dto);
  }
  @Patch('packages/:id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  updatePackage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() org: string,
    @CurrentUserId() user: string,
    @Body(new ZodValidationPipe(packageSchema)) dto: PackageInput,
  ) {
    return this.money.savePackage(org, user, dto, id);
  }
  @Get('dues') dues(
    @CurrentOrgId() org: string,
    @Query(new ZodValidationPipe(moneyQuerySchema)) q: MoneyQuery,
  ) {
    return this.money.dues(org, q);
  }
  @Get('summary') summary(
    @CurrentOrgId() org: string,
    @Query(new ZodValidationPipe(moneyQuerySchema)) q: MoneyQuery,
  ) {
    return this.money.summary(org, q.propertyId);
  }
  @Get('residents/:id/payment-context') context(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() org: string,
  ) {
    return this.money.paymentContext(id, org);
  }
  @Get('residents/:id/reminder') reminder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() org: string,
  ) {
    return this.money.reminder(id, org);
  }
  @Post('residents/:id/discount')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  offer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() org: string,
    @CurrentUserId() user: string,
    @Body(new ZodValidationPipe(offerSchema)) dto: OfferInput,
  ) {
    return this.money.offer(id, org, user, dto);
  }
  @Post('residents/:id/remarks')
  remark(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() org: string,
    @CurrentUserId() user: string,
    @Body(new ZodValidationPipe(remarkSchema)) dto: { description: string },
  ) {
    return this.money.remark(id, org, user, dto.description);
  }
  @Post('payments') record(
    @CurrentOrgId() org: string,
    @CurrentUserId() user: string,
    @Body(new ZodValidationPipe(moneyPaymentSchema)) dto: MoneyPayment,
  ) {
    return this.money.record(dto, org, user);
  }
  @Get('parties') parties(
    @CurrentOrgId() org: string,
    @Query(new ZodValidationPipe(moneyQuerySchema)) q: MoneyQuery,
  ) {
    return this.money.parties(org, q);
  }
  @Post('parties') party(
    @CurrentOrgId() org: string,
    @Body(new ZodValidationPipe(partySchema)) dto: { name: string },
  ) {
    return this.money.createParty(org, dto.name);
  }
  @Patch('banks/:id/property')
  @RequireOrgRoles('OWNER', 'ADMIN')
  link(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() org: string,
    @CurrentUserId() user: string,
    @Body(new ZodValidationPipe(bankLinkSchema))
    dto: { propertyId: string | null },
  ) {
    return this.money.linkBank(id, org, user, dto.propertyId);
  }
}

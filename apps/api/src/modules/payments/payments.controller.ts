import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  CreateBulkPaymentsDto,
} from './dto/create-payment.dto';
import {
  UpdatePaymentDto,
  UpdatePaymentStatusDto,
} from './dto/update-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsUrl } from 'class-validator';

class CheckoutDto {
  @IsUrl({ require_tld: false })
  returnUrl: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── Public: Stripe webhook (must receive raw body) ────────────────────────
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody!, sig);
  }

  // ── Protected routes ──────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  async findAll(
    @Query() query: QueryPaymentsDto,
    @Req() req: Request & { user: { id: string; role: string } },
  ) {
    if (req.user.role === 'STUDENT') {
      query.studentId = req.user.id;
    }
    if (req.user.role === 'PARENT') {
      const childIds = await this.paymentsService.getParentChildIds(
        req.user.id,
      );
      if (!query.studentId || !childIds.includes(query.studentId)) {
        throw new ForbiddenException();
      }
    }
    return this.paymentsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('stats')
  @Roles('ADMIN')
  getStats(@Query() query: { from?: string; to?: string; studentId?: string }) {
    return this.paymentsService.getStats(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('bulk')
  @Roles('ADMIN')
  createBulk(@Body() dto: CreateBulkPaymentsDto) {
    return this.paymentsService.createBulk(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.paymentsService.updateStatus(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/checkout')
  @Roles('ADMIN', 'STUDENT', 'PARENT')
  async checkout(
    @Param('id') id: string,
    @Body() body: CheckoutDto,
    @Req() req: Request & { user: { id: string; role: string } },
  ) {
    if (req.user.role === 'STUDENT') {
      const payment = await this.paymentsService.findOne(id);
      if (payment.student?.id !== req.user.id) throw new ForbiddenException();
    }
    if (req.user.role === 'PARENT') {
      const payment = await this.paymentsService.findOne(id);
      const childIds = await this.paymentsService.getParentChildIds(
        req.user.id,
      );
      if (!payment.student?.id || !childIds.includes(payment.student.id)) {
        throw new ForbiddenException();
      }
    }
    return this.paymentsService.createCheckout(id, body.returnUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}

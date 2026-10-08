import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCreateEndpoint,
} from '../common/decorators/api-docs.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Public()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Creates a Razorpay order.
   * Accepts amount in INR. Returns orderId, amount (paise), currency, and
   * the PUBLIC key ID. The secret is never returned.
   */
  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a Razorpay payment order',
    description:
      'Creates a Razorpay order for the given INR amount. Returns the order ID and public key ID needed by the frontend checkout. The Razorpay secret is never exposed.',
  })
  @ApiCreateEndpoint(CreateOrderDto)
  createOrder(@Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(dto);
  }

  /**
   * Verifies a Razorpay payment signature server-side.
   * Computes HMAC-SHA256(order_id|payment_id, KEY_SECRET) and compares
   * with the signature sent by the Checkout SDK. Uses timing-safe comparison.
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify a Razorpay payment signature',
    description:
      'Server-side HMAC-SHA256 verification of the payment signature. Returns { success: true } on a valid signature. Throws 400 on invalid signature.',
  })
  @ApiCreateEndpoint(VerifyPaymentDto)
  verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifySignature(dto);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'The Razorpay order ID returned from /payments/create-order.',
    example: 'order_AbCdEfGhIjKlMn',
  })
  @IsString()
  @IsNotEmpty()
  razorpay_order_id: string;

  @ApiProperty({
    description: 'The Razorpay payment ID returned by the Checkout SDK on success.',
    example: 'pay_AbCdEfGhIjKlMn',
  })
  @IsString()
  @IsNotEmpty()
  razorpay_payment_id: string;

  @ApiProperty({
    description: 'The HMAC-SHA256 signature returned by the Checkout SDK on success.',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  razorpay_signature: string;
}

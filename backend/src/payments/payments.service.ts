import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string; // public key — safe to send to frontend
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
}

/**
 * Minimal shape of the Razorpay order object returned by orders.create().
 * The SDK typings incorrectly declare the return as void — we define the
 * actual runtime shape here and cast accordingly.
 */
interface RazorpayOrderShape {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}


@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: Razorpay;
  private readonly keySecret: string;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.getOrThrow<string>('RAZORPAY_KEY_ID');
    this.keySecret =
      this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET');

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: this.keySecret,
    });
  }

  /**
   * Creates a Razorpay order for the given amount (in INR).
   * Converts INR → paise before calling the Razorpay API.
   * Returns the order details + the public key ID (safe for frontend use).
   */
  async createOrder(dto: CreateOrderDto): Promise<RazorpayOrderResponse> {
    const amountInPaise = Math.round(dto.amount * 100);

    let order: RazorpayOrderShape;

    const receiptPrefix = dto.bookingType ? dto.bookingType.toLowerCase() : 'xploreo';
    const notes: Record<string, string> = {
      bookingType: dto.bookingType || 'GENERAL',
      bookingId: dto.bookingId ? String(dto.bookingId) : '',
      ...(dto.notes || {}),
    };

    try {
      // The razorpay SDK typings incorrectly declare orders.create() as
      // returning void. We cast through unknown to the actual runtime shape.
      order = (await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `${receiptPrefix}_${Date.now()}`.slice(0, 40),
        notes,
      })) as unknown as RazorpayOrderShape;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Razorpay order creation failed';
      this.logger.error('Failed to create Razorpay order', message);
      throw new InternalServerErrorException(
        'Unable to create payment order. Please try again.',
      );
    }

    this.logger.log(
      `Razorpay order created: ${order.id} for type=${dto.bookingType || 'GENERAL'} amount=${dto.amount} INR`,
    );

    return {
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID')!,
    };
  }


  /**
   * Verifies the Razorpay payment signature using HMAC-SHA256.
   * The signature is computed over: order_id + "|" + payment_id
   * Uses a timing-safe comparison to prevent timing attacks.
   *
   * Never trusts a frontend "success" claim — always verify server-side.
   */
  verifySignature(dto: VerifyPaymentDto): VerifyPaymentResponse {
    const payload = `${dto.razorpay_order_id}|${dto.razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    const expected = Buffer.from(expectedSignature, 'hex');
    const received = Buffer.from(dto.razorpay_signature, 'hex');

    // Lengths must match before timingSafeEqual to avoid crypto errors
    const isValid =
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received);

    if (!isValid) {
      this.logger.warn(
        `Payment signature mismatch for order ${dto.razorpay_order_id}`,
      );
      throw new BadRequestException(
        'Payment verification failed: invalid signature.',
      );
    }

    this.logger.log(
      `Payment verified successfully: order=${dto.razorpay_order_id}, payment=${dto.razorpay_payment_id}`,
    );

    return { success: true, message: 'Payment verified successfully.' };
  }
}

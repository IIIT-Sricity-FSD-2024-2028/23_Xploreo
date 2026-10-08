import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  const mockSecret = 'test_secret_for_unit_tests';
  const mockKeyId = 'rzp_test_testkeyid123';

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'RAZORPAY_KEY_ID') return mockKeyId;
      if (key === 'RAZORPAY_KEY_SECRET') return mockSecret;
      throw new Error(`Missing ${key}`);
    }),
    get: jest.fn((key: string) => {
      if (key === 'RAZORPAY_KEY_ID') return mockKeyId;
      if (key === 'RAZORPAY_KEY_SECRET') return mockSecret;
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifySignature', () => {
    it('should successfully verify a valid HMAC-SHA256 signature', () => {
      const orderId = 'order_test123';
      const paymentId = 'pay_test456';
      const validSignature = crypto
        .createHmac('sha256', mockSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const result = service.verifySignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      });

      expect(result).toEqual({
        success: true,
        message: 'Payment verified successfully.',
      });
    });

    it('should throw BadRequestException on invalid signature', () => {
      expect(() => {
        service.verifySignature({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test456',
          razorpay_signature: 'invalid_hex_signature_deadbeef',
        });
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException on mismatched order/payment', () => {
      const validSignatureForDifferentOrder = crypto
        .createHmac('sha256', mockSecret)
        .update('order_diff|pay_test456')
        .digest('hex');

      expect(() => {
        service.verifySignature({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test456',
          razorpay_signature: validSignatureForDifferentOrder,
        });
      }).toThrow(BadRequestException);
    });
  });
});

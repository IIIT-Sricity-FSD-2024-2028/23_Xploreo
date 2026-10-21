import { BadRequestException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordResetMailService } from './password-reset-mail.service';

describe('password reset', () => {
  let service: AuthService;
  let sentResetUrl = '';

  beforeEach(() => {
    sentResetUrl = '';
    const mailer = {
      assertConfigured: jest.fn(),
      sendPasswordReset: jest.fn(async (_email: string, url: string) => {
        sentResetUrl = url;
      }),
    } as unknown as PasswordResetMailService;
    service = new AuthService(new AuthRepository(), mailer);
  });

  it('resets a password with a five-minute, single-use link', async () => {
    await service.requestPasswordReset('anjali@xploreo.com');
    const token = new URL(sentResetUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    await service.confirmPasswordReset(token!, 'New-password-2026', 'New-password-2026');
    await expect(
      service.login({ username: 'T001', password: 'New-password-2026' }),
    ).resolves.toMatchObject({ user: { userId: 'T001' } });
    await expect(
      service.confirmPasswordReset(token!, 'Another-password-2026', 'Another-password-2026'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-matching password confirmation before changing a password', async () => {
    await service.requestPasswordReset('anjali@xploreo.com');
    const token = new URL(sentResetUrl).searchParams.get('token');

    await expect(
      service.confirmPasswordReset(token!, 'New-password-2026', 'different-password'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.login({ username: 'T001', password: 'TRA@123' })).resolves.toMatchObject({
      user: { userId: 'T001' },
    });
  });
});

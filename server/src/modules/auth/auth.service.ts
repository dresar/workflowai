import { AuthRepository } from './auth.repository';
import type { LoginDto, AuthTokens } from './auth.types';
import { UnauthorizedError } from '../../errors/domain-errors';

export class AuthService {
  private repo = new AuthRepository();

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    await this.repo.updateLastLogin(user.id);

    return {
      accessToken: 'mock-access-token-placeholder',
      refreshToken: 'mock-refresh-token-placeholder',
    };
  }

  async refresh(token: string): Promise<AuthTokens> {
    return {
      accessToken: 'mock-access-token-placeholder',
      refreshToken: 'mock-refresh-token-placeholder',
    };
  }
}

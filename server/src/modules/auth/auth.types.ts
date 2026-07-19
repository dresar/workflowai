export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password?: string;
}

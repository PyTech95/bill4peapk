import api, { clearToken, setToken } from './client';

export type User = {
  id: string;
  email: string;
  name: string;
  wallet_balance?: number;
  user_type?: string;
  role?: string;
  company_id?: string | null;
  corporate_name?: string | null;
  referral_code?: string;
  phone?: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  referrer_code?: string;
  user_type?: 'individual' | 'corporate';
  corporate_name?: string;
};

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post('/auth/login', { email: email.trim(), password });
  await setToken(data.token);
  return data.user as User;
}

export async function register(payload: RegisterPayload): Promise<User> {
  const { data } = await api.post('/auth/register', payload);
  await setToken(data.token);
  return data.user as User;
}

export async function otpRequest(phone: string, name?: string) {
  const { data } = await api.post('/auth/otp/request', { phone, name });
  return data;
}

export async function otpVerify(phone: string, otp: string, name?: string): Promise<User> {
  const { data } = await api.post('/auth/otp/verify', { phone, otp, name });
  await setToken(data.token);
  return data.user as User;
}

export async function me(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data as User;
}

export async function logout() {
  await clearToken();
}

import api from './client';

export type ExpenseDraft = {
  category?: string;
  sub_category?: string;
  items?: { name: string; quantity: number; unit_price: number }[];
  notes?: string;
};

export type ManualTxn = {
  transaction_id: string;
  state: string;
  payee_name?: string | null;
  payee_upi?: string | null;
  merchant_amount?: number;
  platform_fee?: number;
  platform_fee_percent?: string;
  fee_status?: string;
  bill_id?: string | null;
  expense_id?: string | null;
  needs_fee?: boolean;
  fee?: number;
  wallet_balance?: number;
  generated?: boolean;
};

export const getManualConfig = () => api.get('/manual-pay/config').then((r) => r.data);

export const firstScan = (body: {
  payee_upi: string;
  payee_name?: string | null;
  merchant_amount?: number;
  expense_draft?: ExpenseDraft;
}) => api.post('/manual-pay/first-scan', body).then((r) => r.data as ManualTxn);

export const confirmPay = (tid: string, completed: boolean) =>
  api.post(`/manual-pay/${tid}/confirm`, { completed }).then((r) => r.data as ManualTxn);

export const submitProof = (tid: string, form: FormData) =>
  api
    .post(`/manual-pay/${tid}/proof`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data as ManualTxn);

export const generateReceipt = (tid: string) =>
  api.post(`/manual-pay/${tid}/generate`).then((r) => r.data as ManualTxn);

export const getStatus = (tid: string) =>
  api.get(`/manual-pay/${tid}`).then((r) => r.data as ManualTxn);

export const cancelTxn = (tid: string) =>
  api.post(`/manual-pay/${tid}/cancel`).then((r) => r.data);

// Auto-extract the 12-digit UTR from a payment screenshot (Gemini vision).
export const extractUtr = (form: FormData) =>
  api
    .post('/ai/extract-utr', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data as { utr: string; found: boolean });

// Strict UPI QR parser — mirrors the web app.
export function parseUpi(raw: string): { upi: string; name: string; amt: string } | null {
  try {
    if (!/^upi:\/\//i.test(raw || '')) return null;
    const q = raw.split('?')[1] || '';
    const params = new URLSearchParams(q);
    const upi = (params.get('pa') || '').trim();
    if (!upi || !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upi)) return null;
    return {
      upi,
      name: decodeURIComponent(params.get('pn') || '').trim(),
      amt: params.get('am') || '',
    };
  } catch {
    return null;
  }
}

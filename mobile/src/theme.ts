export const colors = {
  navy: '#002970',
  navyDark: '#001F5C',
  brand: '#002970',
  sky: '#00BAF2',
  accent: '#D2690D',
  bg: '#FFFFFF',
  offWhite: '#F4F6FA',
  slate: '#64748B',
  border: '#E5EAF2',
  text: '#0A1128',
  danger: '#DC2626',
  success: '#059669',
  white: '#FFFFFF',
};

export const money = (n: number | string | undefined) =>
  `₹${Number(n || 0).toFixed(2)}`;

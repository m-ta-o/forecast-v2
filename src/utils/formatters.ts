
export const formatCurrency = (value: number) => {
  if (typeof value !== 'number' || !isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercentage = (value: number) => {
  if (typeof value !== 'number' || !isFinite(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
};

export const formatNumber = (value: number) => {
  if (typeof value !== 'number' || !isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export const formatParentheses = (value: number) => {
  if (typeof value !== 'number' || !isFinite(value)) return '($0)';
  return `(${formatCurrency(Math.abs(value))})`;
};

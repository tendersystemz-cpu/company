export function displayAmount(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';

  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 2
  }).format(value);
}

export function badgeTone(status: string | null | undefined) {
  if (!status) return '';

  const text = status.toUpperCase();

  if (['PASS', 'CAPABLE', 'RECOMMENDED', 'READY', 'VERIFIED'].includes(text)) {
    return 'ok';
  }

  if (['FAIL', 'NOT_CAPABLE', 'DISQUALIFIED', 'NOT_READY', 'REJECTED'].includes(text)) {
    return 'bad';
  }

  if (['PENDING_REVIEW', 'PASS_WITH_CONDITION', 'CAPABLE_WITH_CONDITION', 'PANEL_REVIEW_REQUIRED', 'PENDING_VERIFICATION'].includes(text)) {
    return 'warn';
  }

  return '';
}

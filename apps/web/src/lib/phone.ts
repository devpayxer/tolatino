// Phone-input formatting, shared by every phone field so they behave like a
// professional app: only digits are accepted (letters/symbols are stripped as
// you type) and a US number is auto-formatted "(XXX) XXX-XXXX". A leading "+"
// switches to international mode — the "+" and raw digits are kept so non-US
// numbers (common for WhatsApp) aren't mangled.
export function formatPhone(v: string): string {
  if (v.trimStart().startsWith('+')) {
    const d = v.replace(/\D/g, '').slice(0, 15);
    return `+${d}`;
  }
  const d = v.replace(/\D/g, '').slice(0, 10); // US local number
  if (!d) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

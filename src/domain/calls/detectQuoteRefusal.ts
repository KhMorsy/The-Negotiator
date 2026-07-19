const REFUSAL_PATTERNS = [
  /don'?t quote over the phone/i,
  /no phone quotes/i,
  /send (?:us )?an email/i,
  /we need to see the property first/i,
];

export function detectQuoteRefusal(lastVendorUtterance: string): {
  refused: boolean;
  reason: string;
} {
  for (const pattern of REFUSAL_PATTERNS) {
    if (pattern.test(lastVendorUtterance)) {
      return { refused: true, reason: lastVendorUtterance.trim() };
    }
  }
  return { refused: false, reason: "" };
}

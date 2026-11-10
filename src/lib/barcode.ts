/** Valide un GTIN (EAN-8, UPC-A 12, EAN-13, GTIN-14) : format + chiffre de contrôle. */
export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  let sum = 0;
  digits.reverse().forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 3 : 1);
  });
  return (10 - (sum % 10)) % 10 === check;
}

/** Nettoie une saisie manuelle (espaces, tirets). */
export function cleanBarcodeInput(raw: string): string {
  return raw.replace(/[\s-]/g, "").slice(0, 14);
}

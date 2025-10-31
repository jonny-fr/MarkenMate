/**
 * Token calculation utility for restaurant pricing.
 *
 * Constants:
 * - m_cost = 2.7€ (cost of one token)
 * - m_value = 5.4€ (value of one token when used)
 */

export const TOKEN_COST = 2.7;
export const TOKEN_VALUE = 5.4;

export type TokenCalculation = {
  anzahlMarken: number; // Number of tokens needed
  rueckgeld: number; // Change returned
  realGezahlt: number; // Real amount paid
};

/**
 * Calculate token requirements and real cost for a given restaurant price.
 *
 * Formula:
 * 1. anzahl_marken = floor(p / m_value) + (if (p mod m_value) > 0 then 1 else 0)
 * 2. rueckgeld = (anzahl_marken * m_value) - p
 * 3. real_gezahlt = (anzahl_marken * m_cost) - rueckgeld
 *
 * @param priceEuro - Restaurant price in euros
 * @returns TokenCalculation with anzahlMarken, rueckgeld, and realGezahlt
 */
export function calculateTokens(priceEuro: number): TokenCalculation {
  // Step 1: Calculate number of tokens needed
  const anzahlMarken =
    Math.floor(priceEuro / TOKEN_VALUE) + (priceEuro % TOKEN_VALUE > 0 ? 1 : 0);

  // Step 2: Calculate change/refund
  const rueckgeld = anzahlMarken * TOKEN_VALUE - priceEuro;

  // Step 3: Calculate real amount paid
  const realGezahlt = anzahlMarken * TOKEN_COST - rueckgeld;

  return {
    anzahlMarken,
    rueckgeld: Number(rueckgeld.toFixed(2)),
    realGezahlt: Number(realGezahlt.toFixed(2)),
  };
}

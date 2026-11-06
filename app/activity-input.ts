import { assert } from '../src/domain.ts';

// Accept integer balances as displayed by the dashboard; never guess decimals or strip arbitrary text.
export function includedCredits(input: string): number {
  const value = input.trim().replace(/[\u00a0\u202f]/g, ' ');
  assert(/^(?:[0-9]+|[1-9][0-9]{0,2}(?:,[0-9]{3})+|[1-9][0-9]{0,2}(?: [0-9]{3})+)$/.test(value),
    'TATUM_CREDITS_FORMAT');
  const credits = Number(value.replace(/[, ]/g, ''));
  assert(Number.isSafeInteger(credits) && credits >= 4, 'TATUM_FREE_ALLOWANCE');
  return credits;
}

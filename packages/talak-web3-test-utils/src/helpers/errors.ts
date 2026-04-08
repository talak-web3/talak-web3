/**
 * Error testing helpers
 */

import { expect } from 'vitest';
import { BetterWeb3Error } from '@talak-web3/errors';
import type { BetterWeb3Error as BetterWeb3ErrorType } from '@talak-web3/errors';

/**
 * Expect a function to throw an error
 */
export async function expectError(
  fn: () => Promise<unknown> | unknown,
  expectedMessage?: string | RegExp
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    const err = error as Error;
    
    if (expectedMessage) {
      if (typeof expectedMessage === 'string') {
        expect(err.message).toContain(expectedMessage);
      } else {
        expect(err.message).toMatch(expectedMessage);
      }
    }
    
    return err;
  }
}

/**
 * Expect a function to throw a BetterWeb3Error
 */
export async function expectAuthError(
  fn: () => Promise<unknown> | unknown,
  expectedCode?: string,
  expectedStatus?: number
): Promise<BetterWeb3Error> {
  const error = await expectError(fn);
  
  expect(error).toBeInstanceOf(BetterWeb3Error);
  const authError = error as BetterWeb3Error;
  
  if (expectedCode) {
    expect(authError.code).toBe(expectedCode);
  }
  
  if (expectedStatus) {
    expect(authError.status).toBe(expectedStatus);
  }
  
  return authError;
}

/**
 * Assert that an error has specific properties
 */
export function assertErrorProperties(
  error: Error,
  properties: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(properties)) {
    expect((error as unknown as Record<string, unknown>)[key]).toBe(value);
  }
}

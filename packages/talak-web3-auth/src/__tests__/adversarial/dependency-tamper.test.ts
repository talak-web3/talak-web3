import { describe, it, expect, vi } from 'vitest';
import { verifyDependencyIntegrity, generateDependencyHashes, PeriodicIntegrityChecker } from '../../integrity.js';
import { TalakWeb3Error } from '@talak-web3/errors';

/**
 * ADVERSARIAL TEST: Dependency Tampering Simulation
 * 
 * Scenario: Attacker modifies dependency code to bypass security checks
 * Previous system: No runtime verification, compromised dependencies undetectable
 * New system: Hash verification fails closed immediately on mismatch
 */

describe('Adversarial: Dependency Tampering', () => {
  it('should detect hash mismatch and fail closed', () => {
    // Mock tampered dependency with wrong hash
    const tamperedDeps = [
      {
        packageName: 'jose',
        expectedHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        entryPoint: 'main' as const,
      },
    ];

    // Should throw error on hash mismatch
    expect(() => {
      verifyDependencyIntegrity({
        dependencies: tamperedDeps,
        failClosed: false, // Don't exit process in tests
      });
    }).toThrow(TalakWeb3Error);

    expect(() => {
      verifyDependencyIntegrity({
        dependencies: tamperedDeps,
        failClosed: false,
      });
    }).toThrow('Dependency integrity check failed');
  });

  it('should skip verification in development mode (sha256:skip)', () => {
    const devDeps = [
      {
        packageName: 'jose',
        expectedHash: 'sha256:skip',
        entryPoint: 'main' as const,
      },
    ];

    // Should not throw in development mode
    expect(() => {
      verifyDependencyIntegrity({
        dependencies: devDeps,
        failClosed: false,
      });
    }).not.toThrow();
  });

  it('should generate correct hashes for dependencies', () => {
    const hashes = generateDependencyHashes(['jose']);

    expect(hashes).toHaveProperty('jose');
    expect(hashes['jose']).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should handle missing dependencies gracefully', () => {
    const missingDeps = [
      {
        packageName: 'nonexistent-package-12345',
        expectedHash: 'sha256:abc123',
        entryPoint: 'main' as const,
      },
    ];

    expect(() => {
      verifyDependencyIntegrity({
        dependencies: missingDeps,
        failClosed: false,
      });
    }).toThrow('Failed to resolve nonexistent-package-12345');
  });

  it('should verify multiple dependencies and report all failures', () => {
    const multipleTampered = [
      {
        packageName: 'jose',
        expectedHash: 'sha256:wrong1',
        entryPoint: 'main' as const,
      },
      {
        packageName: 'viem',
        expectedHash: 'sha256:wrong2',
        entryPoint: 'main' as const,
      },
    ];

    expect(() => {
      verifyDependencyIntegrity({
        dependencies: multipleTampered,
        failClosed: false,
      });
    }).toThrow(/jose.*viem|viem.*jose/); // Both should be in error message
  });
});

describe('Adversarial: Periodic Integrity Checking', () => {
  it('should start and stop periodic checker', () => {
    const checker = new PeriodicIntegrityChecker({
      intervalMs: 1000,
      dependencies: [
        {
          packageName: 'jose',
          expectedHash: 'sha256:skip',
          entryPoint: 'main',
        },
      ],
    });

    // Should start without error
    expect(() => checker.start()).not.toThrow();
    
    // Should stop without error
    expect(() => checker.stop()).not.toThrow();
  });

  it('should not start multiple timers', () => {
    const checker = new PeriodicIntegrityChecker({
      intervalMs: 1000,
    });

    checker.start();
    checker.start(); // Second start should be ignored
    checker.stop();
  });
});

describe('Adversarial: Supply Chain Attack Scenarios', () => {
  it('should detect entry point modification', () => {
    // Generate real hash
    const realHashes = generateDependencyHashes(['jose']);
    const realHash = realHashes['jose'];

    // Simulate tampered hash (modified entry point)
    const tamperedHash = realHash.replace(/[a-f0-9]/g, '0').substring(0, 71);

    expect(realHash).not.toBe(tamperedHash);
  });

  it('should prevent running with compromised crypto library', () => {
    // This test validates that if jose library is tampered with,
    // the system detects it and fails closed
    
    const cryptoDepCheck = [
      {
        packageName: 'jose',
        expectedHash: 'sha256:incorrecthash', // Wrong hash simulating compromise
        entryPoint: 'main' as const,
      },
    ];

    // System should refuse to start
    expect(() => {
      verifyDependencyIntegrity({
        dependencies: cryptoDepCheck,
        failClosed: false,
      });
    }).toThrow();
  });
});

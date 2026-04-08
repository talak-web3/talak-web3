import { describe, it, expect, beforeEach } from 'vitest';
import { betterWeb3, __resetBetterWeb3 } from '../index';

describe('betterWeb3 security', () => {
  beforeEach(() => {
    __resetBetterWeb3();
  });

  it('should throw error if private key is leaked in config', () => {
    const leakedConfig = {
      apiKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };
    
    expect(() => betterWeb3(leakedConfig)).toThrow('Potential private key leak detected in config');
  });

  it('should allow valid addresses', () => {
    const validConfig = {
      chains: [{
        id: 1,
        name: 'Mainnet',
        rpcUrls: ['https://mainnet.infura.io/v3/YOUR-PROJECT-ID'],
        nativeCurrency: { name: 'Ether', symbol: 'ETH' }
      }]
    };
    
    expect(() => betterWeb3(validConfig)).not.toThrow();
  });
});

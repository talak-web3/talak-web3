export const Templates = {
  nextjs: {
    files: {
      'package.json': JSON.stringify({
        dependencies: {
          '@talak-web3/core': 'latest',
          '@talak-web3/hooks': 'latest',
          'next': 'latest',
          'react': 'latest',
          'react-dom': 'latest'
        }
      }, null, 2),
      'talak-web3.config.ts': `import { betterWeb3 } from '@talak-web3/core';
export const b3 = betterWeb3();`,
    }
  },
  hono: {
    files: {
      'package.json': JSON.stringify({
        dependencies: {
          '@talak-web3/core': 'latest',
          'hono': 'latest'
        }
      }, null, 2)
    }
  }
};

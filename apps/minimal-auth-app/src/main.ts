import { TalakWeb3Client } from '@talak-web3/client';
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

const client = new TalakWeb3Client({
  baseUrl: 'http://localhost:8787', // Points to hono-backend
});

const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
const authSection = document.getElementById('auth-section')!;
const statusSection = document.getElementById('status-section')!;
const addressSpan = document.getElementById('user-address')!;
const sessionPre = document.getElementById('session-data')!;

async function updateUI() {
  try {
    const verifyResult = await client.verifySession();
    if (verifyResult.ok && verifyResult.payload) {
      addressSpan.innerText = verifyResult.payload.address || 'Unknown';
      sessionPre.innerText = JSON.stringify(verifyResult.payload, null, 2);
      authSection.style.display = 'none';
      statusSection.style.display = 'block';
    } else {
      authSection.style.display = 'block';
      statusSection.style.display = 'none';
    }
  } catch {
    authSection.style.display = 'block';
    statusSection.style.display = 'none';
  }
}

loginBtn.addEventListener('click', async () => {
  loginBtn.disabled = true;
  loginBtn.innerText = 'Connecting...';

  try {
    // In a real app, use window.ethereum
    // For this minimal demo, we'll assume a local mock if no provider found
    const address = '0x000000000000000000000000000000000000dEaD';
    
    // 1. Fetch Nonce
    const { nonce } = await client.getNonce(address);
    console.log('Nonce:', nonce);

    // 2. Sign Message (In a real app, prompt the user)
    // Here we simulate the SIWE message signing
    const message = `localhost:8787 wants you to sign in with your Ethereum account:\n${address}\n\nI accept the talak-web3 Terms of Service.\n\nURI: http://localhost:8787\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
    
    // 3. Login
    // Note: Signature is mock for this demo, replace with actual signMessage(message)
    const signature = '0xdeadbeef'; 
    await client.login(message, signature);
    
    await updateUI();
  } catch (err) {
    alert('Login failed: ' + (err as Error).message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerText = 'Login with Wallet (Mock)';
  }
});

logoutBtn.addEventListener('click', async () => {
  await client.logout();
  await updateUI();
});

// Initial check
updateUI();

import { BetterWeb3Client } from '@talak-web3/client';
import { createTransactionBuilder } from '@talak-web3/tx';

const client = new BetterWeb3Client({
  baseUrl: 'http://localhost:8787',
});

const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const txStatus = document.getElementById('tx-status') as HTMLDivElement;
const badge = document.getElementById('badge') as HTMLSpanElement;
const hashSmall = document.getElementById('tx-hash') as HTMLElement;

sendBtn.addEventListener('click', async () => {
  sendBtn.disabled = true;
  txStatus.style.display = 'block';
  badge.className = 'status-badge status-pending';
  badge.innerText = 'Initializing UserOp...';

  try {
    // transaction logic using the builder
    // In a real app, this would be an actual UserOperation
    badge.innerText = 'Awaiting Signature...';
    
    const result = await client.request('eth_sendUserOperation', [{
        to: '0x000000000000000000000000000000000000dEaD',
        data: '0x',
        value: '0'
    }]);

    badge.className = 'status-badge status-success';
    badge.innerText = 'Transaction Sent!';
    hashSmall.innerText = result as string;
  } catch (err) {
    alert('Transaction failed: ' + (err as Error).message);
    txStatus.style.display = 'none';
  } finally {
    sendBtn.disabled = false;
  }
});

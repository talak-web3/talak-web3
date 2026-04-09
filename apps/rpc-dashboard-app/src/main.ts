import { TalakWeb3Client } from '@talak-web3/client';

const client = new TalakWeb3Client({
  baseUrl: 'http://localhost:8787',
});

const methodInput = document.getElementById('rpc-method') as HTMLInputElement;
const paramsInput = document.getElementById('rpc-params') as HTMLInputElement;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
const outputPre = document.getElementById('rpc-output') as HTMLPreElement;

runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  outputPre.innerText = '// Executing...';

  const method = methodInput.value;
  let params = [];
  try {
     params = JSON.parse(paramsInput.value);
  } catch {
     outputPre.innerText = 'Error: Invalid JSON params';
     runBtn.disabled = false;
     return;
  }

  try {
    // This call is automatically proxied through the backend
    // If a session exists, the client adds the Bearer token and CSRF header
    const result = await client.request(method, params);
    outputPre.innerText = JSON.stringify(result, null, 2);
  } catch (err) {
    outputPre.innerText = 'Error: ' + (err as Error).message;
  } finally {
    runBtn.disabled = false;
  }
});

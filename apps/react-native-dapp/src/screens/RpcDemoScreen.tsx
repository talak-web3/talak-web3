import { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useRpc } from '@talak-web3/hooks';

export default function RpcDemoScreen() {
  const rpc = useRpc();
  const [method, setMethod] = useState('eth_blockNumber');
  const [params, setParams] = useState('[]');
  const [result, setResult] = useState<string>('—');

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>RPC Demo</Text>
      <TextInput value={method} onChangeText={setMethod} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput value={params} onChangeText={setParams} style={{ borderWidth: 1, padding: 8 }} />
      <Button
        title="Run"
        onPress={async () => {
          let parsed: unknown[] = [];
          try { parsed = JSON.parse(params) as unknown[]; } catch { parsed = []; }
          const res = await rpc.request(method, parsed);
          setResult(JSON.stringify(res));
        }}
      />
      <Text selectable>{result}</Text>
    </View>
  );
}


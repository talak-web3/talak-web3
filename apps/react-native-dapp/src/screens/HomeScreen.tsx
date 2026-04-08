import { View, Text, Button } from 'react-native';
import { useAccount, useChain } from '@talak-web3/hooks';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export default function HomeScreen({ navigation }: any) {
  const account = useAccount();
  const chain = useChain();

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>BetterWeb3 React Native Dapp</Text>
      <Text>ChainId: {chain.chainId}</Text>
      <Text>Address: {account.address ?? '—'}</Text>
      <Button
        title={account.isConnected ? 'Disconnect' : 'Connect (mock)'}
        onPress={() => (account.isConnected ? account.disconnect() : account.connect('0x000000000000000000000000000000000000dEaD'))}
      />
      <Button title="Go to RPC demo" onPress={() => navigation.navigate('RPC Demo')} />
    </View>
  );
}


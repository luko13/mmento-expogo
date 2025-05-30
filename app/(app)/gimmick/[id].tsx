import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import TrickViewScreen from '../../../components/TrickViewScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function GimmickViewRoute() {
  const params = useLocalSearchParams();
  const gimmickData = params.gimmick ? JSON.parse(params.gimmick as string) : null;
  
  if (!gimmickData) return <View />;
  
  return (
    <SafeAreaProvider>
      <TrickViewScreen trick={gimmickData} />
    </SafeAreaProvider>
  );
}
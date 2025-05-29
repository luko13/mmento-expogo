import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import TrickViewScreen from '../../../components/TrickViewScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function TrickViewRoute() {
  const params = useLocalSearchParams();
  
  // Los parámetros vienen serializados como strings
  const trickData = params.trick ? JSON.parse(params.trick as string) : null;
  
  if (!trickData) {
    return <View />;
  }
  
  return (
    <SafeAreaProvider>
      <TrickViewScreen trick={trickData} />
    </SafeAreaProvider>
  );
}
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import TrickViewScreen from '../../../components/TrickViewScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function TechniqueViewRoute() {
  const params = useLocalSearchParams();
  const techniqueData = params.technique ? JSON.parse(params.technique as string) : null;
  
  if (!techniqueData) return <View />;
  
  return (
    <SafeAreaProvider>
      <TrickViewScreen trick={techniqueData} />
    </SafeAreaProvider>
  );
}
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, View, StatusBar } from "react-native";
import { styled } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import EditMagicWizard from "../../../components/edit-magic/EditMagicWizard";

const StyledView = styled(View);

export default function EditTrickScreen() {
  const { trickId } = useLocalSearchParams();
  const router = useRouter();

  return (
    <StyledView className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#15322C" />
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient
          colors={["#15322C", "#15322C"]}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />

        <EditMagicWizard
          trickId={trickId as string}
          onComplete={(id, title) => {
            Alert.alert("Success", `"${title}" updated successfully`);
            router.back();
          }}
          onCancel={() => router.back()}
        />
      </SafeAreaView>
    </StyledView>
  );
}

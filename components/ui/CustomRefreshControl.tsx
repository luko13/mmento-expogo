// components/ui/CustomRefreshControl.tsx
import React from "react";
import { View, Text, Animated, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { fontNames } from "../../app/_layout";

interface CustomRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
}

const CustomRefreshControl: React.FC<CustomRefreshControlProps> = ({
  refreshing,
  onRefresh,
  tintColor = "#10b981",
}) => {
  // Si está refrescando, usa el RefreshControl nativo
  if (refreshing) {
    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={tintColor}
        title="Refresh..."
        titleColor="rgba(255, 255, 255, 0.6)"
      />
    );
  }

  // Si no está refrescando, muestra el indicador personalizado
  return (
    <RefreshControl
      refreshing={false}
      onRefresh={onRefresh}
      tintColor="transparent"
      style={{ backgroundColor: "transparent" }}
    >
      <View
        style={{
          position: "absolute",
          top: 20,
          left: 0,
          right: 0,
          height: 50,
          alignItems: "flex-end",
          justifyContent: "flex-end",
          flexDirection: "row",
        }}
      >
        <Text
          style={{
            fontFamily: fontNames.light,
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.6)",
            marginRight: 8,
          }}
        >
          Refresh...
        </Text>
        <Feather name="arrow-down" size={16} color="rgba(255, 255, 255, 0.6)" />
      </View>
    </RefreshControl>
  );
};

export default CustomRefreshControl;

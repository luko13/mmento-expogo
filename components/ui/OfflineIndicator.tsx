// components/ui/OfflineIndicator.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { useOfflineSync } from "../../context/OfflineSyncContext";
import { fontNames } from "../../app/_layout";

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingOperations, syncNow, syncError } = useOfflineSync();
  const [slideAnim] = useState(new Animated.Value(-100));
  const [showError, setShowError] = useState(false);

  // Animación de entrada/salida
  useEffect(() => {
    if (!isOnline || isSyncing || pendingOperations > 0 || syncError) {
      // Mostrar indicador
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      // Ocultar indicador
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, isSyncing, pendingOperations, syncError]);

  // Mostrar error temporalmente
  useEffect(() => {
    if (syncError) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [syncError]);

  const getBackgroundColor = () => {
    if (syncError && showError) return "#ef4444"; // Rojo para errores
    if (!isOnline) return "#f59e0b"; // Naranja para offline
    if (isSyncing) return "#3b82f6"; // Azul para sincronizando
    if (pendingOperations > 0) return "#10b981"; // Verde para pendientes
    return "#6b7280"; // Gris por defecto
  };

  const getMessage = () => {
    if (syncError && showError) return syncError;
    if (isSyncing) return "Sincronizando...";
    if (!isOnline && pendingOperations > 0) {
      return `Sin conexión · ${pendingOperations} ${pendingOperations === 1 ? "cambio pendiente" : "cambios pendientes"}`;
    }
    if (!isOnline) return "Sin conexión";
    if (pendingOperations > 0) {
      return `${pendingOperations} ${pendingOperations === 1 ? "cambio pendiente" : "cambios pendientes"}`;
    }
    return "";
  };

  const canSync = isOnline && !isSyncing && pendingOperations > 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={canSync ? syncNow : undefined}
        disabled={!canSync}
        activeOpacity={canSync ? 0.7 : 1}
      >
        <View style={styles.textContainer}>
          <Text style={styles.text}>{getMessage()}</Text>
          {canSync && <Text style={styles.tapText}>· Toca para sincronizar</Text>}
        </View>

        {/* Indicador de carga */}
        {isSyncing && <SyncingSpinner />}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Componente de spinner simple
function SyncingSpinner() {
  const [rotation] = useState(new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
      <View style={styles.spinnerInner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: fontNames.medium,
    textAlign: "center",
  },
  tapText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fontNames.light,
    opacity: 0.9,
  },
  spinner: {
    width: 20,
    height: 20,
    marginLeft: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 10,
    borderTopColor: "#ffffff",
  },
  spinnerInner: {
    width: 16,
    height: 16,
  },
});

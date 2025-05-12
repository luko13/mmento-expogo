import { View, Text as RNText, StyleSheet } from "react-native"
import Text from "./ui/Text"

export default function FontTest() {
  return (
    <View style={styles.container}>
      <RNText style={styles.title}>Prueba de Fuentes</RNText>

      {/* Prueba 1: Text nativo con fontFamily directa */}
      <RNText style={styles.regularDirect}>1. Outfit Regular (React Native directo)</RNText>

      <RNText style={styles.boldDirect}>2. Outfit Bold (React Native directo)</RNText>

      {/* Prueba 2: Componente Text personalizado con variantes */}
      <Text variant="regular" style={styles.test}>
        3. Outfit Regular (componente Text variante)
      </Text>

      <Text variant="bold" style={styles.test}>
        4. Outfit Bold (componente Text variante)
      </Text>

      {/* Prueba 3: Componente Text con clases Tailwind */}
      <Text className="font-outfit text-base" style={styles.test}>
        5. Outfit Regular (Tailwind class)
      </Text>

      <Text className="font-outfit-bold text-base" style={styles.test}>
        6. Outfit Bold (Tailwind class)
      </Text>

      {/* Prueba 4: Texto con sombra */}
      <Text
        style={{
          fontFamily: "Outfit_700Bold",
          fontSize: 16,
          marginVertical: 8,
          color: "white",
          textShadowColor: "rgba(0, 0, 0, 0.75)",
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 3,
        }}
      >
        7. Outfit Bold con sombra (estilo directo)
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "white",
  },
  regularDirect: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    marginVertical: 8,
    color: "white",
  },
  boldDirect: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    marginVertical: 8,
    color: "white",
  },
  test: {
    marginVertical: 8,
    color: "white",
  },
})

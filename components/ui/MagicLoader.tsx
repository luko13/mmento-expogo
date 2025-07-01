// components/ui/MagicLoader.tsx
import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";

const StyledView = styled(View);

interface MagicLoaderProps {
  size?: "small" | "medium" | "large";
}

const MagicLoader: React.FC<MagicLoaderProps> = ({ size = "medium" }) => {
  // Posiciones de las estrellas dentro de la bola (solo 8 estrellas)
  const starPositions = [
    { top: "20%" as const, left: "30%" as const },
    { top: "35%" as const, left: "65%" as const },
    { top: "55%" as const, left: "25%" as const },
    { top: "70%" as const, left: "50%" as const },
    { top: "45%" as const, left: "45%" as const },
    { top: "25%" as const, left: "70%" as const },
    { top: "60%" as const, left: "70%" as const },
    { top: "50%" as const, left: "15%" as const },
  ];

  // Crear animaciones de parpadeo para cada estrella
  const twinkleAnims = useRef(
    starPositions.map(() => new Animated.Value(0))
  ).current;

  // Crear animaciones de movimiento individual para cada estrella
  const moveAnims = useRef(
    starPositions.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
    }))
  ).current;

  // Animación de brillo para el borde
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Animación de escala para efecto de respiración
  const breatheAnim = useRef(new Animated.Value(0.98)).current;

  // Animación para el brillo interior
  const innerGlowAnim = useRef(new Animated.Value(0.4)).current;

  const sizes = {
    small: 40,
    medium: 56,
    large: 72,
  };

  const ballSize = sizes[size];
  const starSize = ballSize * 0.06;

  useEffect(() => {
    // Animación de parpadeo para cada estrella con diferentes delays
    const createTwinkleAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 600 + Math.random() * 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 600 + Math.random() * 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    // Crear animaciones de movimiento aleatorio para cada estrella
    const createFloatingAnimation = (index: number) => {
      const moveAnim = moveAnims[index];

      return Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(moveAnim.x, {
              toValue: (Math.random() - 0.5) * 10, // Movimiento aleatorio en X (-5 a 5)
              duration: 3000 + Math.random() * 2000, // Duración aleatoria entre 3-5 segundos
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(moveAnim.x, {
              toValue: (Math.random() - 0.5) * 10,
              duration: 3000 + Math.random() * 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(moveAnim.y, {
              toValue: (Math.random() - 0.5) * 10, // Movimiento aleatorio en Y (-5 a 5)
              duration: 3000 + Math.random() * 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(moveAnim.y, {
              toValue: (Math.random() - 0.5) * 10,
              duration: 3000 + Math.random() * 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    // Animación de brillo del borde
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Animación de respiración más sutil
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.02,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0.98,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Animación del brillo interior
    const innerGlowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(innerGlowAnim, {
          toValue: 0.7,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(innerGlowAnim, {
          toValue: 0.4,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Iniciar animaciones de parpadeo y movimiento para cada estrella
    const animations: Animated.CompositeAnimation[] = [];

    starPositions.forEach((_, index) => {
      const twinkleDelay = Math.random() * 2000;
      animations.push(
        createTwinkleAnimation(twinkleAnims[index], twinkleDelay)
      );
      animations.push(createFloatingAnimation(index));
    });

    // Iniciar todas las animaciones
    animations.forEach((anim) => anim.start());
    glowAnimation.start();
    breatheAnimation.start();
    innerGlowAnimation.start();

    return () => {
      // Detener todas las animaciones
      animations.forEach((anim) => anim.stop());
      glowAnimation.stop();
      breatheAnimation.stop();
      innerGlowAnimation.stop();
    };
  }, [
    twinkleAnims,
    moveAnims,
    glowAnim,
    breatheAnim,
    innerGlowAnim,
    starPositions,
  ]);

  return (
    <StyledView className="items-center justify-center">
      <Animated.View
        style={{
          transform: [{ scale: breatheAnim }],
        }}
      >
        {/* Bola de cristal principal */}
        <View
          style={{
            width: ballSize,
            height: ballSize,
            borderRadius: ballSize / 2,
            overflow: "hidden",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 2.5,
            borderColor: "rgba(255, 255, 255, 0.4)",
          }}
        >
          {/* Efecto de cristal con blur */}
          <BlurView
            intensity={50}
            tint="light"
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
            }}
          />
          {/* Reflejo curvo lateral */}
          <View
            style={{
              position: "absolute",
              top: "15%",
              right: "15%",
              width: "40%",
              height: "40%",
              borderWidth: 2,
              borderColor: "rgba(255, 255, 255, 0.3)",
              borderRadius: ballSize * 0.5,
              borderTopWidth: 0,
              borderLeftWidth: 0,
              borderBottomWidth: 0,
              transform: [{ rotate: "-45deg" }],
            }}
          />

          {/* Contenedor de estrellas SIN rotación */}
          <View
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
            }}
          >
            {/* Estrellas con movimiento individual */}
            {starPositions.map((pos, index) => {
              const moveAnim = moveAnims[index];

              return (
                <Animated.View
                  key={index}
                  style={{
                    position: "absolute",
                    top: pos.top,
                    left: pos.left,
                    opacity: twinkleAnims[index],
                    transform: [
                      { translateX: moveAnim.x },
                      { translateY: moveAnim.y },
                    ],
                  }}
                >
                  <View
                    style={{ alignItems: "center", justifyContent: "center" }}
                  >
                    {/* Punto central de la estrella */}
                    <View
                      style={{
                        position: "absolute",
                        width: 3,
                        height: 3,
                        backgroundColor: "rgba(255, 255, 255, 1)",
                        borderRadius: 1.5,
                      }}
                    />
                    {/* Brillo alrededor */}
                    <View
                      style={{
                        position: "absolute",
                        width: starSize * 1.5,
                        height: starSize * 1.5,
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: starSize * 0.75,
                      }}
                    />
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </StyledView>
  );
};

export default MagicLoader;

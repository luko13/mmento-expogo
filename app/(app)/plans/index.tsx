"use client";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { styled } from "nativewind";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { fontNames } from "../../../app/_layout";
import { supabase } from "../../../lib/supabase";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

interface Plan {
  id: string;
  name: string;
  type: "free" | "member";
  price: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Plan",
    type: "free",
    price: "€0",
    features: [
      "Hasta 10 trucos",
      "Almacenamiento limitado",
      "Funciones básicas",
      "Sin anuncios",
    ],
  },
  {
    id: "member",
    name: "Member Plan",
    type: "member",
    price: "€4.99/mes",
    features: [
      "Trucos ilimitados",
      "Almacenamiento ilimitado",
      "Todas las funciones premium",
      "Soporte prioritario",
      "Acceso anticipado a nuevas funciones",
      "Marco verde neón en perfil",
    ],
    popular: true,
  },
];

export default function PlansScreen() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<"free" | "member">("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("subscription_type")
          .eq("id", user.id)
          .single();

        if (!error && profileData) {
          setCurrentPlan(profileData.subscription_type);
        }
      }
    } catch (error) {
      console.error("Error fetching current plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planType: "free" | "member") => {
    if (planType === currentPlan) {
      return;
    }

    // TODO: Implementar lógica de cambio de plan con Stripe/sistema de pagos
    console.log("Cambiar a plan:", planType);
  };

  if (loading) {
    return (
      <StyledView className="flex-1" style={{ backgroundColor: "#15322C" }}>
        <StatusBar barStyle="light-content" backgroundColor="#15322C" />
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5BB9A3" />
        </StyledView>
      </StyledView>
    );
  }

  return (
    <StyledView className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#15322C" />
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

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <StyledView className="flex-row items-center px-5 py-4">
          <StyledTouchableOpacity
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </StyledTouchableOpacity>
          <StyledText
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontFamily: fontNames.semiBold,
              includeFontPadding: false,
            }}
          >
            Planes de Suscripción
          </StyledText>
        </StyledView>

        <StyledScrollView className="flex-1 px-5">
          {/* Header Text */}
          <StyledView className="mb-6">
            <StyledText
              className="text-center mb-2"
              style={{
                color: "#FFFFFF",
                fontSize: 24,
                fontFamily: fontNames.bold,
                includeFontPadding: false,
              }}
            >
              Elige tu plan
            </StyledText>
            <StyledText
              className="text-center"
              style={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: 16,
                fontFamily: fontNames.regular,
                includeFontPadding: false,
              }}
            >
              Selecciona el plan que mejor se adapte a tus necesidades
            </StyledText>
          </StyledView>

          {/* Plans */}
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.type === currentPlan;
            const isPremium = plan.type === "member";

            return (
              <StyledView
                key={plan.id}
                className="mb-4 rounded-2xl overflow-hidden"
                style={{
                  borderWidth: 2,
                  borderColor: isPremium ? "#5BB9A3" : "rgba(255, 255, 255, 0.3)",
                  ...(isPremium && {
                    shadowColor: "#5BB9A3",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 5,
                  }),
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <StyledView
                    className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full"
                    style={{ backgroundColor: "#5BB9A3" }}
                  >
                    <StyledText
                      style={{
                        color: "#FFFFFF",
                        fontSize: 12,
                        fontFamily: fontNames.semiBold,
                        includeFontPadding: false,
                      }}
                    >
                      Popular
                    </StyledText>
                  </StyledView>
                )}

                <StyledView className="p-5">
                  {/* Plan Name and Price */}
                  <StyledText
                    style={{
                      color: "#FFFFFF",
                      fontSize: 22,
                      fontFamily: fontNames.bold,
                      includeFontPadding: false,
                      marginBottom: 4,
                    }}
                  >
                    {plan.name}
                  </StyledText>
                  <StyledText
                    style={{
                      color: isPremium ? "#5BB9A3" : "rgba(255, 255, 255, 0.6)",
                      fontSize: 28,
                      fontFamily: fontNames.bold,
                      includeFontPadding: false,
                      marginBottom: 16,
                    }}
                  >
                    {plan.price}
                  </StyledText>

                  {/* Features */}
                  <StyledView className="mb-4">
                    {plan.features.map((feature, index) => (
                      <StyledView
                        key={index}
                        className="flex-row items-center mb-3"
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={isPremium ? "#5BB9A3" : "rgba(255, 255, 255, 0.6)"}
                        />
                        <StyledText
                          className="ml-2"
                          style={{
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: 14,
                            fontFamily: fontNames.regular,
                            includeFontPadding: false,
                            flex: 1,
                          }}
                        >
                          {feature}
                        </StyledText>
                      </StyledView>
                    ))}
                  </StyledView>

                  {/* Select Button */}
                  <StyledTouchableOpacity
                    onPress={() => handleSelectPlan(plan.type)}
                    disabled={isCurrentPlan}
                    className="rounded-xl py-3"
                    style={{
                      backgroundColor: isCurrentPlan
                        ? "rgba(255, 255, 255, 0.1)"
                        : isPremium
                        ? "#5BB9A3"
                        : "rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <StyledText
                      className="text-center"
                      style={{
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontFamily: fontNames.semiBold,
                        includeFontPadding: false,
                      }}
                    >
                      {isCurrentPlan ? "Plan Actual" : "Seleccionar Plan"}
                    </StyledText>
                  </StyledTouchableOpacity>
                </StyledView>
              </StyledView>
            );
          })}

          {/* Info Text */}
          <StyledView className="mb-8 p-4 rounded-xl" style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}>
            <StyledView className="flex-row items-start">
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="rgba(255, 255, 255, 0.6)"
                style={{ marginTop: 2, marginRight: 8 }}
              />
              <StyledText
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: 12,
                  fontFamily: fontNames.regular,
                  includeFontPadding: false,
                  flex: 1,
                }}
              >
                Puedes cambiar o cancelar tu suscripción en cualquier momento. Los
                cambios se aplicarán al inicio del siguiente período de facturación.
              </StyledText>
            </StyledView>
          </StyledView>
        </StyledScrollView>
      </SafeAreaView>
    </StyledView>
  );
}

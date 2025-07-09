import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Keyboard,
} from "react-native";
import { styled } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { fontNames } from "../../_layout";
import ChatService from "../../../services/chatService";
import { SecurityManager } from "../../../utils/security";
import AudioRecorder from "../../../components/mmento-ai/AudioRecorder";
import MessageBubble from "../../../components/mmento-ai/MessageBubble";
import ConversationList from "../../../components/mmento-ai/ConversationList";
import { supabase } from "../../../lib/supabase";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function MmentoAI() {
  const { t } = useTranslation();
  const router = useRouter();
  const chatService = ChatService.getInstance();
  const flatListRef = useRef<FlatList>(null);

  // Estados
  const [userId, setUserId] = useState<string>("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [userLimits, setUserLimits] = useState<any>(null);
  const [error, setError] = useState<string>("");

  // Cargar datos iniciales
  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      setIsLoading(true);

      // Verificar autenticación
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert(t("error"), t("notAuthenticated"));
        return;
      }

      setUserId(user.id);

      // Cargar límites del usuario
      const limits = await chatService.checkUserLimit(user.id);
      setUserLimits(limits);

      // Cargar conversaciones
      const convs = await chatService.getConversations(user.id);
      setConversations(convs);

      // Si no hay conversaciones, crear una nueva
      if (convs.length === 0) {
        await createNewConversation(user.id);
      } else {
        // Cargar la conversación más reciente
        await selectConversation(convs[0]);
      }
    } catch (error: any) {
      console.error("Error inicializando chat:", error);
      setError(error.message || t("errorLoadingChat"));
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async (userIdParam?: string) => {
    try {
      const effectiveUserId = userIdParam || userId;
      if (!effectiveUserId) {
        console.error("No userId disponible");
        return;
      }

      const title = `${t("chat") as string} ${new Date().toLocaleDateString()}`;
      const newConv = await chatService.createConversation(
        effectiveUserId,
        title
      );

      setConversations([newConv, ...conversations]);
      setCurrentConversation(newConv);
      setMessages([]);
    } catch (error: any) {
      console.error("Error creando conversación:", error);
      setError(error.message);
    }
  };

  const selectConversation = async (conversation: any) => {
    try {
      setCurrentConversation(conversation);
      setShowConversations(false);

      // Cargar mensajes
      const msgs = await chatService.getMessages(conversation.id);
      setMessages(msgs);

      // Scroll al final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error("Error cargando conversación:", error);
      setError(error.message);
    }
  };

  const sendMessage = async (content: string, audioUrl?: string) => {
    console.log("sendMessage llamado con:", { content, audioUrl });

    // Validaciones mejoradas
    if (!content || typeof content !== "string") {
      console.error("Contenido inválido:", content);
      return;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      console.log("Mensaje vacío después de trim");
      return;
    }

    if (!currentConversation) {
      console.error("No hay conversación actual");
      setError(t("noConversationSelected"));
      return;
    }

    if (isSending) {
      console.log("Ya se está enviando un mensaje");
      return;
    }

    if (!userLimits?.can_query) {
      console.log("Usuario no puede hacer consultas", userLimits);
      setError(t("dailyLimitReached"));
      return;
    }

    // Limpiar error previo
    setError("");

    // Verificar rate limiting local
    const canProceed = await SecurityManager.checkRateLimit(userId);
    if (!canProceed) {
      setError(t("tooManyRequests"));
      return;
    }

    // Sanitizar y validar contenido
    const sanitized = SecurityManager.sanitizeInput(trimmedContent);
    if (!SecurityManager.validateContent(sanitized)) {
      setError(t("invalidContent"));
      return;
    }

    try {
      setIsSending(true);
      setInputText(""); // Limpiar input inmediatamente
      Keyboard.dismiss();

      // Añadir mensaje temporal del usuario
      const tempUserMessage = {
        id: `temp-user-${Date.now()}`,
        role: "user" as const,
        content: sanitized,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempUserMessage]);

      // Scroll al final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Añadir mensaje temporal de "escribiendo..."
      const tempAssistantMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: "assistant" as const,
        content: "...",
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempAssistantMessage]);

      // Enviar mensaje
      const response = await chatService.sendMessage(
        userId,
        currentConversation.id,
        sanitized,
        audioUrl
      );

      // Actualizar mensajes (eliminar temporales)
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));

      // Obtener mensajes actualizados
      const updatedMessages = await chatService.getMessages(
        currentConversation.id
      );
      setMessages(updatedMessages);

      // Actualizar límites
      const limits = await chatService.checkUserLimit(userId);
      setUserLimits(limits);

      // Scroll al final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error("Error enviando mensaje:", error);

      // Traducir el error si es una clave conocida
      let errorMessage = error.message;

      // Intentar traducir el mensaje de error
      const translatedError = t(error.message, { defaultValue: "" });
      if (translatedError) {
        errorMessage = translatedError;
      }

      setError(errorMessage);

      // Eliminar mensajes temporales
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    } finally {
      setIsSending(false);
    }
  };

  const handleAudioTranscription = (text: string) => {
    setInputText(text);
    // Opcionalmente, enviar automáticamente
    // sendMessage(text);
  };

  const renderHeader = () => (
    <StyledView className="flex-row items-center justify-between p-4 border-b border-white/20">
      <StyledView className="flex-row items-center flex-1">
        <StyledTouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="white" />
        </StyledTouchableOpacity>

        <StyledTouchableOpacity
          onPress={() => setShowConversations(true)}
          className="flex-row items-center flex-1"
        >
          <Ionicons name="menu" size={24} color="white" />
          <StyledText
            className="text-white ml-3 flex-1"
            style={{
              fontFamily: fontNames.medium,
              fontSize: 18,
            }}
            numberOfLines={1}
          >
            {currentConversation?.title || t("newChat")}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>

      <StyledTouchableOpacity
        onPress={() => createNewConversation()}
        className="ml-2"
      >
        <Ionicons name="add-circle-outline" size={24} color="white" />
      </StyledTouchableOpacity>
    </StyledView>
  );

  const renderLimitsBar = () => {
    if (!userLimits) return null;
  
    // Si es desarrollador, mostrar barra especial
    if (userLimits.is_developer || userLimits.queries_limit > 1000) {
      return (
        <StyledView className="px-4 py-2 border-b border-white/10">
          <StyledView className="flex-row items-center justify-between">
            <StyledView className="flex-row items-center">
              <Ionicons name="code-slash" size={16} color="#10b981" />
              <StyledText
                className="text-emerald-400 text-xs ml-2"
                style={{ fontFamily: fontNames.medium }}
              >
                Developer Mode - Consultas ilimitadas
              </StyledText>
            </StyledView>
            <StyledView className="flex-row items-center">
              <Ionicons name="infinite" size={16} color="#10b981" />
            </StyledView>
          </StyledView>
        </StyledView>
      );
    }
  
    // Código original para usuarios normales
    const percentage =
      (userLimits.queries_today / userLimits.queries_limit) * 100;
    const remaining = userLimits.queries_limit - userLimits.queries_today;
  
    return (
      <StyledView className="px-4 py-2 border-b border-white/10">
        <StyledView className="flex-row items-center justify-between mb-1">
          <StyledText
            className="text-white/60 text-xs"
            style={{ fontFamily: fontNames.regular }}
          >
            {userLimits.is_plus ? t("plusPlan") : t("freePlan")}
          </StyledText>
          <StyledText
            className="text-white/60 text-xs"
            style={{ fontFamily: fontNames.regular }}
          >
            {t("queriesRemaining", { count: remaining })}
          </StyledText>
        </StyledView>
  
        <StyledView className="h-1 bg-white/10 rounded-full overflow-hidden">
          <StyledView
            className={`h-full ${
              percentage > 80 ? "bg-red-500" : "bg-emerald-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </StyledView>
  
        {!userLimits.is_plus && remaining === 0 && (
          <StyledTouchableOpacity className="mt-2">
            <StyledText
              className="text-emerald-400 text-xs text-center"
              style={{ fontFamily: fontNames.medium }}
            >
              {t("upgradeToPlusForMore")} →
            </StyledText>
          </StyledTouchableOpacity>
        )}
      </StyledView>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    if (item.content === "...") {
      return (
        <StyledView className="px-4 py-2 items-start">
          <StyledView className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/10 rounded-tl-sm">
            <ActivityIndicator size="small" color="#10b981" />
          </StyledView>
        </StyledView>
      );
    }

    return <MessageBubble message={item} />;
  };

  const renderEmpty = () => (
    <StyledView className="flex-1 justify-center items-center p-8">
      <MaterialIcons
        name="auto-fix-high"
        size={48}
        color="rgba(255,255,255,0.3)"
      />
      <StyledText
        className="text-white/60 text-center mt-4"
        style={{
          fontFamily: fontNames.light,
          fontSize: 16,
        }}
      >
        {t("aiWelcomeMessage")}
      </StyledText>
      <StyledView className="mt-6 space-y-2">
        <StyledText
          className="text-white/40 text-sm"
          style={{ fontFamily: fontNames.regular }}
        >
          {t("tryAsking")}
        </StyledText>
        <StyledText
          className="text-white/50 text-sm"
          style={{ fontFamily: fontNames.light }}
        >
          • {t("exampleQuestion1")}
        </StyledText>
        <StyledText
          className="text-white/50 text-sm"
          style={{ fontFamily: fontNames.light }}
        >
          • {t("exampleQuestion2")}
        </StyledText>
        <StyledText
          className="text-white/50 text-sm"
          style={{ fontFamily: fontNames.light }}
        >
          • {t("exampleQuestion3")}
        </StyledText>
      </StyledView>
    </StyledView>
  );

  const renderInput = () => (
    <StyledView className="p-4 border-t border-white/20">
      <StyledView className="flex-row items-end">
        <StyledView className="flex-1 bg-white/10 rounded-2xl px-4 py-2 mr-2">
          <StyledTextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t("writeYourQuestion")}
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            maxLength={2000}
            style={{
              fontFamily: fontNames.regular,
              fontSize: 16,
              color: "white",
              maxHeight: 100,
            }}
            editable={!isSending && userLimits?.can_query}
            onSubmitEditing={() => {
              if (inputText.trim() && !isSending && userLimits?.can_query) {
                sendMessage(inputText);
              }
            }}
            blurOnSubmit={false}
          />
        </StyledView>

        <AudioRecorder
          onTranscription={handleAudioTranscription}
          disabled={isSending || !userLimits?.can_query}
        />

        <StyledTouchableOpacity
          onPress={() => {
            if (
              inputText.trim() &&
              !isSending &&
              userLimits?.can_query &&
              currentConversation
            ) {
              sendMessage(inputText);
            }
          }}
          disabled={!inputText.trim() || isSending || !userLimits?.can_query}
          className={`ml-2 w-12 h-12 rounded-full justify-center items-center ${
            inputText.trim() && !isSending && userLimits?.can_query
              ? "bg-emerald-500"
              : "bg-white/20"
          }`}
          activeOpacity={0.7}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </StyledTouchableOpacity>
      </StyledView>
    </StyledView>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <StyledText
            className="text-white mt-4"
            style={{ fontFamily: fontNames.regular }}
          >
            {t("loadingAI")}
          </StyledText>
        </StyledView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StyledView className="flex-1">
          {renderHeader()}
          {renderLimitsBar()}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{ flexGrow: 1 }}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          />

          {error && (
            <StyledView className="px-4 py-2 bg-red-500/20">
              <StyledText
                className="text-red-400 text-sm"
                style={{ fontFamily: fontNames.regular }}
              >
                {error}
              </StyledText>
            </StyledView>
          )}

          {renderInput()}
        </StyledView>

        {/* Modal de conversaciones */}
        <Modal
          visible={showConversations}
          transparent
          animationType="slide"
          onRequestClose={() => setShowConversations(false)}
        >
          <ConversationList
            conversations={conversations}
            currentId={currentConversation?.id}
            onSelect={selectConversation}
            onClose={() => setShowConversations(false)}
            onCreate={() => createNewConversation()}
            chatService={chatService}
          />
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

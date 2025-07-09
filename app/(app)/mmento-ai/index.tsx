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
        await createNewConversation();
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

  const createNewConversation = async () => {
    try {
      const title = `${t("chat") as string} ${new Date().toLocaleDateString()}`;
      const newConv = await chatService.createConversation(userId, title);

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
    if (!content.trim() || !currentConversation || isSending) return;

    // Limpiar error previo
    setError("");

    // Verificar rate limiting local
    const canProceed = await SecurityManager.checkRateLimit(userId);
    if (!canProceed) {
      setError(t("tooManyRequests"));
      return;
    }

    // Sanitizar y validar contenido
    const sanitized = SecurityManager.sanitizeInput(content);
    if (!SecurityManager.validateContent(sanitized)) {
      setError(t("invalidContent"));
      return;
    }

    try {
      setIsSending(true);
      setInputText("");
      Keyboard.dismiss();

      // Añadir mensaje temporal del usuario
      const tempUserMessage = {
        id: "temp-user",
        role: "user",
        content: sanitized,
        created_at: new Date().toISOString(),
      };

      setMessages([...messages, tempUserMessage]);

      // Scroll al final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Añadir mensaje temporal de "escribiendo..."
      const tempAssistantMessage = {
        id: "temp-assistant",
        role: "assistant",
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

      // Actualizar mensajes (eliminar temporales y añadir reales)
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
      const errorMessage = t(error.message, error.message) as string;
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

      <StyledTouchableOpacity onPress={createNewConversation} className="ml-2">
        <Ionicons name="add-circle-outline" size={24} color="white" />
      </StyledTouchableOpacity>
    </StyledView>
  );

  const renderLimitsBar = () => {
    if (!userLimits) return null;

    const percentage = (userLimits.queriesToday / userLimits.limit) * 100;
    const remaining = userLimits.limit - userLimits.queriesToday;

    return (
      <StyledView className="px-4 py-2 border-b border-white/10">
        <StyledView className="flex-row items-center justify-between mb-1">
          <StyledText
            className="text-white/60 text-xs"
            style={{ fontFamily: fontNames.regular }}
          >
            {userLimits.isPlus ? t("plusPlan") : t("freePlan")}
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

        {!userLimits.isPlus && remaining === 0 && (
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
            editable={!isSending && userLimits?.canQuery}
          />
        </StyledView>

        <AudioRecorder
          onTranscription={handleAudioTranscription}
          disabled={isSending || !userLimits?.canQuery}
        />

        <StyledTouchableOpacity
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isSending || !userLimits?.canQuery}
          className={`ml-2 w-12 h-12 rounded-full justify-center items-center ${
            inputText.trim() && !isSending && userLimits?.canQuery
              ? "bg-emerald-500"
              : "bg-white/20"
          }`}
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
            onCreate={createNewConversation}
            chatService={chatService}
          />
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

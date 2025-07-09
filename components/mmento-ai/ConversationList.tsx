// components/ConversationList.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { styled } from 'nativewind';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { fontNames } from '../../app/_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatService from '../../services/chatService';
import { useTranslation } from 'react-i18next';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledBlurView = styled(BlurView);

interface ConversationListProps {
  conversations: any[];
  currentId?: string;
  onSelect: (conversation: any) => void;
  onClose: () => void;
  onCreate: () => void;
  chatService: ChatService;
}

export default function ConversationList({
  conversations,
  currentId,
  onSelect,
  onClose,
  onCreate,
  chatService,
}: ConversationListProps) {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderConversationItem = ({ item }: { item: any }) => {
    const isActive = item.id === currentId;
    const date = new Date(item.updated_at);
    const dateStr = date.toLocaleDateString(i18n.language);
    const timeStr = date.toLocaleTimeString(i18n.language, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <StyledTouchableOpacity
        onPress={() => onSelect(item)}
        onLongPress={() => showConversationOptions(item)}
        className={`px-4 py-3 border-b border-white/10 ${
          isActive ? 'bg-white/10' : ''
        }`}
      >
        <StyledView className="flex-row items-start">
          {item.is_pinned && (
            <Ionicons
              name="pin"
              size={16}
              color="#10b981"
              style={{ marginRight: 8, marginTop: 2 }}
            />
          )}
          
          <StyledView className="flex-1">
            <StyledText
              className="text-white text-base"
              style={{ fontFamily: fontNames.medium }}
              numberOfLines={1}
            >
              {item.title}
            </StyledText>
            
            <StyledView className="flex-row items-center mt-1">
              <StyledText
                className="text-white/40 text-xs"
                style={{ fontFamily: fontNames.light }}
              >
                {dateStr} • {timeStr}
              </StyledText>
              
              {item.message_count > 0 && (
                <>
                  <StyledText className="text-white/40 text-xs mx-2">•</StyledText>
                  <StyledText
                    className="text-white/40 text-xs"
                    style={{ fontFamily: fontNames.light }}
                  >
                    {item.message_count} {t('messages')}
                  </StyledText>
                </>
              )}
              
              {item.is_archived && (
                <>
                  <StyledText className="text-white/40 text-xs mx-2">•</StyledText>
                  <StyledText
                    className="text-yellow-500/60 text-xs"
                    style={{ fontFamily: fontNames.light }}
                  >
                    {t('archived')}
                  </StyledText>
                </>
              )}
            </StyledView>
          </StyledView>

          {item.folder_id && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#10b981',
                marginLeft: 8,
                marginTop: 8,
              }}
            />
          )}
        </StyledView>
      </StyledTouchableOpacity>
    );
  };

  const showConversationOptions = (conversation: any) => {
    Alert.alert(
      t('options'),
      '',
      [
        {
          text: conversation.is_pinned ? t('unpin') : t('pin'),
          onPress: () => togglePin(conversation),
        },
        {
          text: t('rename'),
          onPress: () => renameConversation(conversation),
        },
        {
          text: t('delete'),
          onPress: () => deleteConversation(conversation),
          style: 'destructive',
        },
        {
          text: t('cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const togglePin = async (conversation: any) => {
    try {
      await chatService.togglePin(conversation.id);
      // Actualizar lista local
      const updatedConversations = conversations.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, is_pinned: !conv.is_pinned }
          : conv
      );
      // Aquí deberías actualizar el estado en el componente padre
      Alert.alert(t('success'), conversation.is_pinned ? t('conversationUnpinned') : t('conversationPinned'));
    } catch (error) {
      Alert.alert(t('error'), t('errorPinning'));
    }
  };

  const renameConversation = (conversation: any) => {
    Alert.prompt(
      t('changeConversationName'),
      t('enterNewName'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('save'),
          onPress: async (newName) => {
            if (newName && newName.trim()) {
              try {
                // Aquí implementarías el cambio de nombre
                // await chatService.renameConversation(conversation.id, newName);
                Alert.alert(t('success'), t('nameUpdated'));
              } catch (error) {
                Alert.alert(t('error'), t('errorRenaming'));
              }
            }
          },
        },
      ],
      'plain-text',
      conversation.title
    );
  };

  const deleteConversation = (conversation: any) => {
    Alert.alert(
      t('deleteConversation'),
      t('deleteConversationConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteConversation(conversation.id);
              Alert.alert(t('success'), t('conversationDeleted'));
              // Si es la conversación actual, crear una nueva
              if (conversation.id === currentId) {
                onCreate();
              }
            } catch (error) {
              Alert.alert(t('error'), t('errorDeleting'));
            }
          },
        },
      ]
    );
  };

  return (
    <StyledBlurView
      intensity={40}
      tint="dark"
      className="flex-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StyledView className="flex-1">
          {/* Header */}
          <StyledView className="flex-row items-center justify-between p-4 border-b border-white/20">
            <StyledText
              className="text-white text-xl"
              style={{ fontFamily: fontNames.medium }}
            >
              {t('conversations')}
            </StyledText>
            
            <StyledTouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </StyledTouchableOpacity>
          </StyledView>

          {/* Búsqueda */}
          <StyledView className="px-4 py-3 border-b border-white/10">
            <StyledView className="flex-row items-center bg-white/10 rounded-lg px-3 py-2">
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
              <StyledTextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('searchConversations')}
                placeholderTextColor="rgba(255,255,255,0.5)"
                className="flex-1 ml-2 text-white"
                style={{
                  fontFamily: fontNames.regular,
                  fontSize: 16,
                }}
              />
            </StyledView>
          </StyledView>

          {/* Botón nueva conversación */}
          <StyledTouchableOpacity
            onPress={() => {
              onCreate();
              onClose();
            }}
            className="px-4 py-3 border-b border-white/10 flex-row items-center"
          >
            <StyledView className="w-10 h-10 bg-emerald-500 rounded-full justify-center items-center mr-3">
              <Ionicons name="add" size={20} color="white" />
            </StyledView>
            <StyledText
              className="text-white"
              style={{ fontFamily: fontNames.medium }}
            >
              {t('newConversation')}
            </StyledText>
          </StyledTouchableOpacity>

          {/* Lista de conversaciones */}
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversationItem}
            ListEmptyComponent={
              <StyledView className="flex-1 justify-center items-center p-8">
                <StyledText
                  className="text-white/40 text-center"
                  style={{ fontFamily: fontNames.light }}
                >
                  {searchQuery
                    ? t('noConversationsFound')
                    : t('noConversationsYet')}
                </StyledText>
              </StyledView>
            }
          />
        </StyledView>
      </SafeAreaView>
    </StyledBlurView>
  );
}
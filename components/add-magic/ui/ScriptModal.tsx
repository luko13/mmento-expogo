"use client"

import React, { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, Ionicons } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from "../../../lib/supabase"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)
const StyledModal = styled(Modal)
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView)

interface ScriptData {
  id?: string
  title: string
  content: string
}

interface ScriptModalProps {
  visible: boolean
  onClose: () => void
  scriptData: ScriptData
  onSave: (scriptId: string) => void
  trickId?: string
  userId?: string
  trickTitle?: string
}

export default function ScriptModal({
  visible,
  onClose,
  scriptData: initialScriptData,
  onSave,
  trickId,
  userId,
  trickTitle = ""
}: ScriptModalProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [scriptData, setScriptData] = useState<ScriptData>(initialScriptData)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize script data when modal opens
  useEffect(() => {
    if (visible) {
      setScriptData(initialScriptData)
      setHasChanges(false)
    }
  }, [visible, initialScriptData])

  // Update script data
  const updateScriptData = (field: keyof ScriptData, value: string) => {
    setScriptData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  // Save script
  const handleSave = async () => {
    try {
      if (!scriptData.title.trim()) {
        // If no title, use "Script for [trick name]"
        setScriptData(prev => ({
          ...prev,
          title: t('scriptForTrick', 'Script for {{trickName}}', { trickName: trickTitle || t('unknownTrick', 'Unknown Trick') })
        }))
      }

      if (!scriptData.content.trim()) {
        // Don't save if content is empty
        onClose()
        return
      }

      setIsSaving(true)
      
      let scriptId = scriptData.id
      
      if (scriptId) {
        // Update existing script
        const { error } = await supabase
          .from('scripts')
          .update({
            title: scriptData.title.trim() || t('scriptForTrick', 'Script for {{trickName}}', { trickName: trickTitle || t('unknownTrick', 'Unknown Trick') }),
            content: scriptData.content,
            updated_at: new Date()
          })
          .eq('id', scriptId)
        
        if (error) throw error
      } else {
        // Create new script
        const { data, error } = await supabase
          .from('scripts')
          .insert({
            title: scriptData.title.trim() || t('scriptForTrick', 'Script for {{trickName}}', { trickName: trickTitle || t('unknownTrick', 'Unknown Trick') }),
            content: scriptData.content,
            trick_id: trickId || null,
            user_id: userId || null,
            language: 'es' // Default language
          })
          .select('id')
          .single()
        
        if (error) throw error
        if (data) {
          scriptId = data.id
        }
      }
      
      // Call onSave with the script ID
      if (scriptId) {
        onSave(scriptId)
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving script:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle cancel with confirm if there are changes
  const handleCancel = () => {
    if (hasChanges) {
      // Could show a confirmation dialog here
      // For now, just close
    }
    onClose()
  }

  return (
    <StyledModal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCancel}
    >
      <StyledView className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Background gradient */}
        <LinearGradient
          colors={['#064e3b', '#065f46']} 
          style={{ 
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />

        {/* Header */}
        <StyledView className="flex-row items-center justify-between px-4 py-3">
          <StyledTouchableOpacity 
            onPress={handleCancel}
            className="p-2"
          >
            <Feather name="x" size={24} color="white" />
          </StyledTouchableOpacity>
          
          <StyledView className="flex-1 items-center mx-4">
            <StyledText className="text-white text-lg font-semibold">
              {t('script', 'Script')}
            </StyledText>
            <StyledText className="text-emerald-200 text-sm opacity-70">
              {trickTitle ? `[${trickTitle}]` : ''}
            </StyledText>
          </StyledView>
          
          <StyledTouchableOpacity 
            onPress={handleSave}
            disabled={isSaving}
            className="p-2"
          >
            <Feather name="check" size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Content */}
        <StyledKeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <StyledScrollView className="flex-1 px-6">
            {/* Title Input */}
            <StyledView className="mt-6 mb-4">
              <StyledText className="text-white/80 text-sm mb-2 ml-1">
                {t('title', 'Title')}
              </StyledText>
              <StyledTextInput
                className="bg-white/10 border border-white/20 rounded-lg p-3 text-white"
                placeholder={t('scriptTitle', 'Script Title')}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={scriptData.title}
                onChangeText={(text) => updateScriptData('title', text)}
              />
            </StyledView>
            
            {/* Content Input */}
            <StyledView className="mb-6 flex-1">
              <StyledText className="text-white/80 text-sm mb-2 ml-1">
                {t('content', 'Content')}
              </StyledText>
              <StyledTextInput
                className="bg-white/10 border border-white/20 rounded-lg p-3 text-white min-h-[300px]"
                placeholder={t('scriptContent', 'Write your performance script here...')}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={scriptData.content}
                onChangeText={(text) => updateScriptData('content', text)}
                multiline
                textAlignVertical="top"
                autoFocus={!scriptData.content}
              />
            </StyledView>
            
            {/* Save Button */}
            <StyledTouchableOpacity
              className={`w-full py-4 rounded-lg items-center justify-center flex-row mb-6 ${
                isSaving ? 'bg-white/20' : 'bg-emerald-700'
              }`}
              onPress={handleSave}
              disabled={isSaving}
            >
              <StyledText className="text-white font-semibold text-base">
                {isSaving ? t('saving', 'Saving...') : t('saveScript', 'Save Script')}
              </StyledText>
              {isSaving && (
                <Ionicons name="refresh" size={20} color="white" style={{ marginLeft: 8 }} />
              )}
            </StyledTouchableOpacity>
          </StyledScrollView>
        </StyledKeyboardAvoidingView>
      </StyledView>
    </StyledModal>
  )
}
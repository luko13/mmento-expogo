"use client"

import React, { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, ActivityIndicator } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, Ionicons } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from "react-native-safe-area-context"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)
const StyledModal = styled(Modal)
const StyledActivityIndicator = styled(ActivityIndicator)

// Define interface for gimmick
interface Gimmick {
  id: string
  name: string
  description?: string
}

interface GimmicksModalProps {
  visible: boolean
  onClose: () => void
  gimmicks: Gimmick[]
  selectedGimmicks: Gimmick[]
  onSave: (gimmickIds: string[]) => void
  onToggleSelection: (gimmick: Gimmick) => void
  trickTitle?: string
}

export default function GimmicksModal({
  visible,
  onClose,
  gimmicks,
  selectedGimmicks,
  onSave,
  onToggleSelection,
  trickTitle = ""
}: GimmicksModalProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredGimmicks, setFilteredGimmicks] = useState<Gimmick[]>(gimmicks)
  const [localSelectedGimmicks, setLocalSelectedGimmicks] = useState<Gimmick[]>(selectedGimmicks)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize when modal opens or gimmicks/selectedGimmicks change
  useEffect(() => {
    if (visible) {
      setLocalSelectedGimmicks(selectedGimmicks)
      setFilteredGimmicks(gimmicks)
      setSearchQuery("")
    }
  }, [visible, gimmicks, selectedGimmicks])

  // Filter gimmicks based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredGimmicks(gimmicks)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = gimmicks.filter(gimmick => 
        gimmick.name.toLowerCase().includes(query) || 
        (gimmick.description && gimmick.description.toLowerCase().includes(query))
      )
      setFilteredGimmicks(filtered)
    }
  }, [searchQuery, gimmicks])

  // Toggle selection of a gimmick
  const toggleGimmickSelection = (gimmick: Gimmick) => {
    const isSelected = localSelectedGimmicks.some(g => g.id === gimmick.id)
    
    if (isSelected) {
      setLocalSelectedGimmicks(localSelectedGimmicks.filter(g => g.id !== gimmick.id))
    } else {
      setLocalSelectedGimmicks([...localSelectedGimmicks, gimmick])
    }

    // Also call the parent's toggle function to keep the state synchronized
    onToggleSelection(gimmick)
  }

  // Save selected gimmicks
  const handleSave = () => {
    const gimmickIds = localSelectedGimmicks.map(g => g.id)
    onSave(gimmickIds)
    onClose()
  }

  return (
    <StyledModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <StyledView className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Background gradient */}
        <LinearGradient
          colors={['#15322C', '#15322C']} 
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
            onPress={onClose}
            className="p-2"
          >
            <Feather name="chevron-left" size={24} color="white" />
          </StyledTouchableOpacity>
          
          <StyledView className="flex-1 items-center mx-4">
            <StyledText className="text-white text-lg font-semibold">
              {t('selectGimmicks', 'Select Gimmicks')}
            </StyledText>
            <StyledText className="text-emerald-200 text-sm opacity-70">
              {trickTitle ? `[${trickTitle}]` : ''}
            </StyledText>
          </StyledView>
          
          <StyledTouchableOpacity 
            onPress={handleSave}
            className="p-2"
          >
            <Feather name="check" size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>

        {/* Search Bar */}
        <StyledView className="px-4 mb-2">
          <StyledView className="flex-row items-center bg-white/10 rounded-lg px-3 py-2">
            <Feather name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
            <StyledTextInput
              className="flex-1 text-white ml-2 h-10"
              placeholder={t('searchGimmicks', 'Search gimmicks...')}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <StyledTouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color="rgba(255, 255, 255, 0.7)" />
              </StyledTouchableOpacity>
            )}
          </StyledView>
        </StyledView>

        {/* Selected Count */}
        <StyledView className="flex-row justify-between items-center px-4 pb-2">
          <StyledText className="text-white/70">
            {localSelectedGimmicks.length > 0 
              ? t('gimmicksSelected', '{{count}} gimmicks selected', { count: localSelectedGimmicks.length })
              : t('noGimmicksSelected', 'No gimmicks selected')
            }
          </StyledText>
        </StyledView>

        {/* Gimmicks List */}
        {isLoading ? (
          <StyledView className="flex-1 justify-center items-center">
            <StyledActivityIndicator size="large" color="#ffffff" />
          </StyledView>
        ) : (
          <StyledScrollView className="flex-1 px-4">
            {filteredGimmicks.length === 0 ? (
              <StyledView className="flex-1 justify-center items-center py-12">
                <Feather name="alert-circle" size={48} color="rgba(255, 255, 255, 0.5)" />
                <StyledText className="text-white/70 mt-4 text-center">
                  {searchQuery 
                    ? t('noMatchingGimmicks', 'No gimmicks match your search')
                    : t('noGimmicksAvailable', 'No gimmicks available')
                  }
                </StyledText>
              </StyledView>
            ) : (
              filteredGimmicks.map((gimmick) => (
                <StyledTouchableOpacity
                  key={gimmick.id}
                  className={`p-4 mb-2 rounded-lg flex-row items-center justify-between border ${
                    localSelectedGimmicks.some(g => g.id === gimmick.id)
                      ? 'bg-emerald-700/50 border-emerald-500'
                      : 'bg-white/10 border-white/20'
                  }`}
                  onPress={() => toggleGimmickSelection(gimmick)}
                >
                  <StyledView className="flex-1 mr-3">
                    <StyledText className="text-white font-semibold text-base">
                      {gimmick.name}
                    </StyledText>
                    {gimmick.description && (
                      <StyledText className="text-white/70 text-sm mt-1">
                        {gimmick.description}
                      </StyledText>
                    )}
                  </StyledView>
                  
                  <StyledView className={`w-6 h-6 rounded-full border items-center justify-center ${
                    localSelectedGimmicks.some(g => g.id === gimmick.id)
                      ? 'bg-emerald-500 border-white'
                      : 'border-white/50'
                  }`}>
                    {localSelectedGimmicks.some(g => g.id === gimmick.id) && (
                      <Feather name="check" size={16} color="white" />
                    )}
                  </StyledView>
                </StyledTouchableOpacity>
              ))
            )}
            
            {/* Save Button at the bottom */}
            <StyledTouchableOpacity
              className={`w-full py-4 rounded-lg items-center justify-center flex-row my-6 
              ${localSelectedGimmicks.length > 0 ? 'bg-emerald-600' : 'bg-gray-600'}`}
              onPress={handleSave}
              disabled={localSelectedGimmicks.length === 0}
            >
              <StyledText className="text-white font-semibold text-base">
                {t('saveGimmicks', 'Save Gimmicks')}
              </StyledText>
            </StyledTouchableOpacity>
          </StyledScrollView>
        )}
      </StyledView>
    </StyledModal>
  )
}
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

// Define interface for technique
interface Technique {
  id: string
  name: string
  description?: string
}

interface TechniquesModalProps {
  visible: boolean
  onClose: () => void
  techniques: Technique[]
  selectedTechniques: Technique[]
  onSave: (techniqueIds: string[]) => void
  onToggleSelection: (technique: Technique) => void
  trickTitle?: string
}

export default function TechniquesModal({
  visible,
  onClose,
  techniques,
  selectedTechniques,
  onSave,
  onToggleSelection,
  trickTitle = ""
}: TechniquesModalProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredTechniques, setFilteredTechniques] = useState<Technique[]>(techniques)
  const [localSelectedTechniques, setLocalSelectedTechniques] = useState<Technique[]>(selectedTechniques)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize when modal opens or techniques/selectedTechniques change
  useEffect(() => {
    if (visible) {
      setLocalSelectedTechniques(selectedTechniques)
      setFilteredTechniques(techniques)
      setSearchQuery("")
    }
  }, [visible, techniques, selectedTechniques])

  // Filter techniques based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTechniques(techniques)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = techniques.filter(technique => 
        technique.name.toLowerCase().includes(query) || 
        (technique.description && technique.description.toLowerCase().includes(query))
      )
      setFilteredTechniques(filtered)
    }
  }, [searchQuery, techniques])

  // Toggle selection of a technique
  const toggleTechniqueSelection = (technique: Technique) => {
    const isSelected = localSelectedTechniques.some(t => t.id === technique.id)
    
    if (isSelected) {
      setLocalSelectedTechniques(localSelectedTechniques.filter(t => t.id !== technique.id))
    } else {
      setLocalSelectedTechniques([...localSelectedTechniques, technique])
    }

    // Also call the parent's toggle function to keep the state synchronized
    onToggleSelection(technique)
  }

  // Save selected techniques
  const handleSave = () => {
    const techniqueIds = localSelectedTechniques.map(t => t.id)
    onSave(techniqueIds)
    onClose()
  }

  return (
    <StyledModal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
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
            onPress={onClose}
            className="p-2"
          >
            <Feather name="chevron-left" size={24} color="white" />
          </StyledTouchableOpacity>
          
          <StyledView className="flex-1 items-center mx-4">
            <StyledText className="text-white text-lg font-semibold">
              {t('selectTechniques', 'Select Techniques')}
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
              placeholder={t('searchTechniques', 'Search techniques...')}
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
            {localSelectedTechniques.length > 0 
              ? t('techniquesSelected', '{{count}} techniques selected', { count: localSelectedTechniques.length })
              : t('noTechniquesSelected', 'No techniques selected')
            }
          </StyledText>
        </StyledView>

        {/* Techniques List */}
        {isLoading ? (
          <StyledView className="flex-1 justify-center items-center">
            <StyledActivityIndicator size="large" color="#ffffff" />
          </StyledView>
        ) : (
          <StyledScrollView className="flex-1 px-4">
            {filteredTechniques.length === 0 ? (
              <StyledView className="flex-1 justify-center items-center py-12">
                <Feather name="alert-circle" size={48} color="rgba(255, 255, 255, 0.5)" />
                <StyledText className="text-white/70 mt-4 text-center">
                  {searchQuery 
                    ? t('noMatchingTechniques', 'No techniques match your search')
                    : t('noTechniquesAvailable', 'No techniques available')
                  }
                </StyledText>
              </StyledView>
            ) : (
              filteredTechniques.map((technique) => (
                <StyledTouchableOpacity
                  key={technique.id}
                  className={`p-4 mb-2 rounded-lg flex-row items-center justify-between border ${
                    localSelectedTechniques.some(t => t.id === technique.id)
                      ? 'bg-emerald-700/50 border-emerald-500'
                      : 'bg-white/10 border-white/20'
                  }`}
                  onPress={() => toggleTechniqueSelection(technique)}
                >
                  <StyledView className="flex-1 mr-3">
                    <StyledText className="text-white font-semibold text-base">
                      {technique.name}
                    </StyledText>
                    {technique.description && (
                      <StyledText className="text-white/70 text-sm mt-1">
                        {technique.description}
                      </StyledText>
                    )}
                  </StyledView>
                  
                  <StyledView className={`w-6 h-6 rounded-full border items-center justify-center ${
                    localSelectedTechniques.some(t => t.id === technique.id)
                      ? 'bg-emerald-500 border-white'
                      : 'border-white/50'
                  }`}>
                    {localSelectedTechniques.some(t => t.id === technique.id) && (
                      <Feather name="check" size={16} color="white" />
                    )}
                  </StyledView>
                </StyledTouchableOpacity>
              ))
            )}
            
            {/* Save Button at the bottom */}
            <StyledTouchableOpacity
              className={`w-full py-4 rounded-lg items-center justify-center flex-row my-6 
              ${localSelectedTechniques.length > 0 ? 'bg-emerald-600' : 'bg-gray-600'}`}
              onPress={handleSave}
              disabled={localSelectedTechniques.length === 0}
            >
              <StyledText className="text-white font-semibold text-base">
                {t('saveTechniques', 'Save Techniques')}
              </StyledText>
            </StyledTouchableOpacity>
          </StyledScrollView>
        )}
      </StyledView>
    </StyledModal>
  )
}
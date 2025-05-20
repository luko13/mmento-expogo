"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import Slider  from '@react-native-community/slider'

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledSlider = styled(Slider)
const StyledTouchableOpacity = styled(TouchableOpacity)

interface DifficultySliderProps {
  value: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

export default function DifficultySlider({
  value = 5,
  onChange,
  min = 1,
  max = 10,
  step = 1
}: DifficultySliderProps) {
  const { t } = useTranslation()
  const [sliderValue, setSliderValue] = useState<number>(value || 5)
  
  // Update slider value when external value changes
  useEffect(() => {
    if (value !== null) {
      setSliderValue(value)
    }
  }, [value])
  
  // Handle slider value change
  const handleValueChange = (newValue: number) => {
    setSliderValue(newValue)
  }
  
  // Handle slider value change complete to update parent
  const handleSlidingComplete = () => {
    onChange(sliderValue)
  }
  
  // Handle tapping on a specific difficulty level
  const handleTapValue = (newValue: number) => {
    setSliderValue(newValue)
    onChange(newValue)
  }
  
  // Generate labels for the slider
  const renderLabels = () => {
    const labels = []
    const labelCount = 3 // Start, middle, end
    
    labels.push(
      <StyledTouchableOpacity 
        key="start" 
        onPress={() => handleTapValue(min)}
        className="items-center"
      >
        <StyledText className="text-white/50 text-xs">{min}</StyledText>
      </StyledTouchableOpacity>
    )
    
    labels.push(
      <StyledTouchableOpacity 
        key="middle" 
        onPress={() => handleTapValue(Math.floor((min + max) / 2))}
        className="items-center"
      >
        <StyledText className="text-white/50 text-xs">{Math.floor((min + max) / 2)}</StyledText>
      </StyledTouchableOpacity>
    )
    
    labels.push(
      <StyledTouchableOpacity 
        key="end" 
        onPress={() => handleTapValue(max)}
        className="items-center"
      >
        <StyledText className="text-white/50 text-xs">{max}</StyledText>
      </StyledTouchableOpacity>
    )
    
    return labels
  }
  
  // Display current slider value as text
  const getDifficultyLabel = (value: number) => {
    if (value <= 3) return t('difficultyEasy', 'Easy')
    if (value <= 7) return t('difficultyMedium', 'Medium')
    return t('difficultyHard', 'Hard')
  }
  
  return (
    <StyledView className="w-full">
      {/* Custom Slider */}
      <StyledView className="h-6 flex-row justify-between items-center">
        {renderLabels()}
      </StyledView>
      
      <StyledView className="flex-row items-center">
        {/* Active part */}
        <StyledView 
          className="h-1 bg-emerald-700 rounded-full" 
          style={{ width: `${((sliderValue - min) / (max - min)) * 100}%` }} 
        />
        
        {/* Inactive part */}
        <StyledView 
          className="h-1 bg-white/20 rounded-full" 
          style={{ width: `${100 - ((sliderValue - min) / (max - min)) * 100}%` }} 
        />
      </StyledView>
      
      {/* Current Value Indicator */}
      <StyledView className="items-center mt-2">
        <StyledText className="text-white/70 text-xs">
          {getDifficultyLabel(sliderValue)} ({sliderValue})
        </StyledText>
      </StyledView>
    </StyledView>
  )
}
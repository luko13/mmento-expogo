"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, ScrollView, Modal } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons"
import Slider from "@react-native-community/slider"
import type { MagicTrick } from "../AddMagicWizard"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "../../../lib/supabase"
import * as FileSystem from "expo-file-system"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LinearGradient } from 'expo-linear-gradient'

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)

interface StepProps {
  trickData: MagicTrick
  updateTrickData: (data: Partial<MagicTrick>) => void
  onNext?: () => void
  onCancel?: () => void
  currentStep?: number
  totalSteps?: number
  isSubmitting?: boolean
  isNextButtonDisabled?: boolean
  isLastStep?: boolean
}

export default function EffectStep({ 
  trickData, 
  updateTrickData,
  onNext,
  onCancel,
  currentStep = 1,
  totalSteps = 2,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = false
}: StepProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const insets = useSafeAreaInsets()
  
  // Time picker state
  const [showDurationPickerModal, setShowDurationPickerModal] = useState(false)
  const [showResetPickerModal, setShowResetPickerModal] = useState(false)
  const [tempMinutes, setTempMinutes] = useState(0)
  const [tempSeconds, setTempSeconds] = useState(30)

  // Set initial values based on trickData
  useEffect(() => {
    if (trickData.duration) {
      setTempMinutes(Math.floor(trickData.duration / 60))
      setTempSeconds(trickData.duration % 60)
    }
  }, [])

  // Available angles (updated to match the design)
  const angles = [
    { value: "90", label: "90°" },
    { value: "120", label: "120°" },
    { value: "180", label: "180°" },
    { value: "360", label: "360°" },
  ]

  // Select angle (radio button style)
  const selectAngle = (angle: string): void => {
    const updatedAngles = [angle] // Only allow one angle selection
    updateTrickData({ angles: updatedAngles })
  }

  // Handle difficulty selection
  const setDifficulty = (value: number): void => {
    let difficulty: string;
    if (value <= 2) difficulty = "beginner";
    else if (value <= 4) difficulty = "easy";
    else if (value <= 6) difficulty = "intermediate";
    else if (value <= 8) difficulty = "advanced";
    else difficulty = "expert";
    
    updateTrickData({ difficulty });
  }
  
  // Get current difficulty value
  const getDifficultyValue = (): number => {
    switch (trickData.difficulty) {
      case "beginner": return 1
      case "easy": return 3
      case "intermediate": return 5
      case "advanced": return 7
      case "expert": return 10
      default: return 5
    }
  }
  
  // Handle showing time picker for duration
  const showDurationPicker = () => {
    // Set initial values based on current duration
    if (trickData.duration) {
      setTempMinutes(Math.floor(trickData.duration / 60))
      setTempSeconds(trickData.duration % 60)
    } else {
      setTempMinutes(0)
      setTempSeconds(30)
    }
    setShowDurationPickerModal(true)
  }

  // Handle confirming duration time
  const confirmDuration = () => {
    const totalSeconds = (tempMinutes * 60) + tempSeconds
    updateTrickData({ duration: totalSeconds })
    setShowDurationPickerModal(false)
  }

  // Handle showing time picker for reset
  const showResetTimePicker = () => {
    // Set initial values based on current reset time
    if (trickData.reset) {
      setTempMinutes(Math.floor(trickData.reset / 60))
      setTempSeconds(trickData.reset % 60)
    } else {
      setTempMinutes(0)
      setTempSeconds(15)
    }
    setShowResetPickerModal(true)
  }

  // Handle confirming reset time
  const confirmResetTime = () => {
    const totalSeconds = (tempMinutes * 60) + tempSeconds
    updateTrickData({ reset: totalSeconds })
    setShowResetPickerModal(false)
  }

  // Create a picker wheel option
  const renderPickerOptions = (max: number) => {
    const options = []
    for (let i = 0; i <= max; i++) {
      options.push(
        <StyledTouchableOpacity 
          key={i} 
          className="py-2 items-center w-full"
          onPress={() => max === 59 ? setTempSeconds(i) : setTempMinutes(i)}
        >
          <StyledText className={`text-lg ${(max === 59 ? tempSeconds : tempMinutes) === i ? 'text-white font-bold' : 'text-white/60'}`}>
            {i.toString().padStart(2, '0')}
          </StyledText>
        </StyledTouchableOpacity>
      )
    }
    return options
  }

  // Request permissions
  const requestMediaLibraryPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permission Required"),
          t("mediaLibraryPermission", "We need access to your media library to upload videos."),
          [{ text: t("ok", "OK") }],
        )
        return false
      }
      return true
    } catch (error) {
      console.error("Error requesting permissions:", error)
      return false
    }
  }

  // Upload video
  const pickVideo = async () => {
    try {
      // Request permissions first
      const hasPermission = await requestMediaLibraryPermissions()
      if (!hasPermission) return

      // Configure options to reduce video size
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.5,
        videoMaxDuration: 60,
      }

      const result = await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri

        // Check file size
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri)
          
          // Check if file exists and has size
          if (fileInfo.exists && "size" in fileInfo) {
            // If file is larger than 50MB, show warning
            if (fileInfo.size > 50 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "File Too Large"),
                t(
                  "fileSizeWarning",
                  "The selected video is too large. Please select a smaller video or trim this one.",
                ),
                [{ text: t("ok", "OK") }],
              )
              return
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error)
        }

        await uploadVideo(uri)
      }
    } catch (error) {
      console.error("Error picking video:", error)
      Alert.alert(
        t("error", "Error"),
        t("videoPickError", "There was an error selecting the video. Please try again."),
        [{ text: t("ok", "OK") }],
      )
    }
  }

  // Upload video to Supabase Storage
  const uploadVideo = async (uri: string) => {
    try {
      setUploading(true)

      // Get file name
      const fileName = uri.split("/").pop() || ""
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "mp4"
      const filePath = `effect_videos/${Date.now()}.${fileExt}`

      // On iOS, use FileSystem to read the file instead of fetch/blob
      if (Platform.OS === "ios") {
        try {
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          })

          const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePath, fileContent, {
            contentType: `video/${fileExt}`,
            upsert: true,
          })

          if (error) {
            console.error("Error uploading video:", error)
            Alert.alert(t("uploadError", "Upload Error"), error.message)
            return
          }

          // Get public URL
          const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

          // Update trick data
          updateTrickData({ effect_video_url: publicURL.publicUrl })
        } catch (error) {
          console.error("Error reading file:", error)
          Alert.alert(
            t("fileReadError", "File Read Error"),
            t("couldNotReadFile", "Could not read the video file. Please try again with a different video."),
          )
        }
      } else {
        // For Android, continue using the previous method
        const response = await fetch(uri)
        const blob = await response.blob()

        const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePath, blob)

        if (error) {
          console.error("Error uploading video:", error)
          Alert.alert(t("uploadError", "Upload Error"), error.message)
          return
        }

        // Get public URL
        const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

        // Update trick data
        updateTrickData({ effect_video_url: publicURL.publicUrl })
      }
    } catch (error) {
      console.error("Error in upload process:", error)
      Alert.alert(
        t("uploadError", "Upload Error"),
        t("generalUploadError", "There was an error uploading the video. Please try again."),
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <StyledView className="flex-1">
      {/* Background gradient matching TitleCategoryStep */}
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
      <StyledView className="flex-row items-center px-6 pt-4 pb-4">
        <StyledTouchableOpacity onPress={onCancel} className="p-2">
          <Feather name="chevron-left" size={24} color="white" />
        </StyledTouchableOpacity>
        
        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {t("effect", "Effect")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            [{trickData.title || t("trickTitle", "[TrickTitle]")}]
          </StyledText>
        </StyledView>
        
        <StyledTouchableOpacity className="p-2">
          <Feather name="info" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6">
        {/* Video upload section */}
        <StyledView className="flex-row mb-6 mt-16">
          <StyledView className="w-12 h-12 bg-emerald-800/40 rounded-lg items-center justify-center">
            <Feather name="video" size={24} color="white" />
          </StyledView>
          
          <StyledView className="flex-1 ml-3">
            <StyledTouchableOpacity 
              onPress={pickVideo}
              disabled={uploading}
              className="bg-emerald-800/40 rounded-lg p-3 flex-row items-center justify-between"
            >
              <StyledText className="text-white/70">
                {uploading ? 
                  t("uploading", "Uploading...") : 
                  trickData.effect_video_url ? 
                    t("videoUploaded", "Video uploaded") : 
                    t("uploadEffectVideo", "Effect video Upload*")
                }
              </StyledText>
              <Feather name="download" size={20} color="white" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        {/* Effect description */}
        <StyledView className="flex-row mb-6">
          <StyledView className="w-12 h-12 bg-emerald-800/40 rounded-lg items-center justify-center">
            <Feather name="star" size={24} color="white" />
          </StyledView>
          
          <StyledView className="flex-1 ml-3">
            <StyledTextInput
              className="bg-emerald-800/40 text-white p-3 rounded-lg min-h-[120px]"
              placeholder={t("effectDescription", "Effect short description")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={trickData.effect}
              onChangeText={(text) => updateTrickData({ effect: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </StyledView>
        </StyledView>

        {/* Angles */}
        <StyledView className="flex-row mb-6">
          <StyledView className="w-12 h-12 bg-emerald-800/40 rounded-lg items-center justify-center">
            <Feather name="tag" size={24} color="white" />
          </StyledView>
          
          <StyledView className="flex-1 ml-3">
            <StyledView className="bg-emerald-800/40 p-3 rounded-lg flex-row justify-between">
              {angles.map((angle) => (
                <StyledTouchableOpacity
                  key={angle.value}
                  onPress={() => selectAngle(angle.value)}
                  className="flex-row items-center"
                >
                  <StyledView 
                    className={`w-5 h-5 rounded-full border ${
                      trickData.angles.includes(angle.value) 
                        ? "border-white bg-white" 
                        : "border-white/50"
                    } mr-2`}
                  >
                    {trickData.angles.includes(angle.value) && (
                      <StyledView className="w-3 h-3 rounded-full bg-emerald-800 m-auto" />
                    )}
                  </StyledView>
                  <StyledText className="text-white">{angle.label}</StyledText>
                </StyledTouchableOpacity>
              ))}
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Duration */}
        <StyledView className="flex-row mb-6">
          <StyledView className="w-12 h-12 bg-emerald-800/40 rounded-lg items-center justify-center">
            <Feather name="clock" size={24} color="white" />
          </StyledView>
          
          <StyledView className="flex-1 ml-3">
            <StyledTouchableOpacity 
              className="bg-emerald-800/40 p-3 rounded-lg flex-row items-center justify-between"
              onPress={showDurationPicker}
            >
              <StyledText className="text-white/70">
                {trickData.duration 
                  ? `${Math.floor(trickData.duration / 60)}:${(trickData.duration % 60).toString().padStart(2, '0')} ${t("minutes", "minutes")}`
                  : t("setDurationTime", "Set duration time")
                }
              </StyledText>
              <Feather name="plus" size={20} color="white" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        {/* Reset Time */}
        <StyledView className="flex-row mb-6">
          <StyledView className="w-12 h-12 bg-emerald-800/40 rounded-lg items-center justify-center">
            <Feather name="refresh-cw" size={24} color="white" />
          </StyledView>
          
          <StyledView className="flex-1 ml-3">
            <StyledTouchableOpacity 
              className="bg-emerald-800/40 p-3 rounded-lg flex-row items-center justify-between"
              onPress={showResetTimePicker}
            >
              <StyledText className="text-white/70">
                {trickData.reset 
                  ? `${Math.floor(trickData.reset / 60)}:${(trickData.reset % 60).toString().padStart(2, '0')} ${t("minutes", "minutes")}`
                  : t("setResetTime", "Set reset time")
                }
              </StyledText>
              <Feather name="plus" size={20} color="white" />
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        {/* Difficulty Slider */}
        <StyledView className="flex-row mb-12">
          <StyledView className="w-12 h-12 bg-emerald-800/40 rounded-lg items-center justify-center">
            <FontAwesome5 name="hand-paper" size={24} color="white" />
          </StyledView>
          
          <StyledView className="flex-1 ml-3">
            <StyledView className="bg-emerald-800/40 p-3 rounded-lg">
              <StyledView className="flex-row justify-between mb-1">
                <StyledText className="text-white/50 text-xs">1</StyledText>
                <StyledText className="text-white/50 text-xs">5</StyledText>
                <StyledText className="text-white/50 text-xs">10</StyledText>
              </StyledView>
              
              <StyledView className="h-6 justify-center mb-2">
                {/* React Native Community Slider */}
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  value={getDifficultyValue()}
                  onValueChange={(value: number) => setDifficulty(value)}
                  minimumTrackTintColor="#059669"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                  thumbTintColor="#ffffff"
                />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledScrollView>

      {/* Footer with step indicator and next button */}
      <StyledView className="px-6 pb-8" style={{ paddingBottom: insets.bottom + 16 }}>
        <StyledText className="text-center text-white/60 mb-4">
          {`${currentStep} of ${totalSteps}`}
        </StyledText>
        
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row ${
            isNextButtonDisabled || !trickData.effect.trim() || isSubmitting
              ? 'bg-white/10'
              : 'bg-emerald-700'
          }`}
          disabled={isNextButtonDisabled || !trickData.effect.trim() || isSubmitting}
          onPress={onNext}
        >
          <StyledText className="text-white font-semibold text-base mr-2">
            {isLastStep ? t("save", "Save") : t("next", "Next")}
          </StyledText>
          {isLastStep ? (
            <Feather name="save" size={20} color="white" />
          ) : (
            <Feather name="chevron-right" size={20} color="white" />
          )}
        </StyledTouchableOpacity>
      </StyledView>

      {/* Time picker modals */}
      {/* Duration Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDurationPickerModal}
        onRequestClose={() => setShowDurationPickerModal(false)}
      >
        <StyledView className="flex-1 justify-end items-center bg-black/50">
          <StyledView className="w-full bg-gray-900 rounded-t-3xl p-6">
            <StyledView className="flex-row justify-between items-center mb-6">
              <StyledTouchableOpacity onPress={() => setShowDurationPickerModal(false)}>
                <StyledText className="text-white font-medium text-lg">
                  {t("cancel", "Cancel")}
                </StyledText>
              </StyledTouchableOpacity>
              
              <StyledText className="text-white font-bold text-xl">
                {t("setDuration", "Set Duration")}
              </StyledText>
              
              <StyledTouchableOpacity onPress={confirmDuration}>
                <StyledText className="text-emerald-500 font-medium text-lg">
                  {t("done", "Done")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
            
            <StyledView className="flex-row justify-center items-center mb-6">
              {/* Picker container with mm:ss format */}
              <StyledView className="flex-row items-center">
                {/* Minutes picker */}
                <StyledView className="w-20 h-40 overflow-hidden">
                  <StyledScrollView 
                    className="h-full"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 50 }}
                  >
                    {renderPickerOptions(59)}
                  </StyledScrollView>
                </StyledView>
                
                <StyledText className="text-white text-2xl mx-2">:</StyledText>
                
                {/* Seconds picker */}
                <StyledView className="w-20 h-40 overflow-hidden">
                  <StyledScrollView 
                    className="h-full"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 50 }}
                  >
                    {renderPickerOptions(59)}
                  </StyledScrollView>
                </StyledView>
              </StyledView>
            </StyledView>
            
            {/* Current selection indicator */}
            <StyledView className="absolute top-1/2 left-0 right-0 h-12 border-t border-b border-emerald-600/30 bg-emerald-600/10" />
          </StyledView>
        </StyledView>
      </Modal>
      
      {/* Reset Time Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showResetPickerModal}
        onRequestClose={() => setShowResetPickerModal(false)}
      >
        <StyledView className="flex-1 justify-end items-center bg-black/50">
          <StyledView className="w-full bg-gray-900 rounded-t-3xl p-6">
            <StyledView className="flex-row justify-between items-center mb-6">
              <StyledTouchableOpacity onPress={() => setShowResetPickerModal(false)}>
                <StyledText className="text-white font-medium text-lg">
                  {t("cancel", "Cancel")}
                </StyledText>
              </StyledTouchableOpacity>
              
              <StyledText className="text-white font-bold text-xl">
                {t("setResetTime", "Set Reset Time")}
              </StyledText>
              
              <StyledTouchableOpacity onPress={confirmResetTime}>
                <StyledText className="text-emerald-500 font-medium text-lg">
                  {t("done", "Done")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
            
            <StyledView className="flex-row justify-center items-center mb-6">
              {/* Picker container with mm:ss format */}
              <StyledView className="flex-row items-center">
                {/* Minutes picker */}
                <StyledView className="w-20 h-40 overflow-hidden">
                  <StyledScrollView 
                    className="h-full"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 50 }}
                  >
                    {renderPickerOptions(59)}
                  </StyledScrollView>
                </StyledView>
                
                <StyledText className="text-white text-2xl mx-2">:</StyledText>
                
                {/* Seconds picker */}
                <StyledView className="w-20 h-40 overflow-hidden">
                  <StyledScrollView 
                    className="h-full"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 50 }}
                  >
                    {renderPickerOptions(59)}
                  </StyledScrollView>
                </StyledView>
              </StyledView>
            </StyledView>
            
            {/* Current selection indicator */}
            <StyledView className="absolute top-1/2 left-0 right-0 h-12 border-t border-b border-emerald-600/30 bg-emerald-600/10" />
          </StyledView>
        </StyledView>
      </Modal>
    </StyledView>
  )
}
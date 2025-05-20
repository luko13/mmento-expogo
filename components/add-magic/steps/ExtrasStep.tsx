"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons"
import type { MagicTrick } from "../AddMagicWizard"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "../../../lib/supabase"
import * as FileSystem from "expo-file-system"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from "expo-router"

// Import modals
import TechniquesModal from "../../../components/add-magic/ui/TechniquesModal"
import GimmicksModal from "../../../components/add-magic/ui/GimmicksModal"
import ScriptModal from "../../../components/add-magic/ui/ScriptModal"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)

// Define interfaces for technique and gimmick
interface Technique {
  id: string
  name: string
  description?: string
}

interface Gimmick {
  id: string
  name: string
  description?: string
}

interface ScriptData {
  id?: string
  title: string
  content: string
}

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

export default function ExtrasStep({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  currentStep = 2,
  totalSteps = 2,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = true
}: StepProps) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const insets = useSafeAreaInsets()
  const router = useRouter()
  
  // State for modals
  const [techniquesModalVisible, setTechniquesModalVisible] = useState(false)
  const [gimmicksModalVisible, setGimmicksModalVisible] = useState(false)
  const [scriptModalVisible, setScriptModalVisible] = useState(false)
  
  // State for data
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [gimmicks, setGimmicks] = useState<Gimmick[]>([])
  const [selectedTechniques, setSelectedTechniques] = useState<Technique[]>([])
  const [selectedGimmicks, setSelectedGimmicks] = useState<Gimmick[]>([])
  const [scriptData, setScriptData] = useState<ScriptData>({
    title: '',
    content: ''
  })
  
  // Angles select options
  const angles = [
    { value: "90", label: "90°" },
    { value: "120", label: "120°" },
    { value: "180", label: "180°" },
    { value: "360", label: "360°" },
  ]

  // Select angle (radio button style)
  const selectAngle = (angle: string): void => {
    const updatedAngles = trickData.angles.includes(angle) 
      ? trickData.angles.filter(a => a !== angle)
      : [...trickData.angles, angle];
    
    updateTrickData({ angles: updatedAngles })
  }

  // Show duration time picker
  const showDurationPicker = () => {
    // Placeholder for now - will implement the time picker in a separate component
    Alert.alert(
      t("info", "Info"),
      t("notImplemented", "Time picker will be implemented separately"),
      [{ text: t("ok", "OK") }]
    )
  }

  // Show reset time picker
  const showResetTimePicker = () => {
    // Placeholder for now - will implement the time picker in a separate component
    Alert.alert(
      t("info", "Info"),
      t("notImplemented", "Time picker will be implemented separately"),
      [{ text: t("ok", "OK") }]
    )
  }

  // Handle difficulty change
  const handleDifficultyChange = (value: number) => {
    updateTrickData({ difficulty: value.toString() })
  }
  
  // Fetch techniques and gimmicks from database
  useEffect(() => {
    fetchTechniques()
    fetchGimmicks()
    
    // Initialize selected items if trick data has them
    if (trickData.techniqueIds && trickData.techniqueIds.length > 0) {
      fetchSelectedTechniques(trickData.techniqueIds)
    }
    
    if (trickData.gimmickIds && trickData.gimmickIds.length > 0) {
      fetchSelectedGimmicks(trickData.gimmickIds)
    }
    
    // Initialize script data if available
    if (trickData.scriptId) {
      fetchScriptData(trickData.scriptId)
    }
  }, [])

  const fetchTechniques = async () => {
    try {
      const { data, error } = await supabase
        .from('techniques')
        .select('id, name, description')
        .eq('is_public', true)
      
      if (error) throw error
      setTechniques(data || [])
    } catch (error) {
      console.error('Error fetching techniques:', error)
      Alert.alert(t('error', 'Error'), t('errorFetchingTechniques', 'Error fetching techniques'))
    }
  }
  
  const fetchGimmicks = async () => {
    try {
      const { data, error } = await supabase
        .from('gimmicks')
        .select('id, name, description')
        .eq('is_public', true)
      
      if (error) throw error
      setGimmicks(data || [])
    } catch (error) {
      console.error('Error fetching gimmicks:', error)
      Alert.alert(t('error', 'Error'), t('errorFetchingGimmicks', 'Error fetching gimmicks'))
    }
  }
  
  const fetchSelectedTechniques = async (techniqueIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('techniques')
        .select('id, name, description')
        .in('id', techniqueIds)
      
      if (error) throw error
      setSelectedTechniques(data || [])
    } catch (error) {
      console.error('Error fetching selected techniques:', error)
    }
  }
  
  const fetchSelectedGimmicks = async (gimmickIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('gimmicks')
        .select('id, name, description')
        .in('id', gimmickIds)
      
      if (error) throw error
      setSelectedGimmicks(data || [])
    } catch (error) {
      console.error('Error fetching selected gimmicks:', error)
    }
  }
  
  const fetchScriptData = async (scriptId: string) => {
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('id, title, content')
        .eq('id', scriptId)
        .single()
      
      if (error) throw error
      if (data) {
        setScriptData(data)
      }
    } catch (error) {
      console.error('Error fetching script data:', error)
    }
  }
  
  // Toggle selection of techniques (will be moved to TechniquesModal component)
  const toggleTechniqueSelection = (technique: Technique) => {
    const isSelected = selectedTechniques.some(t => t.id === technique.id)
    
    if (isSelected) {
      setSelectedTechniques(selectedTechniques.filter(t => t.id !== technique.id))
    } else {
      setSelectedTechniques([...selectedTechniques, technique])
    }
  }
  
  // Toggle selection of gimmicks (will be moved to GimmicksModal component)
  const toggleGimmickSelection = (gimmick: Gimmick) => {
    const isSelected = selectedGimmicks.some(g => g.id === gimmick.id)
    
    if (isSelected) {
      setSelectedGimmicks(selectedGimmicks.filter(g => g.id !== gimmick.id))
    } else {
      setSelectedGimmicks([...selectedGimmicks, gimmick])
    }
  }
  
  // Save techniques to the trick (will be moved to TechniquesModal component)
  const saveTechniques = () => {
    const techniqueIds = selectedTechniques.map(t => t.id)
    updateTrickData({ techniqueIds })
    setTechniquesModalVisible(false)
  }
  
  // Save gimmicks to the trick (will be moved to GimmicksModal component)
  const saveGimmicks = () => {
    const gimmickIds = selectedGimmicks.map(g => g.id)
    updateTrickData({ gimmickIds })
    setGimmicksModalVisible(false)
  }
  
  // Save script for the trick (will be moved to ScriptModal component)
  const saveScript = async () => {
    try {
      if (!scriptData.title || !scriptData.content) {
        Alert.alert(
          t('missingFields', 'Missing Fields'),
          t('pleaseCompleteTitleAndContent', 'Please complete both title and content')
        )
        return
      }
      
      let scriptId = scriptData.id
      
      if (scriptId) {
        // Update existing script
        const { error } = await supabase
          .from('scripts')
          .update({
            title: scriptData.title,
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
            title: scriptData.title,
            content: scriptData.content,
            trick_id: trickData.id,
            user_id: trickData.user_id,
            language: 'es' // Default language
          })
          .select('id')
          .single()
        
        if (error) throw error
        if (data) {
          scriptId = data.id
        }
      }
      
      // Update trick data with script ID
      updateTrickData({ scriptId })
      setScriptModalVisible(false)
    } catch (error) {
      console.error('Error saving script:', error)
      Alert.alert(t('error', 'Error'), t('errorSavingScript', 'Error saving script'))
    }
  }

  // Pick image for the trick
  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permission Required"),
          t("mediaLibraryPermission", "We need access to your media library to upload photos."),
          [{ text: t("ok", "OK") }],
        )
        return
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3] as [number, number],
      }

      const result = await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri

        // Check file size
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri)
          
          // Check if file exists and has size
          if (fileInfo.exists && "size" in fileInfo) {
            // If file is larger than 10MB, show warning
            if (fileInfo.size > 10 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "File Too Large"),
                t("imageSizeWarning", "The selected image is too large. Please select a smaller image."),
                [{ text: t("ok", "OK") }],
              )
              return
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error)
        }

        await uploadImage(uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert(
        t("error", "Error"),
        t("imagePickError", "There was an error selecting the image. Please try again."),
        [{ text: t("ok", "OK") }],
      )
    }
  }

  // Upload image to Supabase Storage
  const uploadImage = async (uri: string) => {
    try {
      setUploading(true)

      // Get file name
      const fileName = uri.split("/").pop() || ""
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg"
      const filePath = `trick_photos/${Date.now()}.${fileExt}`

      // On iOS, use FileSystem to read the file instead of fetch/blob
      if (Platform.OS === "ios") {
        try {
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          })

          const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePath, fileContent, {
            contentType: `image/${fileExt}`,
            upsert: true,
          })

          if (error) {
            console.error("Error uploading image:", error)
            Alert.alert(t("uploadError", "Upload Error"), error.message)
            return
          }

          // Get public URL
          const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

          // Update trick data
          updateTrickData({ photo_url: publicURL.publicUrl })
        } catch (error) {
          console.error("Error reading file:", error)
          Alert.alert(
            t("fileReadError", "File Read Error"),
            t("couldNotReadFile", "Could not read the image file. Please try again with a different image."),
          )
        }
      } else {
        // For Android, continue using the previous method
        const response = await fetch(uri)
        const blob = await response.blob()

        const { data, error } = await supabase.storage.from("magic_trick_media").upload(filePath, blob)

        if (error) {
          console.error("Error uploading image:", error)
          Alert.alert(t("uploadError", "Upload Error"), error.message)
          return
        }

        // Get public URL
        const { data: publicURL } = supabase.storage.from("magic_trick_media").getPublicUrl(filePath)

        // Update trick data
        updateTrickData({ photo_url: publicURL.publicUrl })
      }
    } catch (error) {
      console.error("Error in upload process:", error)
      Alert.alert(
        t("uploadError", "Upload Error"),
        t("generalUploadError", "There was an error uploading the image. Please try again."),
      )
    } finally {
      setUploading(false)
    }
  }

  // Handle data from modal components
  const handleSaveTechniques = (techniqueIds: string[]) => {
    updateTrickData({ techniqueIds })
  }

  const handleSaveGimmicks = (gimmickIds: string[]) => {
    updateTrickData({ gimmickIds })
  }

  const handleSaveScript = (newScriptId: string) => {
    updateTrickData({ scriptId: newScriptId })
  }

  // Format duration time for display
  const formatDuration = (durationInSeconds: number | null) => {
    if (!durationInSeconds) return t("setDurationTime", "Set duration time");
    
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')} ${t("minutes", "minutes")}`;
  };

  // Format reset time for display
  const formatReset = (resetInSeconds: number | null) => {
    if (!resetInSeconds) return t("setResetTime", "Set reset time");
    
    const minutes = Math.floor(resetInSeconds / 60);
    const seconds = resetInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')} ${t("minutes", "minutes")}`;
  };
  
  // Get difficulty value as number
  const difficultyValue = trickData.difficulty ? parseInt(trickData.difficulty) : 5;

  return (
    <StyledView className="flex-1">
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
      <StyledView className="flex-row items-center px-6 pt-4 pb-2">
        <StyledTouchableOpacity onPress={onCancel} className="p-2">
          <Feather name="chevron-left" size={24} color="white" />
        </StyledTouchableOpacity>
        
        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {trickData.title || t("trickTitle", "[Title Magic]")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {t("statistics", "Statistics")}
          </StyledText>
        </StyledView>
        
        <StyledTouchableOpacity className="p-2">
          <Feather name="info" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6">
        {/* Statistics Section */}
        <StyledView className="mt-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("statistics", "Statistics")}
          </StyledText>
          
          {/* Angles Selection */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="tag" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between">
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
          
          {/* Duration Time */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="clock" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledTouchableOpacity 
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={showDurationPicker}
              >
                <StyledText className="text-white/70">
                  {formatDuration(trickData.duration)}
                </StyledText>
                <Feather name="plus" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
          
          {/* Reset Time */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="refresh-cw" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledTouchableOpacity 
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={showResetTimePicker}
              >
                <StyledText className="text-white/70">
                  {formatReset(trickData.reset)}
                </StyledText>
                <Feather name="plus" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
          
          {/* Difficulty slider */}
          <StyledView className="flex-row mb-3">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialIcons name="signal-cellular-alt" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]">
                {/* Custom Slider */}
                <StyledView className="w-full">
                  {/* Slider Numbers */}
                  <StyledView className="h-6 flex-row justify-between items-center">
                    <StyledTouchableOpacity 
                      onPress={() => handleDifficultyChange(1)}
                      className="items-center"
                    >
                      <StyledText className="text-white/50 text-xs">1</StyledText>
                    </StyledTouchableOpacity>
                    
                    <StyledTouchableOpacity 
                      onPress={() => handleDifficultyChange(5)}
                      className="items-center"
                    >
                      <StyledText className="text-white/50 text-xs">5</StyledText>
                    </StyledTouchableOpacity>
                    
                    <StyledTouchableOpacity 
                      onPress={() => handleDifficultyChange(10)}
                      className="items-center"
                    >
                      <StyledText className="text-white/50 text-xs">10</StyledText>
                    </StyledTouchableOpacity>
                  </StyledView>
                  
                  {/* Slider bar */}
                  <StyledView className="flex-row items-center">
                    {/* Active part */}
                    <StyledView 
                      className="h-1 bg-emerald-700 rounded-l-full" 
                      style={{ width: `${((difficultyValue - 1) / 9) * 100}%` }} 
                    />
                    
                    {/* Inactive part */}
                    <StyledView 
                      className="h-1 bg-white/20 rounded-r-full" 
                      style={{ width: `${100 - ((difficultyValue - 1) / 9) * 100}%` }} 
                    />
                  </StyledView>
                  
                  {/* Slider thumb */}
                  <StyledView 
                    className="absolute h-3 w-3 bg-white rounded-full top-7" 
                    style={{ 
                      left: `${((difficultyValue - 1) / 9) * 100}%`, 
                      transform: [{ translateX: -6 }] 
                    }} 
                  />
                </StyledView>
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>
        
        {/* Extras Section */}
        <StyledView className="mb-2">
          <StyledText className="text-white/60 text-lg font-semibold mb-2">
            {t("extras", "Extras")}
          </StyledText>
          
          {/* Image Upload */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="image" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledTouchableOpacity 
                onPress={pickImage}
                disabled={uploading}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledText className="text-white/70">
                  {uploading ? 
                    t("uploading", "Uploading...") : 
                    trickData.photo_url ? 
                      t("imageUploaded", "Image uploaded") : 
                      t("imagesUpload", "Images Upload")
                  }
                </StyledText>
                <Feather name="upload" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
          
          {/* Techniques Selection */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="award" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledTouchableOpacity 
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setTechniquesModalVisible(true)}
              >
                <StyledText className="text-white/70">
                  {selectedTechniques.length > 0 
                    ? `${selectedTechniques.length} ${t("techniquesSelected", "techniques selected")}`
                    : t("technique", "Technique")
                  }
                </StyledText>
                <Feather name="download" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
          
          {/* Gimmicks Selection */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="box" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledTouchableOpacity 
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setGimmicksModalVisible(true)}
              >
                <StyledText className="text-white/70">
                  {selectedGimmicks.length > 0 
                    ? `${selectedGimmicks.length} ${t("gimmicksSelected", "gimmicks selected")}`
                    : t("gimmicks", "Gimmicks")
                  }
                </StyledText>
                <Feather name="download" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
          
          {/* Script Writing */}
          <StyledView className="flex-row mb-2">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="edit" size={24} color="white" />
            </StyledView>
            
            <StyledView className="flex-1">
              <StyledTouchableOpacity 
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setScriptModalVisible(true)}
              >
                <StyledText className="text-white/70">
                  {scriptData.title 
                    ? scriptData.title 
                    : t("writeScript", "Write Script")
                  }
                </StyledText>
                <Feather name="download" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>
        
        {/* Step indicator */}
        <StyledText className="text-center text-white/60 mb-4">
          {`${currentStep} of ${totalSteps}`}
        </StyledText>
        
        {/* Register Magic Button */}
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row mb-6 ${
            isSubmitting ? 'bg-white/10' : 'bg-emerald-700'
          }`}
          disabled={isSubmitting}
          onPress={onNext}
        >
          <StyledText className="text-white font-semibold text-base">
            {isSubmitting ? t("saving", "Saving...") : t("registerMagic", "Register Magic")}
          </StyledText>
          {isSubmitting && (
            <Ionicons name="refresh" size={20} color="white" style={{ marginLeft: 8 }} />
          )}
        </StyledTouchableOpacity>
      </StyledScrollView>
      
      {/* Modals - These will be moved to separate components */}
      {/* For now, rendering conditionally with placeholder for future components */}
      {techniquesModalVisible && (
        <TechniquesModal
          visible={techniquesModalVisible}
          onClose={() => setTechniquesModalVisible(false)}
          techniques={techniques}
          selectedTechniques={selectedTechniques}
          onSave={handleSaveTechniques}
          onToggleSelection={toggleTechniqueSelection}
        />
      )}
      
      {gimmicksModalVisible && (
        <GimmicksModal
          visible={gimmicksModalVisible}
          onClose={() => setGimmicksModalVisible(false)}
          gimmicks={gimmicks}
          selectedGimmicks={selectedGimmicks}
          onSave={handleSaveGimmicks}
          onToggleSelection={toggleGimmickSelection}
        />
      )}
      
      {scriptModalVisible && (
        <ScriptModal
          visible={scriptModalVisible}
          onClose={() => setScriptModalVisible(false)}
          scriptData={scriptData}
          onSave={handleSaveScript}
          trickId={trickData.id}
          userId={trickData.user_id}
        />
      )}
    </StyledView>
  )
}
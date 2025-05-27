"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  ActivityIndicator 
} from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { v4 as uuidv4 } from 'uuid'
import { 
  Feather, 
  Ionicons, 
  FontAwesome6, 
  MaterialIcons 
} from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from "react-native-safe-area-context"

// Import necessary hooks and services
import { supabase } from "../../lib/supabase"
import { useEncryption } from "../../hooks/useEncryption"
import { FileEncryptionService } from "../../utils/fileEncryption"
import CategorySelector from "../ui/CategorySelector"
import { EncryptionSetup } from "../security/EncryptionSetup"
import type { EncryptedMagicTrick } from "../../types/encryptedMagicTrick"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledScrollView = styled(ScrollView)

interface QuickAddMagicFormProps {
  onComplete?: (trickId: string) => void
  onCancel?: () => void
}

export default function QuickAddMagicForm({
  onComplete,
  onCancel
}: QuickAddMagicFormProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | undefined>()

  // Encryption hooks
  const {
    isReady: encryptionReady,
    keyPair,
    encryptForSelf,
    getPublicKey,
    generateKeys,
    error: encryptionError
  } = useEncryption()

  const fileEncryptionService = new FileEncryptionService()

  // Quick form data - only essential fields
  const [quickTrickData, setQuickTrickData] = useState<Partial<EncryptedMagicTrick>>({
    title: "",
    selectedCategoryId: null,
    effect: "",
    effect_video_url: null,
    isEncryptionEnabled: true,
    encryptedFields: {},
    encryptedFiles: {},
    // Default values for required fields
    categories: [],
    tags: [],
    angles: [],
    duration: null,
    reset: null,
    difficulty: 5,
    secret: "",
    secret_video_url: null,
    special_materials: [],
    notes: "",
    script: "",
    photo_url: null,
    techniqueIds: [],
    gimmickIds: [],
    is_public: false,
    status: "draft",
    price: null,
  })

  // Get current date formatted
  const getCurrentDate = () => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, "0")
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const year = now.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    fetchUser()
  }, [])

  // Generate encryption keys if needed
  useEffect(() => {
    const checkEncryptionSetup = async () => {
      if (encryptionReady && !keyPair) {
        // Si no hay claves, mostrar el modal de configuración
        setShowEncryptionSetup(true);
      }
    }
    
    checkEncryptionSetup();
  }, [encryptionReady, keyPair]);

  // Title validation
  const titleValidation = useMemo(() => {
    if (!quickTrickData.title) {
      return { isValid: false, message: "" }
    }

    const trimmedTitle = quickTrickData.title.trim()

    if (trimmedTitle.length === 0) {
      return {
        isValid: false,
        message: t("validation.titleRequired", "Title is required")
      }
    }

    if (trimmedTitle.length < 3) {
      return {
        isValid: false,
        message: t("validation.titleTooShort", "Title must be at least 3 characters")
      }
    }

    if (trimmedTitle.length > 100) {
      return {
        isValid: false,
        message: t("validation.titleTooLong", "Title is too long")
      }
    }

    return { isValid: true, message: "" }
  }, [quickTrickData.title, t])

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      titleValidation.isValid &&
      quickTrickData.selectedCategoryId !== null &&
      quickTrickData.effect?.trim() !== ""
    )
  }, [titleValidation.isValid, quickTrickData.selectedCategoryId, quickTrickData.effect])

  // Request permissions
  const requestMediaLibraryPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permission Required"),
          t("mediaLibraryPermission", "We need access to your media library to upload videos."),
          [{ text: t("ok", "OK") }]
        )
        return false
      }
      return true
    } catch (error) {
      console.error("Error requesting permissions:", error)
      return false
    }
  }

  // Pick effect video
  const pickEffectVideo = async () => {
    try {
      if (!encryptionReady || !keyPair) {
        Alert.alert(
          t("security.error", "Security Error"),
          t("security.encryptionNotReady", "Encryption system is not ready")
        )
        return
      }

      const hasPermission = await requestMediaLibraryPermissions()
      if (!hasPermission) return

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
          if (fileInfo.exists && "size" in fileInfo) {
            if (fileInfo.size > 50 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "File Too Large"),
                t("fileSizeWarning", "The selected video is too large. Please select a smaller video."),
                [{ text: t("ok", "OK") }]
              )
              return
            }
          }
        } catch (error) {
          console.error("Error checking file size:", error)
        }

        await encryptAndStoreVideo(uri)
      }
    } catch (error) {
      console.error("Error picking video:", error)
      Alert.alert(
        t("error", "Error"),
        t("videoPickError", "There was an error selecting the video."),
        [{ text: t("ok", "OK") }]
      )
    }
  }

  // Encrypt and store video
  const encryptAndStoreVideo = async (uri: string) => {
    if (!keyPair) return

    try {
      setUploading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("User not authenticated")
      }

      const metadata = await fileEncryptionService.encryptAndUploadFile(
        uri,
        `effect_video_${Date.now()}.mp4`,
        "video/mp4",
        user.id,
        [user.id],
        getPublicKey,
        () => keyPair.privateKey
      )

      setQuickTrickData(prev => ({
        ...prev,
        effect_video_url: metadata.fileId,
        encryptedFiles: {
          ...prev.encryptedFiles,
          effect_video: metadata.fileId,
        }
      }))

      Alert.alert(
        t("security.success", "Success"),
        t("security.effectVideoEncrypted", "Effect video encrypted and stored"),
        [{ text: t("ok", "OK") }]
      )
    } catch (error) {
      console.error("Error encrypting video:", error)
      Alert.alert(
        t("security.error", "Encryption Error"),
        t("security.videoEncryptionError", "Could not encrypt video. Please try again."),
        [{ text: t("ok", "OK") }]
      )
    } finally {
      setUploading(false)
    }
  }

  // Ensure user profile exists
  const ensureUserProfile = async (userId: string, email: string) => {
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error checking profile:", profileError)
      throw new Error("Error checking user profile")
    }

    if (!existingProfile) {
      const username = email.split("@")[0]
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        email: email,
        username: username,
        is_active: true,
        is_verified: false,
        subscription_type: "free",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("Error creating profile:", insertError)
        throw new Error("Could not create user profile")
      }
    }

    return userId
  }

  // Encrypt sensitive fields
  const encryptAllSensitiveFields = async (data: Partial<EncryptedMagicTrick>): Promise<Partial<EncryptedMagicTrick>> => {
    if (!keyPair) {
      throw new Error('Encryption keys not available')
    }

    const encryptedData = { ...data }
    const encryptedFields: any = {}

    try {
      // Encrypt title
      if (data.title?.trim()) {
        encryptedFields.title = await encryptForSelf(data.title.trim())
        encryptedData.title = "[ENCRYPTED]"
      }

      // Encrypt effect
      if (data.effect?.trim()) {
        encryptedFields.effect = await encryptForSelf(data.effect.trim())
        encryptedData.effect = "[ENCRYPTED]"
      }

      // Quick form only has minimal secret
      encryptedFields.secret = await encryptForSelf(t("quickMagic.defaultSecret", "Added via quick magic"))
      encryptedData.secret = "[ENCRYPTED]"

      encryptedData.encryptedFields = encryptedFields
      return encryptedData
    } catch (error) {
      console.error('Error encrypting trick fields:', error)
      throw new Error('Error encrypting trick information')
    }
  }

  // Submit the quick magic trick
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Verify encryption
      if (!keyPair) {
        Alert.alert(
          t("security.encryptionRequired", "Encryption Required"),
          t("security.setupEncryptionFirst", "Set up encryption before saving the trick"),
          [
            { text: t("actions.cancel", "Cancel"), style: "cancel" },
            { text: t("security.setupNow", "Set Up"), onPress: () => setShowEncryptionSetup(true) }
          ]
        )
        return
      }

      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert(t("error"), t("userNotFound", "User not found"))
        return
      }

      const profileId = await ensureUserProfile(user.id, user.email || "")
      
      // Encrypt sensitive fields
      const encryptedTrickData = await encryptAllSensitiveFields(quickTrickData)
      
      // Generate unique ID
      const trickId = uuidv4()

      // Use RPC to create encrypted trick
      const { data, error } = await supabase.rpc('create_encrypted_magic_trick', {
        trick_id: trickId,
        trick_data: {
          user_id: profileId,
          title: encryptedTrickData.title,
          effect: encryptedTrickData.effect,
          secret: encryptedTrickData.secret,
          duration: null,
          angles: [],
          notes: "[ENCRYPTED]",
          special_materials: [],
          is_public: false,
          status: "draft",
          price: null,
          photo_url: null,
          effect_video_url: quickTrickData.encryptedFiles?.effect_video || null,
          secret_video_url: null,
          views_count: 0,
          likes_count: 0,
          dislikes_count: 0,
          version: 1,
          parent_trick_id: null,
          reset: null,
          difficulty: 5,
          is_encrypted: true,
        },
        encryption_metadata: {
          content_type: "magic_tricks",
          user_id: profileId,
          encrypted_fields: encryptedTrickData.encryptedFields,
          encrypted_files: quickTrickData.encryptedFiles || {},
        }
      })

      if (error) {
        console.error("Error creating trick:", error)
        Alert.alert(t("error"), t("errorCreatingTrick", "Error creating trick"))
        return
      }

      // Associate category
      if (quickTrickData.selectedCategoryId) {
        await supabase.from("trick_categories").insert({
          trick_id: trickId,
          category_id: quickTrickData.selectedCategoryId,
          created_at: new Date().toISOString(),
        })
      }

      // Success
      Alert.alert(
        t("success", "Success"),
        t("quickMagic.createdSuccessfully", "Quick magic created successfully!"),
        [{ text: t("ok", "OK") }]
      )

      if (onComplete) {
        onComplete(trickId)
      }
    } catch (error) {
      console.error("Error during save:", error)
      Alert.alert(
        t("error", "Error"), 
        error instanceof Error ? error.message : t("unexpectedError", "An unexpected error occurred")
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <StyledView className="flex-1" style={{ paddingTop: 15 }}>
      {/* Header */}
      <StyledView className="flex-row items-center justify-between px-6 mb-16">
        <StyledTouchableOpacity className="p-2" onPress={onCancel}>
          <Feather name="x" size={24} color="white" />
        </StyledTouchableOpacity>

        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {t("quickMagic", "Quick Magic")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {getCurrentDate()}
          </StyledText>
        </StyledView>

        <StyledTouchableOpacity className="p-2">
          <Ionicons name="flash" size={24} color="#10b981" />
        </StyledTouchableOpacity>
      </StyledView>

      {/* Form Content */}
      <StyledScrollView className="flex-1 px-6">
        <StyledText className="text-white/60 text-lg font-semibold mb-4">
          {t("quickMagic.essentialInfo", "Essential Information")}
        </StyledText>

        {/* Title Field */}
        <StyledView className="mb-6">
          <StyledView className="flex-row items-center">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <FontAwesome6
                name="wand-magic-sparkles"
                size={18}
                color="white"
              />
            </StyledView>
            <StyledTextInput
              className="flex-1 text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
              placeholder={t("forms.magicTitlePlaceholder")}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={quickTrickData.title}
              onChangeText={(text) => setQuickTrickData(prev => ({ ...prev, title: text }))}
              maxLength={100}
              autoCapitalize="sentences"
              autoCorrect={false}
              returnKeyType="next"
            />
          </StyledView>
          {quickTrickData.title && !titleValidation.isValid && (
            <StyledText className="text-red-400 text-xs ml-15 mt-1">
              {titleValidation.message}
            </StyledText>
          )}
        </StyledView>

        {/* Category Selector */}
        <CategorySelector
          selectedCategories={quickTrickData.selectedCategoryId ? [quickTrickData.selectedCategoryId] : []}
          onCategoriesChange={(categories) => setQuickTrickData(prev => ({ ...prev, selectedCategoryId: categories[0] || null }))}
          allowCreate={true}
          allowMultiple={false}
          placeholder={t("forms.categoryPlaceholder")}
          userId={userId}
          iconComponent={
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="folder" size={24} color="white" />
            </StyledView>
          }
        />

        {/* Effect Video */}
        <StyledView className="flex-row mb-6">
          <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
            <Feather name="video" size={24} color="white" />
          </StyledView>

          <StyledView className="flex-1">
            <StyledTouchableOpacity
              onPress={pickEffectVideo}
              disabled={uploading || !encryptionReady}
              className="flex-1 text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3]"
            >
              <StyledView className="flex-1 flex-row items-center">
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="#10b981" />
                    <StyledText className="text-white/70 ml-2">
                      {t("security.encryptingVideo", "Encrypting video...")}
                    </StyledText>
                  </>
                ) : (
                  <>
                    <StyledText className="text-white/70 flex-1">
                      {quickTrickData.encryptedFiles?.effect_video
                        ? t("security.videoEncrypted", "Video encrypted ✓")
                        : t("uploadEffectVideo", "Upload effect video")}
                    </StyledText>
                    <StyledView className="flex-row items-center">
                      <Feather
                        name="upload"
                        size={16}
                        color="white"
                      />
                    </StyledView>
                  </>
                )}
              </StyledView>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        {/* Effect Description */}
        <StyledView className="mb-16">
          <StyledView className="flex-row items-center">
            <StyledView className="w-12 h-20 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="star" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[80px]"
                placeholder={t("effectShortDescription", "Short effect description")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={quickTrickData.effect}
                onChangeText={(text) => setQuickTrickData(prev => ({ ...prev, effect: text }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Shield Icon */}
        <StyledView className="items-center mb-8">
          <StyledView className="w-16 h-16 bg-[#10b981]/40 rounded-full items-center justify-center">
            <MaterialIcons name="security" size={32} color="#10b981" />
          </StyledView>
          <StyledText className="text-[#10b981]/80 text-xs mt-2 text-center">
            {t("security.magicSecretsSafe", "Your secrets are protected")}
          </StyledText>
          <StyledText className="text-[#10b981]/80 text-xs text-center">
            {t("security.endToEndEncrypted", "End-to-end encrypted")}
          </StyledText>
        </StyledView>
      </StyledScrollView>

      {/* Bottom Actions */}
      <StyledView
        className="px-6"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {/* Submit Button */}
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row ${
            isFormValid && !isSubmitting && encryptionReady ? "bg-emerald-700" : "bg-white/10"
          }`}
          disabled={!isFormValid || isSubmitting || !encryptionReady}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <>
              <StyledText className="text-white font-semibold text-base mr-2">
                {t("saving", "Saving...")}
              </StyledText>
              <ActivityIndicator size="small" color="white" />
            </>
          ) : (
            <>
              <Ionicons name="flash" size={20} color="white" style={{ marginRight: 8 }} />
              <StyledText className="text-white font-semibold text-base">
                {t("quickMagic.save", "Save Quick Magic")}
              </StyledText>
            </>
          )}
        </StyledTouchableOpacity>
      </StyledView>

      {/* Encryption Setup Modal */}
      <EncryptionSetup
        visible={showEncryptionSetup}
        onClose={() => setShowEncryptionSetup(false)}
        onSetupComplete={() => {}}
      />
    </StyledView>
  )
}
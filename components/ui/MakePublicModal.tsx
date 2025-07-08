import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  modalStyles,
  blurConfig,
  modalClasses,
} from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";
import { trickService } from "../../services/trickService";
import { supabase } from "../../lib/supabase";
import type { MagicTrick } from "../../types/magicTrick";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);
const StyledSwitch = styled(Switch);

interface MakePublicModalProps {
  visible: boolean;
  onClose: () => void;
  trickId: string;
  initialIsPublic?: boolean;
  onSuccess?: (isPublic: boolean) => void;
}

const MakePublicModal: React.FC<MakePublicModalProps> = ({
  visible,
  onClose,
  trickId,
  initialIsPublic = false,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCompleteness, setIsCheckingCompleteness] = useState(false);
  const [trickData, setTrickData] = useState<MagicTrick | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  useEffect(() => {
    console.log("useEffect triggered, visible:", visible, "trickId:", trickId);
    if (visible && trickId) {
      fetchTrickData();
    }
  }, [visible, trickId]);

  // Forzar la carga cuando el modal se abre
  useEffect(() => {
    if (visible) {
      console.log("Modal became visible, fetching data...");
      fetchTrickData();
    }
  }, [visible]);

  useEffect(() => {
    setIsPublic(initialIsPublic);
  }, [initialIsPublic]);

  const checkMissingFields = (trick: MagicTrick): string[] => {
    const missing: string[] = [];

    console.log("Checking fields for trick:", trick);

    if (!trick.title) missing.push(t("fields.title", "Title"));
    if (!trick.selectedCategoryId)
      missing.push(t("fields.category", "Category"));
    if (!trick.tags || trick.tags.length === 0)
      missing.push(t("fields.tags", "Tags"));
    if (!trick.effect_video_url)
      missing.push(t("fields.effectVideo", "Effect Video"));
    if (!trick.effect)
      missing.push(t("fields.effectDescription", "Effect Description"));
    if (!trick.secret_video_url)
      missing.push(t("fields.secretVideo", "Secret Video"));
    if (!trick.secret)
      missing.push(t("fields.secretDescription", "Secret Description"));
    if (!trick.angles || trick.angles.length === 0)
      missing.push(t("fields.angle", "Angle"));
    if (!trick.duration) missing.push(t("fields.duration", "Duration"));
    if (!trick.reset) missing.push(t("fields.resetTime", "Reset Time"));
    if (!trick.difficulty) missing.push(t("fields.difficulty", "Difficulty"));

    console.log("Missing fields:", missing);
    setMissingFields(missing);
    return missing;
  };

  const fetchTrickData = async () => {
    try {
      setIsCheckingCompleteness(true);
      const trick = await trickService.getCompleteTrick(trickId);
      if (trick) {
        setTrickData(trick);
        setIsPublic(trick.is_public);
        const missing = checkMissingFields(trick);

        // Si hay campos faltantes, mostrar modal de incompleto
        if (missing.length > 0) {
          setShowIncompleteModal(true);
        }
      }
    } catch (error) {
      console.error("Error fetching trick:", error);
      Alert.alert(t("error"), t("errorLoadingTrick", "Error loading trick"));
    } finally {
      setIsCheckingCompleteness(false);
    }
  };

  const handleConfirm = async () => {
    // Si intenta cambiar a público y hay campos faltantes
    if (isPublic && missingFields.length > 0) {
      setShowIncompleteModal(true);
      return;
    }

    // Solo actualizar si realmente hay un cambio
    if (isPublic === trickData?.is_public) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const success = await trickService.updateIsPublic(trickId, isPublic);
      if (success) {
        onSuccess?.(isPublic);
        onClose();
      } else {
        Alert.alert(t("error"), t("errorUpdating", "Error updating trick"));
      }
    } catch (error) {
      console.error("Error updating trick:", error);
      Alert.alert(t("error"), t("errorUpdating", "Error updating trick"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteNow = () => {
    onClose();
    router.push({
      pathname: "/(app)/edit-trick",
      params: { trickId: trickId },
    });
  };

  if (
    showIncompleteModal ||
    (missingFields.length > 0 && !isCheckingCompleteness)
  ) {
    return (
      <StyledModal visible={visible} transparent animationType="fade">
        <StyledBlurView
          {...blurConfig.backgroundBlur}
          experimentalBlurMethod="dimezisBlurView"
          className={modalClasses.backgroundBlur}
          style={{ zIndex: 9999 }}
        >
          <StyledView className={modalClasses.mainContainer}>
            <StyledBlurView
              {...blurConfig.containerBlur}
              experimentalBlurMethod="dimezisBlurView"
              className={modalClasses.containerBlur}
              style={modalStyles.modalContainer}
            >
              <StyledView className="px-6 pt-8 pb-6">
                <StyledText
                  className="text-white text-xl text-center mb-4"
                  style={{
                    fontFamily: fontNames.semiBold,
                    fontSize: 24,
                    includeFontPadding: false,
                  }}
                >
                  {t("incomplete.title", "Complete the Trick First")}
                </StyledText>

                <StyledText
                  className="text-white/60 text-center mb-6"
                  style={{
                    fontFamily: fontNames.regular,
                    fontSize: 16,
                    includeFontPadding: false,
                    lineHeight: 22,
                  }}
                >
                  {t(
                    "incomplete.description",
                    "To make this trick public, all fields must be filled out."
                  )}
                </StyledText>

                {missingFields.length > 0 && (
                  <StyledView className="mb-4 bg-black/20 rounded-lg p-4">
                    <StyledText
                      className="text-white/50 text-sm mb-2"
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {t("incomplete.missingFields", "Missing fields:")}
                    </StyledText>
                    <StyledText
                      className="text-white/80 text-sm"
                      style={{
                        fontFamily: fontNames.light,
                        fontSize: 14,
                        includeFontPadding: false,
                        lineHeight: 20,
                      }}
                    >
                      {missingFields.join(", ")}
                    </StyledText>
                  </StyledView>
                )}
              </StyledView>

              <StyledView style={modalStyles.divider} />

              <StyledView>
                <StyledTouchableOpacity
                  className="py-3 items-center"
                  style={modalStyles.actionButton}
                  onPress={handleCompleteNow}
                >
                  <StyledText
                    className="text-white text-base"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 17,
                      includeFontPadding: false,
                    }}
                  >
                    {t("incomplete.completeNow", "Complete Now")}
                  </StyledText>
                </StyledTouchableOpacity>

                <StyledTouchableOpacity
                  className="py-3 items-center"
                  onPress={onClose}
                >
                  <StyledText
                    className="text-white/50 text-base"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 16,
                      includeFontPadding: false,
                    }}
                  >
                    {t("common.cancel", "Cancel")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            </StyledBlurView>
          </StyledView>
        </StyledBlurView>
      </StyledModal>
    );
  }

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        className={modalClasses.backgroundBlur}
        experimentalBlurMethod="dimezisBlurView"
      >
        <StyledView className={modalClasses.mainContainer}>
          <StyledBlurView
            {...blurConfig.containerBlur}
            experimentalBlurMethod="dimezisBlurView"
            className={modalClasses.containerBlur}
            style={modalStyles.modalContainer}
          >
            <StyledView className="px-6 pt-8 pb-6">
              <StyledText
                className="text-white text-xl text-center mb-4"
                style={{
                  fontFamily: fontNames.semiBold,
                  fontSize: 24,
                  includeFontPadding: false,
                }}
              >
                {t("makePublic.title", "Make Public?")}
              </StyledText>

              <StyledText
                className="text-white/60 text-center mb-8 px-2"
                style={{
                  fontFamily: fontNames.regular,
                  fontSize: 16,
                  includeFontPadding: false,
                  lineHeight: 22,
                }}
              >
                {t(
                  "makePublic.description",
                  "By default, this trick is private. If made public, anyone can view the effect in your profile."
                )}
              </StyledText>

              {isCheckingCompleteness ? (
                <StyledView className="items-center">
                  <ActivityIndicator size="small" color="white" />
                </StyledView>
              ) : (
                <StyledView className="items-center">
                  <StyledSwitch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    trackColor={{
                      false: "rgba(255, 255, 255, 0.2)",
                      true: "#10b981",
                    }}
                    thumbColor={isPublic ? "#ffffff" : "#f4f3f4"}
                    ios_backgroundColor="rgba(255, 255, 255, 0.2)"
                    style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }}
                    disabled={isLoading}
                  />
                </StyledView>
              )}
            </StyledView>

            <StyledView style={modalStyles.divider} />

            <StyledView className="pb-2">
              <StyledTouchableOpacity
                className="py-3 items-center"
                onPress={handleConfirm}
                disabled={isLoading || isCheckingCompleteness}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <StyledText
                    className="text-white text-base"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 17,
                      includeFontPadding: false,
                    }}
                  >
                    {t("common.done", "Done")}
                  </StyledText>
                )}
              </StyledTouchableOpacity>
            </StyledView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default MakePublicModal;

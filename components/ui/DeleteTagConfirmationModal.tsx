import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { modalStyles, blurConfig, modalClasses } from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";
import { Ionicons } from "@expo/vector-icons";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface TrickReference {
  id: string;
  title: string;
}

interface DeleteTagConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tagName: string;
  tagColor: string;
  affectedTricks: TrickReference[];
}

const DeleteTagConfirmationModal: React.FC<DeleteTagConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  tagName,
  tagColor,
  affectedTricks,
}) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        {...blurConfig.backgroundBlur}
        experimentalBlurMethod="dimezisBlurView"
        className={modalClasses.backgroundBlur}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <StyledView className={modalClasses.mainContainerWithPadding}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={modalStyles.modalCardShadow}>
                <StyledBlurView
                  {...blurConfig.containerBlur}
                  experimentalBlurMethod="dimezisBlurView"
                  className={modalClasses.containerBlur}
                  style={modalStyles.modalCardBlur}
                >
                  {/* Content */}
                  <StyledView className="p-6">
                    {/* Header */}
                    <StyledView className="items-center mb-4">
                      <StyledView
                        className="w-14 h-14 rounded-full items-center justify-center mb-3"
                        style={{
                          backgroundColor: "#FF4444" + "20",
                        }}
                      >
                        <Ionicons
                          name="warning-outline"
                          size={28}
                          color="#FF4444"
                        />
                      </StyledView>
                      <StyledText
                        className={modalClasses.titleText}
                        style={{
                          fontFamily: fontNames.semiBold,
                          fontSize: 18,
                          includeFontPadding: false,
                        }}
                      >
                        {t("tags.deleteConfirmation.title", "Delete Tag")}
                      </StyledText>
                    </StyledView>

                    {/* Tag to delete */}
                    <StyledView className="items-center mb-4">
                      <StyledView
                        className="px-4 py-2 rounded-full"
                        style={{
                          backgroundColor: tagColor + "30",
                          borderWidth: 1,
                          borderColor: tagColor,
                        }}
                      >
                        <StyledText
                          style={{
                            color: "#FFFFFF",
                            fontFamily: fontNames.medium,
                            fontSize: 16,
                            includeFontPadding: false,
                          }}
                        >
                          {tagName}
                        </StyledText>
                      </StyledView>
                    </StyledView>

                    {/* Warning message */}
                    <StyledText
                      className={`${modalClasses.subtitleTextSmall} text-center mb-3`}
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {affectedTricks.length > 0
                        ? t(
                            "tags.deleteConfirmation.messageWithTricks",
                            "This tag is being used in {{count}} trick(s). It will be removed from all of them:",
                            { count: affectedTricks.length }
                          )
                        : t(
                            "tags.deleteConfirmation.messageNoTricks",
                            "Are you sure you want to delete this tag?"
                          )}
                    </StyledText>

                    {/* Affected tricks list */}
                    {affectedTricks.length > 0 && (
                      <StyledScrollView
                        className="max-h-40 mb-4"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        {affectedTricks.map((trick, index) => (
                          <StyledView
                            key={trick.id}
                            className="flex-row items-center mb-2"
                            style={{
                              paddingBottom: 8,
                              borderBottomWidth:
                                index < affectedTricks.length - 1 ? 0.5 : 0,
                              borderBottomColor: "rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            <Ionicons
                              name="sparkles-outline"
                              size={16}
                              color="rgba(255, 255, 255, 0.6)"
                              style={{ marginRight: 8 }}
                            />
                            <StyledText
                              style={{
                                color: "rgba(255, 255, 255, 0.8)",
                                fontFamily: fontNames.regular,
                                fontSize: 14,
                                includeFontPadding: false,
                                flex: 1,
                              }}
                              numberOfLines={1}
                            >
                              {trick.title}
                            </StyledText>
                          </StyledView>
                        ))}
                      </StyledScrollView>
                    )}

                    <StyledText
                      className={`${modalClasses.subtitleTextSmall} text-center`}
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 13,
                        includeFontPadding: false,
                        color: "rgba(255, 255, 255, 0.5)",
                      }}
                    >
                      {t(
                        "tags.deleteConfirmation.warningMessage",
                        "This action cannot be undone."
                      )}
                    </StyledText>
                  </StyledView>

                  {/* Actions */}
                  <StyledView
                    className={modalClasses.flexRow}
                    style={modalStyles.footerContainer}
                  >
                    <StyledTouchableOpacity
                      className={modalClasses.centerContent}
                      style={modalStyles.buttonLeft}
                      onPress={onClose}
                    >
                      <StyledText
                        className={modalClasses.cancelButtonText}
                        style={{
                          fontFamily: fontNames.medium,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                      >
                        {t("common.cancel", "Cancel")}
                      </StyledText>
                    </StyledTouchableOpacity>

                    <StyledTouchableOpacity
                      className={modalClasses.centerContent}
                      style={modalStyles.buttonRight}
                      onPress={handleConfirm}
                    >
                      <StyledText
                        style={{
                          color: "#FF4444",
                          fontFamily: fontNames.medium,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                      >
                        {t("common.delete", "Delete")}
                      </StyledText>
                    </StyledTouchableOpacity>
                  </StyledView>
                </StyledBlurView>
              </View>
            </Pressable>
          </StyledView>
        </Pressable>
      </StyledBlurView>
    </StyledModal>
  );
};

export default DeleteTagConfirmationModal;

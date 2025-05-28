import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  itemType?: string;
  customMessage?: string;
}

const screenWidth = Dimensions.get("window").width;

const DeleteModal: React.FC<DeleteModalProps> = ({
  visible,
  onClose,
  onConfirm,
  itemName,
  itemType,
  customMessage,
}) => {
  const { t } = useTranslation();

  const getDeleteMessage = () => {
    if (customMessage) return customMessage;
    
    if (itemName && itemType) {
      return `${t("common.delete", "Delete")} <${itemType}>${itemName}</${itemType}>?`;
    }
    
    return t("common.confirmDelete", "This action can't be undone.");
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        intensity={5}
        tint="dark"
        className="flex-1 justify-center items-center"
      >
        <StyledView className="flex-1 justify-center items-center px-6">
          <StyledBlurView
            className="overflow-hidden"
            intensity={60}
            tint="default"
            style={{
              width: screenWidth * 0.9,
              maxWidth: 400,
              backgroundColor: "rgba(255, 255, 255, 0.25)",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(200, 200, 200, 0.4)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Content */}
            <StyledView className="px-6 py-5">
              <StyledText className="text-white/90 text-2xl font-light text-center">
                {getDeleteMessage().split('<')[0]}
                {itemName && itemType && (
                  <>
                    <StyledText className="text-white font-medium">
                      {itemName}
                    </StyledText>
                    <StyledText className="text-white/90">?</StyledText>
                  </>
                )}
              </StyledText>
              
              <StyledText className="text-white/60 text-sm text-center mt-2">
                {t("common.cantUndo", "This action can't be undone.")}
              </StyledText>
            </StyledView>

            {/* Actions */}
            <StyledBlurView
              className="flex-row overflow-hidden"
              style={{ height: 52 }}
              intensity={60}
              tint="default"
            >
              <StyledTouchableOpacity
                className="flex-1 justify-center items-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderTopWidth: 1,
                  borderRightWidth: 0.5,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                }}
                onPress={onClose}
              >
                <StyledText className="text-white/60 text-base font-light">
                  {t("common.cancel", "Cancel")}
                </StyledText>
              </StyledTouchableOpacity>
              
              <StyledTouchableOpacity
                className="flex-1 justify-center items-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderTopWidth: 1,
                  borderLeftWidth: 0.5,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                }}
                onPress={onConfirm}
              >
                <StyledText className="text-red-500 text-base font-medium">
                  {t("common.delete", "Delete")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledBlurView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default DeleteModal;
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
import { Feather } from "@expo/vector-icons";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

interface SuccessCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onViewItem: () => void;
  onAddAnother: () => void;
  itemName: string;
  itemType: "trick" | "technique" | "gimmick";
}

const screenWidth = Dimensions.get("window").width;

const SuccessCreationModal: React.FC<SuccessCreationModalProps> = ({
  visible,
  onClose,
  onViewItem,
  onAddAnother,
  itemName,
  itemType,
}) => {
  const { t } = useTranslation();

  const getItemTypeText = () => {
    switch (itemType) {
      case "trick":
        return t("common.trick", "trick");
      case "technique":
        return t("common.technique", "technique");
      case "gimmick":
        return t("common.gimmick", "gimmick");
      default:
        return t("common.item", "item");
    }
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
            <StyledView className="px-6 pt-8 pb-6">
              {/* Success Icon */}
              <StyledView className="items-center mb-6">
                <StyledView 
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: "rgba(16, 185, 129, 0.2)" }}
                >
                  <Feather name="check" size={32} color="#10b981" />
                </StyledView>
              </StyledView>

              {/* Success Message */}
              <StyledText className="text-white/90 text-xl text-center mb-2">
                <StyledText className="font-medium">{itemName}</StyledText>
                {" "}
                {t("successCreation.hasBeenCreated", "has been created")}
              </StyledText>
              
              <StyledText className="text-white/60 text-base text-center">
                {t("successCreation.andEncrypted", "and encrypted successfully")}
              </StyledText>
            </StyledView>

            {/* Divider */}
            <StyledView 
              style={{ 
                height: 0.5, 
                backgroundColor: "rgba(200, 200, 200, 0.3)" 
              }} 
            />

            {/* Actions */}
            <StyledView>
              {/* View Item Button */}
              <StyledTouchableOpacity
                className="py-4 items-center"
                style={{
                  borderBottomWidth: 0.5,
                  borderBottomColor: "rgba(200, 200, 200, 0.3)",
                }}
                onPress={onViewItem}
              >
                <StyledText className="text-white text-base">
                  {t("successCreation.view", "View")} {itemName}
                </StyledText>
              </StyledTouchableOpacity>

              {/* Register More Button */}
              <StyledTouchableOpacity
                className="py-4 items-center"
                style={{
                  borderBottomWidth: 0.5,
                  borderBottomColor: "rgba(200, 200, 200, 0.3)",
                }}
                onPress={onAddAnother}
              >
                <StyledText className="text-white/80 text-base">
                  {t("successCreation.registerMore", "Register more")}
                </StyledText>
              </StyledTouchableOpacity>

              {/* Done Button */}
              <StyledTouchableOpacity
                className="py-4 items-center"
                onPress={onClose}
              >
                <StyledText className="text-white text-base font-medium">
                  {t("successCreation.done", "Done")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default SuccessCreationModal;
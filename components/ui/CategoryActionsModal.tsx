import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
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

interface CategoryActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  categoryName?: string;
}

const screenWidth = Dimensions.get("window").width;

const CategoryActionsModal: React.FC<CategoryActionsModalProps> = ({
  visible,
  onClose,
  onEdit,
  onDelete,
  categoryName,
}) => {
  const { t } = useTranslation();

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handleDelete = () => {
    onClose();
    onDelete();
  };

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <StyledBlurView
          intensity={5}
          tint="dark"
          className="flex-1 justify-end"
        >
          <TouchableWithoutFeedback>
            <StyledView className="items-center pb-6 px-4">
              {/* Actions Container */}
              <StyledBlurView
                className="w-full overflow-hidden mb-2"
                intensity={60}
                tint="default"
                style={{
                  maxWidth: 400,
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  borderRadius: 30,
                  borderWidth: 1,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                }}
              >
                {/* Edit Button */}
                <StyledTouchableOpacity
                  className="py-4 items-center"
                  style={{
                    borderBottomWidth: 0.5,
                    borderBottomColor: "rgba(200, 200, 200, 0.3)",
                  }}
                  onPress={handleEdit}
                >
                  <StyledText className="text-white text-base font-medium">
                    {t("common.edit", "Edit")}
                  </StyledText>
                </StyledTouchableOpacity>

                {/* Delete Button */}
                <StyledTouchableOpacity
                  className="py-4 items-center"
                  onPress={handleDelete}
                >
                  <StyledText className="text-red-400 text-base font-light">
                    {t("common.delete", "Delete")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledBlurView>

              {/* Cancel Button */}
              <StyledBlurView
                className="w-full overflow-hidden"
                intensity={60}
                tint="default"
                style={{
                  maxWidth: 400,
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                }}
              >
                <StyledTouchableOpacity
                  className="py-4 items-center"
                  onPress={onClose}
                >
                  <StyledText className="text-white/60 text-base font-light">
                    {t("common.cancel", "Cancel")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledBlurView>
            </StyledView>
          </TouchableWithoutFeedback>
        </StyledBlurView>
      </TouchableWithoutFeedback>
    </StyledModal>
  );
};

export default CategoryActionsModal;
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { modalStyles, blurConfig, modalClasses } from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";

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
          {...blurConfig.backgroundBlur}
          experimentalBlurMethod="dimezisBlurView"
          className="flex-1 justify-end"
        >
          <TouchableWithoutFeedback>
            <StyledView className="items-center pb-6 px-4">
              {/* Actions Container */}
              <StyledBlurView
                {...blurConfig.containerBlur}
                experimentalBlurMethod="dimezisBlurView"
                className="w-full overflow-hidden mb-2"
                style={modalStyles.actionModalContainer}
              >
                {/* Actions wrapper */}
                <StyledView>
                  {/* Edit Button */}
                  <StyledTouchableOpacity
                    className="py-4 items-center"
                    style={{
                      borderBottomWidth: 0.5,
                      borderBottomColor: "rgba(200, 200, 200, 0.3)",
                      backgroundColor: "transparent",
                    }}
                    onPress={handleEdit}
                  >
                    <StyledText 
                      className={modalClasses.buttonText}
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 17,
                        includeFontPadding: false,
                      }}
                    >
                      {t("common.edit", "Edit")}
                    </StyledText>
                  </StyledTouchableOpacity>

                  {/* Delete Button */}
                  <StyledTouchableOpacity
                    className="py-4 items-center"
                    style={{
                      backgroundColor: "transparent",
                    }}
                    onPress={handleDelete}
                  >
                    <StyledText 
                      className={modalClasses.deleteButtonTextLight}
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 17,
                        includeFontPadding: false,
                      }}
                    >
                      {t("common.delete", "Delete")}
                    </StyledText>
                  </StyledTouchableOpacity>
                </StyledView>
              </StyledBlurView>

              {/* Cancel Button */}
              <StyledBlurView
                {...blurConfig.containerBlur}
                experimentalBlurMethod="dimezisBlurView"
                className="w-full overflow-hidden"
                style={{
                  ...modalStyles.actionModalContainer,
                  borderRadius: 20, // Override para el botón de cancelar
                }}
              >
                <StyledTouchableOpacity
                  className="py-4 items-center"
                  style={{
                    backgroundColor: "transparent",
                  }}
                  onPress={onClose}
                >
                  <StyledText 
                    className={modalClasses.cancelButtonText}
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 17,
                      includeFontPadding: false,
                    }}
                  >
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
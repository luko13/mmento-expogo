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
import { Ionicons } from "@expo/vector-icons";
import { modalStyles, blurConfig, modalClasses } from "../../styles/modalStyles";
import { fontNames } from "../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);

type SortBy = "name" | "usage" | "date";
type SortOrder = "asc" | "desc";

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  currentSortBy: SortBy;
  currentSortOrder: SortOrder;
  onSortChange: (sortBy: SortBy) => void;
}

const SortModal: React.FC<SortModalProps> = ({
  visible,
  onClose,
  currentSortBy,
  currentSortOrder,
  onSortChange,
}) => {
  const { t } = useTranslation();

  const sortOptions: { key: SortBy; label: string; icon: string }[] = [
    { key: "name", label: t("sort.alphabetically", "Alphabetically"), icon: "text-outline" },
    { key: "usage", label: t("sort.byUsage", "By usage"), icon: "stats-chart-outline" },
    { key: "date", label: t("sort.byDate", "By date"), icon: "calendar-outline" },
  ];

  const getSortIcon = (sortBy: SortBy) => {
    if (currentSortBy !== sortBy) return null;
    return currentSortOrder === "asc" ? "arrow-up" : "arrow-down";
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
              {/* Sort Options Container */}
              <StyledBlurView
                {...blurConfig.containerBlur}
                experimentalBlurMethod="dimezisBlurView"
                className="w-full overflow-hidden mb-2"
                style={modalStyles.actionModalContainer}
              >
                {/* Title */}
                <StyledView
                  className="py-3 items-center"
                  style={{
                    borderBottomWidth: 0.5,
                    borderBottomColor: "rgba(200, 200, 200, 0.3)",
                  }}
                >
                  <StyledText
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontFamily: fontNames.regular,
                      fontSize: 13,
                      includeFontPadding: false,
                    }}
                  >
                    {t("sort.sortBy", "Sort by")}
                  </StyledText>
                </StyledView>

                {/* Sort Options */}
                {sortOptions.map((option, index) => {
                  const isSelected = currentSortBy === option.key;
                  const orderIcon = getSortIcon(option.key);

                  return (
                    <StyledTouchableOpacity
                      key={option.key}
                      className="py-4 items-center flex-row justify-center"
                      style={{
                        borderBottomWidth:
                          index < sortOptions.length - 1 ? 0.5 : 0,
                        borderBottomColor: "rgba(200, 200, 200, 0.3)",
                        backgroundColor: "transparent",
                      }}
                      onPress={() => onSortChange(option.key)}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={isSelected ? "#5BB9A3" : "rgba(255, 255, 255, 0.6)"}
                        style={{ marginRight: 8 }}
                      />
                      <StyledText
                        className={modalClasses.buttonText}
                        style={{
                          fontFamily: isSelected ? fontNames.medium : fontNames.regular,
                          fontSize: 17,
                          includeFontPadding: false,
                          color: isSelected ? "#5BB9A3" : "#FFFFFF",
                        }}
                      >
                        {option.label}
                      </StyledText>
                      {orderIcon && (
                        <Ionicons
                          name={orderIcon as any}
                          size={18}
                          color="#5BB9A3"
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </StyledTouchableOpacity>
                  );
                })}
              </StyledBlurView>

              {/* Cancel Button */}
              <StyledBlurView
                {...blurConfig.containerBlur}
                experimentalBlurMethod="dimezisBlurView"
                className="w-full overflow-hidden"
                style={{
                  ...modalStyles.actionModalContainer,
                  borderRadius: 20,
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

export default SortModal;

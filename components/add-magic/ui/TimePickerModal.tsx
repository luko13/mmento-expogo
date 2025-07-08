import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { fontNames } from "../../../app/_layout";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);
const StyledScrollView = styled(ScrollView);

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (totalSeconds: number) => void;
  initialMinutes?: number;
  initialSeconds?: number;
  title?: string;
}

const screenWidth = Dimensions.get("window").width;
const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialMinutes = 0,
  initialSeconds = 0,
  title,
}) => {
  const { t } = useTranslation();
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);
  const [selectedSeconds, setSelectedSeconds] = useState(initialSeconds);

  const minutesScrollRef = useRef<ScrollView>(null);
  const secondsScrollRef = useRef<ScrollView>(null);

  // Generate arrays for minutes (0-59) and seconds (0-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

  useEffect(() => {
    if (visible) {
      // Reset to initial values when modal opens
      setSelectedMinutes(initialMinutes);
      setSelectedSeconds(initialSeconds);

      // Scroll to initial positions after a short delay
      setTimeout(() => {
        minutesScrollRef.current?.scrollTo({
          y: initialMinutes * ITEM_HEIGHT,
          animated: false,
        });
        secondsScrollRef.current?.scrollTo({
          y: initialSeconds * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialMinutes, initialSeconds]);

  const handleScroll = (event: any, type: "minutes" | "seconds") => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);

    if (type === "minutes") {
      setSelectedMinutes(Math.max(0, Math.min(59, index)));
    } else {
      setSelectedSeconds(Math.max(0, Math.min(59, index)));
    }
  };

  const scrollToIndex = (
    scrollRef: React.RefObject<ScrollView | null>,
    index: number
  ) => {
    scrollRef.current?.scrollTo({
      y: index * ITEM_HEIGHT,
      animated: true,
    });
  };

  const handleConfirm = () => {
    const totalSeconds = selectedMinutes * 60 + selectedSeconds;
    onConfirm(totalSeconds);
    onClose();
  };

  const renderPickerItem = (value: number, isSelected: boolean) => (
    <StyledView
      key={value}
      className="items-center justify-center"
      style={{ height: ITEM_HEIGHT }}
    >
      <StyledText
        className={`text-2xl ${
          isSelected ? "text-white font-semibold" : "text-white/40"
        }`}
        style={{
          fontFamily: isSelected ? fontNames.semiBold : fontNames.light,
          fontSize: 24,
          includeFontPadding: false,
        }}
      >
        {value.toString().padStart(2, "0")}
      </StyledText>
    </StyledView>
  );

  const renderPicker = (
    values: number[],
    selectedValue: number,
    scrollRef: React.RefObject<ScrollView | null>,
    type: "minutes" | "seconds"
  ) => (
    <StyledView className="flex-1">
      <StyledScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => handleScroll(e, type)}
        onScrollEndDrag={(e) => handleScroll(e, type)}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
      >
        {values.map((value) =>
          renderPickerItem(value, value === selectedValue)
        )}
      </StyledScrollView>

      {/* Selection indicator lines */}
      <StyledView
        className="absolute left-0 right-0"
        style={{
          top: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2,
          height: ITEM_HEIGHT,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.2)",
        }}
        pointerEvents="none"
      />
    </StyledView>
  );

  return (
    <StyledModal visible={visible} transparent animationType="fade">
      <StyledBlurView
        intensity={10}
        tint="dark"
        className="flex-1 justify-center items-center"
        style={{ zIndex: 9999, elevation: 999 }}
      >
        <StyledView className="flex-1 justify-center items-center px-6">
          {/* Modal with blur effect border */}
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
            {/* Title */}
            <StyledView className="px-6 pt-6 pb-4">
              <StyledText
                className="text-white text-lg font-medium text-center"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 20,
                  includeFontPadding: false,
                }}
              >
                {title || t("selectTime", "Select Time")}
              </StyledText>
              <StyledText
                className="text-white/60 text-sm text-center mt-2"
                style={{
                  fontFamily: fontNames.light,
                  fontSize: 14,
                  includeFontPadding: false,
                }}
              >
                {`${selectedMinutes
                  .toString()
                  .padStart(2, "0")}:${selectedSeconds
                  .toString()
                  .padStart(2, "0")}`}
              </StyledText>
            </StyledView>

            {/* Time Pickers */}
            <StyledView className="px-6 pb-6">
              <StyledView
                className="flex-row items-center"
                style={{ height: PICKER_HEIGHT }}
              >
                {/* Minutes Picker */}
                <StyledView className="flex-1">
                  <StyledText
                    className="text-white/60 text-sm text-center mb-2"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 14,
                      includeFontPadding: false,
                    }}
                  >
                    {t("minutes", "Minutes")}
                  </StyledText>
                  {renderPicker(
                    minutes,
                    selectedMinutes,
                    minutesScrollRef,
                    "minutes"
                  )}
                </StyledView>

                {/* Separator */}
                <StyledText
                  className="text-white text-2xl font-semibold mx-4"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 24,
                    includeFontPadding: false,
                  }}
                >
                  :
                </StyledText>

                {/* Seconds Picker */}
                <StyledView className="flex-1">
                  <StyledText
                    className="text-white/60 text-sm text-center mb-2"
                    style={{
                      fontFamily: fontNames.light,
                      fontSize: 14,
                      includeFontPadding: false,
                    }}
                  >
                    {t("seconds", "Seconds")}
                  </StyledText>
                  {renderPicker(
                    seconds,
                    selectedSeconds,
                    secondsScrollRef,
                    "seconds"
                  )}
                </StyledView>
              </StyledView>
            </StyledView>

            {/* Actions - No gap between buttons */}
            <StyledBlurView
              className="flex-row overflow-hidden"
              style={{ height: 56 }}
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
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                  elevation: 10,
                }}
                onPress={onClose}
              >
                <StyledText
                  className="text-white/60 text-base font-medium"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
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
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                  elevation: 10,
                }}
                onPress={handleConfirm}
              >
                <StyledText
                  className="text-white/60 text-base font-medium"
                  style={{
                    fontFamily: fontNames.light,
                    fontSize: 16,
                    includeFontPadding: false,
                  }}
                >
                  {t("common.confirm", "Confirm")}
                </StyledText>
              </StyledTouchableOpacity>
            </StyledBlurView>
          </StyledBlurView>
        </StyledView>
      </StyledBlurView>
    </StyledModal>
  );
};

export default TimePickerModal;

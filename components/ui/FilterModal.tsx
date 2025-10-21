import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { styled } from "nativewind";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { Ionicons, Feather } from "@expo/vector-icons";
import { fontNames } from "../../app/_layout";
import { supabase } from "../../lib/supabase";
import CategorySelector from "../ui/CategorySelector";
import TagSelector from "../ui/TagSelector";
import TimePickerModal from "../add-magic/ui/TimePickerModal";
import DifficultySlider from "../add-magic/ui/DifficultySlider";
import {
  modalStyles,
  blurConfig,
  modalClasses,
} from "../../styles/modalStyles";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);
const StyledScrollView = styled(ScrollView);
const StyledSwitch = styled(Switch);

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

export interface SearchFilters {
  categories: string[];
  tags: string[];
  tagsMode?: "and" | "or";
  difficulties: number[];
  resetTimes: { min?: number; max?: number };
  durations: { min?: number; max?: number };
  angles: string[];
  isPublic?: boolean | null;
  sortOrder?: "recent" | "last";
}

interface FiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: SearchFilters) => void;
  currentFilters: SearchFilters;
}

const ANGLES = ["90", "120", "180", "360"];

export default function FiltersModal({
  visible,
  onClose,
  onApplyFilters,
  currentFilters,
}: FiltersModalProps) {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | undefined>();

  // Local filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentFilters.categories
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    currentFilters.tags
  );
  const [tagsMode, setTagsMode] = useState<"and" | "or">(
    currentFilters.tagsMode ?? "or"
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(
    currentFilters.difficulties.length > 0
      ? currentFilters.difficulties[0]
      : null
  );
  const [resetTimeMin, setResetTimeMin] = useState<number | undefined>(
    currentFilters.resetTimes.min
  );
  const [resetTimeMax, setResetTimeMax] = useState<number | undefined>(
    currentFilters.resetTimes.max
  );
  const [durationMin, setDurationMin] = useState<number | undefined>(
    currentFilters.durations.min
  );
  const [durationMax, setDurationMax] = useState<number | undefined>(
    currentFilters.durations.max
  );
  const [selectedAngles, setSelectedAngles] = useState<string[]>(
    currentFilters.angles
  );
  const [sortOrder, setSortOrder] = useState<"recent" | "last">(
    currentFilters.sortOrder ?? "recent"
  );
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Time picker states
  const [showResetTimeMinPicker, setShowResetTimeMinPicker] = useState(false);
  const [showResetTimeMaxPicker, setShowResetTimeMaxPicker] = useState(false);
  const [showDurationMinPicker, setShowDurationMinPicker] = useState(false);
  const [showDurationMaxPicker, setShowDurationMaxPicker] = useState(false);

  // Add state to control modal visibility
  const [isModalClosing, setIsModalClosing] = useState(false);

  useEffect(() => {
    fetchUserId();
  }, []);

  // Reset local states when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedCategories(currentFilters.categories);
      setSelectedTags(currentFilters.tags);
      setTagsMode(currentFilters.tagsMode ?? "or");
      setSelectedDifficulty(
        currentFilters.difficulties.length > 0
          ? currentFilters.difficulties[0]
          : null
      );
      setResetTimeMin(currentFilters.resetTimes.min);
      setResetTimeMax(currentFilters.resetTimes.max);
      setDurationMin(currentFilters.durations.min);
      setDurationMax(currentFilters.durations.max);
      setSelectedAngles(currentFilters.angles);
      setSortOrder(currentFilters.sortOrder ?? "recent");
    }
  }, [visible, currentFilters]);

  const fetchUserId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleAngle = (angle: string) => {
    setSelectedAngles((prev) =>
      prev.includes(angle) ? prev.filter((a) => a !== angle) : [...prev, angle]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedTags([]);
    setTagsMode("or");
    setSelectedDifficulty(null);
    setResetTimeMin(undefined);
    setResetTimeMax(undefined);
    setDurationMin(undefined);
    setDurationMax(undefined);
    setSelectedAngles([]);
    setSortOrder("recent");
  };

  const applyFilters = () => {
    onApplyFilters({
      categories: selectedCategories,
      tags: selectedTags,
      tagsMode: tagsMode,
      difficulties: selectedDifficulty !== null ? [selectedDifficulty] : [],
      resetTimes: { min: resetTimeMin, max: resetTimeMax },
      durations: { min: durationMin, max: durationMax },
      angles: selectedAngles,
      isPublic: null,
      sortOrder: sortOrder,
    });
    onClose();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (selectedTags.length > 0) count += selectedTags.length;
    if (selectedDifficulty !== null) count++;
    if (resetTimeMin !== undefined) count++;
    if (resetTimeMax !== undefined) count++;
    if (durationMin !== undefined) count++;
    if (durationMax !== undefined) count++;
    if (selectedAngles.length > 0) count += selectedAngles.length;
    if (sortOrder !== "recent") count++;
    return count;
  };

  const clearTimeFilter = (
    type: "resetMin" | "resetMax" | "durationMin" | "durationMax"
  ) => {
    switch (type) {
      case "resetMin":
        setResetTimeMin(undefined);
        break;
      case "resetMax":
        setResetTimeMax(undefined);
        break;
      case "durationMin":
        setDurationMin(undefined);
        break;
      case "durationMax":
        setDurationMax(undefined);
        break;
    }
  };

  // Time picker handlers
  const handleDurationMinPress = () => {
    setShowSortDropdown(false);
    setIsModalClosing(true);

    setTimeout(() => {
      setShowDurationMinPicker(true);
    }, 500); // Longer delay to ensure modal is ready
  };

  const handleDurationMaxPress = () => {
    setShowSortDropdown(false);
    setIsModalClosing(true);

    setTimeout(() => {
      setShowDurationMaxPicker(true);
    }, 500);
  };

  const handleResetTimeMinPress = () => {
    setShowSortDropdown(false);
    setIsModalClosing(true);

    setTimeout(() => {
      setShowResetTimeMinPicker(true);
    }, 500);
  };

  const handleResetTimeMaxPress = () => {
    setShowSortDropdown(false);
    setIsModalClosing(true);

    setTimeout(() => {
      setShowResetTimeMaxPicker(true);
    }, 500);
  };

  // Reset modal closing state when time pickers close
  const handleTimePickerClose = (setter: (value: boolean) => void) => {
    setter(false);
    setIsModalClosing(false);
  };

  return (
    <>
      <StyledModal
        visible={visible && !isModalClosing}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <StyledBlurView
          {...blurConfig.backgroundBlurDark}
          experimentalBlurMethod="dimezisBlurView"
          className="flex-1"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            {/* Backdrop */}
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={onClose}
            />

            {/* Modal Content */}
            <StyledView
              style={{
                height: screenHeight * 0.9,
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                overflow: "hidden",
              }}
            >
              {/* Vista para el borde */}
              <StyledView
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderTopLeftRadius: 30,
                  borderTopRightRadius: 30,
                  borderWidth: 1,
                  borderColor: "rgba(200, 200, 200, 0.4)",
                  borderBottomWidth: 0,
                  zIndex: 2,
                  pointerEvents: "none",
                }}
              />

              <StyledBlurView
                {...blurConfig.containerBlur}
                experimentalBlurMethod="dimezisBlurView"
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.30)",
                  borderTopLeftRadius: 30,
                  borderTopRightRadius: 30,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -10 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                {/* Header */}
                <StyledView className="px-6 pt-5">
                  {/* Filter by row */}
                  <StyledView className="flex-row items-center justify-between mb-3">
                    <StyledText
                      className="text-white"
                      style={{
                        fontFamily: fontNames.medium,
                        fontSize: 16,
                        includeFontPadding: false,
                      }}
                    >
                      {t("filterBy", "Filter by")}
                    </StyledText>

                    {/* Close button */}
                    <StyledTouchableOpacity onPress={onClose}>
                      <Feather name="x" size={22} color="white" />
                    </StyledTouchableOpacity>
                  </StyledView>

                  {/* Order/Sort row */}
                  <StyledView className="flex-row items-center">
                    <StyledText
                      className="text-white/70 mr-2"
                      style={{
                        fontFamily: fontNames.regular,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {t("order", "Order:")}
                    </StyledText>
                    <StyledTouchableOpacity
                      onPress={() => setShowSortDropdown(!showSortDropdown)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <StyledText
                        className="text-white mr-1"
                        style={{
                          fontFamily: fontNames.extraLight,
                          fontSize: 14,
                          includeFontPadding: false,
                        }}
                      >
                        {sortOrder === "recent"
                          ? t("recentAdded", "Recent added")
                          : t("lastAdded", "Last added")}
                      </StyledText>
                      <Feather
                        name={showSortDropdown ? "chevron-up" : "chevron-down"}
                        size={14}
                        color="white"
                      />
                    </StyledTouchableOpacity>
                  </StyledView>

                  {/* Sort Dropdown Menu */}
                  {showSortDropdown && (
                    <StyledView
                      style={{
                        position: "absolute",
                        top: 95,
                        left: 80,
                        zIndex: 1000,
                        borderRadius: 12,
                      }}
                    >
                      <StyledBlurView
                        {...blurConfig.containerBlur}
                        experimentalBlurMethod="dimezisBlurView"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.30)",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "rgba(200, 200, 200, 0.4)",
                          paddingVertical: 4,
                          minWidth: 150,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 5,
                          overflow: "hidden",
                        }}
                      >
                        <StyledTouchableOpacity
                          onPress={() => {
                            setSortOrder("recent");
                            setShowSortDropdown(false);
                          }}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            backgroundColor:
                              sortOrder === "recent"
                                ? "rgba(16, 185, 129, 0.3)"
                                : "transparent",
                          }}
                        >
                          <StyledText
                            className="text-white"
                            style={{
                              fontFamily: fontNames.regular,
                              fontSize: 14,
                              includeFontPadding: false,
                            }}
                          >
                            {t("recentAdded", "Recent added")}
                          </StyledText>
                        </StyledTouchableOpacity>

                        <StyledView
                          style={{
                            height: 0.5,
                            backgroundColor: "rgba(200, 200, 200, 0.3)",
                          }}
                        />

                        <StyledTouchableOpacity
                          onPress={() => {
                            setSortOrder("last");
                            setShowSortDropdown(false);
                          }}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            backgroundColor:
                              sortOrder === "last"
                                ? "rgba(16, 185, 129, 0.3)"
                                : "transparent",
                          }}
                        >
                          <StyledText
                            className="text-white"
                            style={{
                              fontFamily: fontNames.regular,
                              fontSize: 14,
                              includeFontPadding: false,
                            }}
                          >
                            {t("lastAdded", "Last added")}
                          </StyledText>
                        </StyledTouchableOpacity>
                      </StyledBlurView>
                    </StyledView>
                  )}
                </StyledView>

                {/* Filters Content - Non-scrollable */}
                <StyledView
                  className="flex-1"
                  style={{
                    paddingHorizontal: 24,
                  }}
                >
                  {/* Categories */}
                  <StyledView className="mt-4">
                    <StyledText
                      className="text-white mb-2"
                      style={{
                        fontFamily: fontNames.medium,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {t("categories", "Categories")}
                    </StyledText>
                    <CategorySelector
                      selectedCategories={selectedCategories}
                      onCategoriesChange={setSelectedCategories}
                      allowCreate={false}
                      allowMultiple={true}
                      placeholder={t(
                        "selectCategories",
                        "Select categories..."
                      )}
                      userId={userId}
                      excludeFavorites={false}
                    />
                  </StyledView>

                  {/* Tags */}
                  <StyledView>
                    <StyledView className="flex-row items-center mb-2">
                      <StyledText
                        className="text-white mr-4"
                        style={{
                          fontFamily: fontNames.medium,
                          fontSize: 14,
                          includeFontPadding: false,
                        }}
                      >
                        {t("tags", "Tags")}
                      </StyledText>

                      {/* AND/OR Toggle */}
                      <StyledView className="flex-row items-center">
                        <StyledText
                          className={
                            tagsMode === "and" ? "text-white" : "text-white/40"
                          }
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 12,
                            includeFontPadding: false,
                          }}
                        >
                          And
                        </StyledText>
                        <StyledSwitch
                          value={tagsMode === "or"}
                          onValueChange={(value) =>
                            setTagsMode(value ? "or" : "and")
                          }
                          trackColor={{
                            false: "rgba(255, 255, 255, 0.2)",
                            true: "rgba(255, 255, 255, 0.2)",
                          }}
                          thumbColor="#ffffff"
                          ios_backgroundColor="rgba(255, 255, 255, 0.2)"
                          style={{
                            transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
                            marginHorizontal: 6,
                          }}
                        />
                        <StyledText
                          className={
                            tagsMode === "or" ? "text-white" : "text-white/40"
                          }
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 12,
                            includeFontPadding: false,
                          }}
                        >
                          Or
                        </StyledText>
                      </StyledView>
                    </StyledView>

                    <TagSelector
                      selectedTags={selectedTags}
                      onTagsChange={setSelectedTags}
                      allowCreate={false}
                      placeholder={t("selectTags", "Select tags...")}
                      userId={userId}
                    />
                  </StyledView>

                  {/* Angles */}
                  <StyledView>
                    <StyledText
                      className="text-white mb-2"
                      style={{
                        fontFamily: fontNames.medium,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {t("angles", "Angles")}
                    </StyledText>
                    <StyledView className="flex-row justify-between">
                      {ANGLES.map((angle) => (
                        <StyledTouchableOpacity
                          key={angle}
                          onPress={() => toggleAngle(angle)}
                          className="flex-row items-center"
                          style={{ flex: 1, justifyContent: "center" }}
                        >
                          <StyledView
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              borderWidth: 2,
                              borderColor: "rgba(255, 255, 255, 0.6)",
                              backgroundColor: selectedAngles.includes(angle)
                                ? "#ffffff"
                                : "transparent",
                              marginRight: 6,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {selectedAngles.includes(angle) && (
                              <StyledView
                                style={{
                                  width: 9,
                                  height: 9,
                                  borderRadius: 4.5,
                                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                                }}
                              />
                            )}
                          </StyledView>
                          <StyledText
                            className="text-white"
                            style={{
                              fontFamily: fontNames.regular,
                              fontSize: 14,
                              includeFontPadding: false,
                            }}
                          >
                            {angle}°
                          </StyledText>
                        </StyledTouchableOpacity>
                      ))}
                    </StyledView>
                  </StyledView>

                  {/* Difficulty */}
                  <StyledView className="mt-6">
                    <StyledText
                      className="text-white mb-2"
                      style={{
                        fontFamily: fontNames.medium,
                        fontSize: 14,
                        includeFontPadding: false,
                      }}
                    >
                      {t("difficulty", "Difficulty")}
                    </StyledText>
                    <DifficultySlider
                      value={selectedDifficulty}
                      onChange={setSelectedDifficulty}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </StyledView>

                  {/* Duration Range */}
                  <StyledView className="mt-3">
                    <StyledText
                      className="text-white mb-2"
                      style={{
                        fontFamily: fontNames.medium,
                        fontSize: 13,
                        includeFontPadding: false,
                      }}
                    >
                      {t("duration", "Duration")} (Min - Max)
                    </StyledText>
                    <StyledView className="flex-row items-center">
                      <StyledTouchableOpacity
                        onPress={handleDurationMinPress}
                        onLongPress={() => clearTimeFilter("durationMin")}
                        className="flex-1 mr-1"
                        style={{
                          ...modalStyles.pillContainer,
                          backgroundColor:
                            durationMin !== undefined
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(255, 255, 255, 0.1)",
                          borderColor:
                            durationMin !== undefined
                              ? "rgba(16, 185, 129, 0.4)"
                              : "rgba(255, 255, 255, 0.2)",
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                        }}
                      >
                        <StyledText
                          className="text-white text-center"
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 13,
                            includeFontPadding: false,
                          }}
                        >
                          {durationMin !== undefined
                            ? formatTime(durationMin)
                            : t("min", "Min")}
                        </StyledText>
                      </StyledTouchableOpacity>

                      <StyledText
                        className="text-white/60"
                        style={{ fontSize: 13, marginHorizontal: 6 }}
                      >
                        —
                      </StyledText>

                      <StyledTouchableOpacity
                        onPress={handleDurationMaxPress}
                        onLongPress={() => clearTimeFilter("durationMax")}
                        className="flex-1 ml-1"
                        style={{
                          ...modalStyles.pillContainer,
                          backgroundColor:
                            durationMax !== undefined
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(255, 255, 255, 0.1)",
                          borderColor:
                            durationMax !== undefined
                              ? "rgba(16, 185, 129, 0.4)"
                              : "rgba(255, 255, 255, 0.2)",
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                        }}
                      >
                        <StyledText
                          className="text-white text-center"
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 13,
                            includeFontPadding: false,
                          }}
                        >
                          {durationMax !== undefined
                            ? formatTime(durationMax)
                            : t("max", "Max")}
                        </StyledText>
                      </StyledTouchableOpacity>
                    </StyledView>
                  </StyledView>

                  {/* Reset Time Range */}
                  <StyledView className="mt-2">
                    <StyledText
                      className="text-white mb-2"
                      style={{
                        fontFamily: fontNames.medium,
                        fontSize: 13,
                        includeFontPadding: false,
                      }}
                    >
                      {t("timeReset", "Time Reset")} (Min - Max)
                    </StyledText>
                    <StyledView className="flex-row items-center">
                      <StyledTouchableOpacity
                        onPress={handleResetTimeMinPress}
                        onLongPress={() => clearTimeFilter("resetMin")}
                        className="flex-1 mr-1"
                        style={{
                          ...modalStyles.pillContainer,
                          backgroundColor:
                            resetTimeMin !== undefined
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(255, 255, 255, 0.1)",
                          borderColor:
                            resetTimeMin !== undefined
                              ? "rgba(16, 185, 129, 0.4)"
                              : "rgba(255, 255, 255, 0.2)",
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                        }}
                      >
                        <StyledText
                          className="text-white text-center"
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 13,
                            includeFontPadding: false,
                          }}
                        >
                          {resetTimeMin !== undefined
                            ? formatTime(resetTimeMin)
                            : t("min", "Min")}
                        </StyledText>
                      </StyledTouchableOpacity>

                      <StyledText
                        className="text-white/60"
                        style={{ fontSize: 13, marginHorizontal: 6 }}
                      >
                        —
                      </StyledText>

                      <StyledTouchableOpacity
                        onPress={handleResetTimeMaxPress}
                        onLongPress={() => clearTimeFilter("resetMax")}
                        className="flex-1 ml-1"
                        style={{
                          ...modalStyles.pillContainer,
                          backgroundColor:
                            resetTimeMax !== undefined
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(255, 255, 255, 0.1)",
                          borderColor:
                            resetTimeMax !== undefined
                              ? "rgba(16, 185, 129, 0.4)"
                              : "rgba(255, 255, 255, 0.2)",
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                        }}
                      >
                        <StyledText
                          className="text-white text-center"
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 13,
                            includeFontPadding: false,
                          }}
                        >
                          {resetTimeMax !== undefined
                            ? formatTime(resetTimeMax)
                            : t("max", "Max")}
                        </StyledText>
                      </StyledTouchableOpacity>
                    </StyledView>
                  </StyledView>
                </StyledView>

                {/* Apply Button Footer */}
                <StyledView
                  style={{
                    paddingHorizontal: 24,
                    paddingTop: 20,
                    paddingBottom: 28,
                    backgroundColor: "transparent",
                  }}
                >
                  <StyledView
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {/* Clear Filters Button */}
                    <StyledTouchableOpacity
                      onPress={clearAllFilters}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 4,
                      }}
                    >
                      <StyledText
                        style={{
                          color: "#10b981",
                          fontFamily: fontNames.light,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                      >
                        {t("clearFilters", "Clear Filters")}
                      </StyledText>
                    </StyledTouchableOpacity>

                    {/* Apply Button */}
                    <StyledTouchableOpacity
                      onPress={applyFilters}
                      style={{
                        backgroundColor: "#10b981",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 48,
                        borderRadius: 12,
                      }}
                    >
                      <StyledText
                        style={{
                          color: "white",
                          fontFamily: fontNames.light,
                          fontSize: 16,
                          includeFontPadding: false,
                        }}
                      >
                        {t("apply", "Apply")}
                      </StyledText>
                    </StyledTouchableOpacity>
                  </StyledView>
                </StyledView>
              </StyledBlurView>
            </StyledView>
          </KeyboardAvoidingView>
        </StyledBlurView>
      </StyledModal>

      {/* Time Picker Modals - Rendered outside the main modal to avoid z-index issues */}
      {showResetTimeMinPicker && (
        <TimePickerModal
          visible={showResetTimeMinPicker}
          onClose={() => handleTimePickerClose(setShowResetTimeMinPicker)}
          onConfirm={(seconds) => {
            setResetTimeMin(seconds);
            handleTimePickerClose(setShowResetTimeMinPicker);
          }}
          initialMinutes={resetTimeMin ? Math.floor(resetTimeMin / 60) : 0}
          initialSeconds={resetTimeMin ? resetTimeMin % 60 : 0}
          title={t("selectMinResetTime", "Select Minimum Reset Time")}
        />
      )}

      {showResetTimeMaxPicker && (
        <TimePickerModal
          visible={showResetTimeMaxPicker}
          onClose={() => handleTimePickerClose(setShowResetTimeMaxPicker)}
          onConfirm={(seconds) => {
            setResetTimeMax(seconds);
            handleTimePickerClose(setShowResetTimeMaxPicker);
          }}
          initialMinutes={resetTimeMax ? Math.floor(resetTimeMax / 60) : 0}
          initialSeconds={resetTimeMax ? resetTimeMax % 60 : 0}
          title={t("selectMaxResetTime", "Select Maximum Reset Time")}
        />
      )}

      {showDurationMinPicker && (
        <TimePickerModal
          visible={showDurationMinPicker}
          onClose={() => handleTimePickerClose(setShowDurationMinPicker)}
          onConfirm={(seconds) => {
            setDurationMin(seconds);
            handleTimePickerClose(setShowDurationMinPicker);
          }}
          initialMinutes={durationMin ? Math.floor(durationMin / 60) : 0}
          initialSeconds={durationMin ? durationMin % 60 : 0}
          title={t("selectMinDuration", "Select Minimum Duration")}
        />
      )}

      {showDurationMaxPicker && (
        <TimePickerModal
          visible={showDurationMaxPicker}
          onClose={() => handleTimePickerClose(setShowDurationMaxPicker)}
          onConfirm={(seconds) => {
            setDurationMax(seconds);
            handleTimePickerClose(setShowDurationMaxPicker);
          }}
          initialMinutes={durationMax ? Math.floor(durationMax / 60) : 0}
          initialSeconds={durationMax ? durationMax % 60 : 0}
          title={t("selectMaxDuration", "Select Maximum Duration")}
        />
      )}
    </>
  );
}

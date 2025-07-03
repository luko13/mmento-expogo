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

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledModal = styled(Modal);
const StyledBlurView = styled(BlurView);
const StyledScrollView = styled(ScrollView);

const { height: screenHeight } = Dimensions.get("window");

export interface SearchFilters {
  categories: string[];
  tags: string[];
  difficulties: number[];
  resetTimes: { min?: number; max?: number };
  durations: { min?: number; max?: number };
  angles: string[];
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
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>(
    currentFilters.difficulties
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

  // Time picker states
  const [showResetTimeMinPicker, setShowResetTimeMinPicker] = useState(false);
  const [showResetTimeMaxPicker, setShowResetTimeMaxPicker] = useState(false);
  const [showDurationMinPicker, setShowDurationMinPicker] = useState(false);
  const [showDurationMaxPicker, setShowDurationMaxPicker] = useState(false);

  useEffect(() => {
    fetchUserId();
  }, []);

  // Reset local states when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedCategories(currentFilters.categories);
      setSelectedTags(currentFilters.tags);
      setSelectedDifficulties(currentFilters.difficulties);
      setResetTimeMin(currentFilters.resetTimes.min);
      setResetTimeMax(currentFilters.resetTimes.max);
      setDurationMin(currentFilters.durations.min);
      setDurationMax(currentFilters.durations.max);
      setSelectedAngles(currentFilters.angles);
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

  const toggleDifficulty = (difficulty: number) => {
    setSelectedDifficulties((prev) =>
      prev.includes(difficulty)
        ? prev.filter((d) => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const toggleAngle = (angle: string) => {
    setSelectedAngles((prev) =>
      prev.includes(angle) ? prev.filter((a) => a !== angle) : [...prev, angle]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedTags([]);
    setSelectedDifficulties([]);
    setResetTimeMin(undefined);
    setResetTimeMax(undefined);
    setDurationMin(undefined);
    setDurationMax(undefined);
    setSelectedAngles([]);
  };

  const applyFilters = () => {
    onApplyFilters({
      categories: selectedCategories,
      tags: selectedTags,
      difficulties: selectedDifficulties,
      resetTimes: { min: resetTimeMin, max: resetTimeMax },
      durations: { min: durationMin, max: durationMax },
      angles: selectedAngles,
    });
    onClose();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (selectedTags.length > 0) count += selectedTags.length;
    if (selectedDifficulties.length > 0) count += selectedDifficulties.length;
    if (resetTimeMin !== undefined) count++;
    if (resetTimeMax !== undefined) count++;
    if (durationMin !== undefined) count++;
    if (durationMax !== undefined) count++;
    if (selectedAngles.length > 0) count += selectedAngles.length;
    return count;
  };

  const clearTimeFilter = (type: 'resetMin' | 'resetMax' | 'durationMin' | 'durationMax') => {
    switch(type) {
      case 'resetMin':
        setResetTimeMin(undefined);
        break;
      case 'resetMax':
        setResetTimeMax(undefined);
        break;
      case 'durationMin':
        setDurationMin(undefined);
        break;
      case 'durationMax':
        setDurationMax(undefined);
        break;
    }
  };

  return (
    <>
      <StyledModal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <StyledView className="flex-1">
            {/* Backdrop */}
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={onClose}
            />

            {/* Modal Content */}
            <StyledView
              style={{
                height: screenHeight * 0.75,
                backgroundColor: "rgba(30, 30, 30, 0.95)",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Header */}
              <StyledView className="flex-row items-center justify-between p-4 border-b border-white/10">
                <StyledTouchableOpacity onPress={clearAllFilters}>
                  <StyledText
                    className="text-white/60"
                    style={{
                      fontFamily: fontNames.regular,
                      fontSize: 16,
                    }}
                  >
                    {t("clearAll", "Clear all")}
                  </StyledText>
                </StyledTouchableOpacity>

                <StyledText
                  className="text-white text-lg"
                  style={{
                    fontFamily: fontNames.medium,
                    fontSize: 18,
                  }}
                >
                  {t("filters", "Filters")}
                </StyledText>

                <StyledTouchableOpacity onPress={onClose}>
                  <Feather name="x" size={24} color="white" />
                </StyledTouchableOpacity>
              </StyledView>

              {/* Filters Content */}
              <StyledScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Categories */}
                <StyledView className="mt-6">
                  <StyledText
                    className="text-white mb-3"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 16,
                    }}
                  >
                    {t("categories", "Categories")}
                  </StyledText>
                  <CategorySelector
                    selectedCategories={selectedCategories}
                    onCategoriesChange={setSelectedCategories}
                    allowCreate={false}
                    allowMultiple={true}
                    placeholder={t("selectCategories", "Select categories...")}
                    userId={userId}
                    excludeFavorites={false}
                  />
                </StyledView>

                {/* Tags */}
                <StyledView className="mt-6">
                  <StyledText
                    className="text-white mb-3"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 16,
                    }}
                  >
                    {t("tags", "Tags")}
                  </StyledText>
                  <TagSelector
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                    allowCreate={false}
                    placeholder={t("selectTags", "Select tags...")}
                    userId={userId}
                  />
                </StyledView>

                {/* Difficulty */}
                <StyledView className="mt-6">
                  <StyledText
                    className="text-white mb-3"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 16,
                    }}
                  >
                    {t("difficulty", "Difficulty")}
                  </StyledText>
                  <StyledView className="flex-row flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                      <StyledTouchableOpacity
                        key={level}
                        onPress={() => toggleDifficulty(level)}
                        style={{
                          backgroundColor: selectedDifficulties.includes(level)
                            ? "rgba(16, 185, 129, 0.3)"
                            : "rgba(255, 255, 255, 0.1)",
                          borderWidth: 1,
                          borderColor: selectedDifficulties.includes(level)
                            ? "rgba(16, 185, 129, 0.6)"
                            : "rgba(255, 255, 255, 0.2)",
                          borderRadius: 8,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          marginRight: 8,
                          marginBottom: 8,
                        }}
                      >
                        <StyledText
                          className="text-white"
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 14,
                          }}
                        >
                          {level}
                        </StyledText>
                      </StyledTouchableOpacity>
                    ))}
                  </StyledView>
                </StyledView>

                {/* Reset Time Range */}
                <StyledView className="mt-6">
                  <StyledText
                    className="text-white mb-3"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 16,
                    }}
                  >
                    {t("resetTime", "Reset Time")}
                  </StyledText>
                  <StyledView className="flex-row items-center">
                    <StyledTouchableOpacity
                      onPress={() => setShowResetTimeMinPicker(true)}
                      onLongPress={() => clearTimeFilter('resetMin')}
                      className="flex-1 mr-2"
                      style={{
                        backgroundColor: resetTimeMin !== undefined
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        borderColor: resetTimeMin !== undefined
                          ? "rgba(16, 185, 129, 0.4)"
                          : "rgba(255, 255, 255, 0.2)",
                        borderRadius: 8,
                        paddingVertical: 12,
                        alignItems: "center",
                      }}
                    >
                      <StyledText
                        className="text-white/60 text-xs mb-1"
                        style={{ fontFamily: fontNames.light }}
                      >
                        {t("min", "Min")}
                      </StyledText>
                      <StyledText
                        className="text-white"
                        style={{ fontFamily: fontNames.regular }}
                      >
                        {formatTime(resetTimeMin)}
                      </StyledText>
                    </StyledTouchableOpacity>

                    <StyledText className="text-white/60 mx-2">—</StyledText>

                    <StyledTouchableOpacity
                      onPress={() => setShowResetTimeMaxPicker(true)}
                      onLongPress={() => clearTimeFilter('resetMax')}
                      className="flex-1 ml-2"
                      style={{
                        backgroundColor: resetTimeMax !== undefined
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        borderColor: resetTimeMax !== undefined
                          ? "rgba(16, 185, 129, 0.4)"
                          : "rgba(255, 255, 255, 0.2)",
                        borderRadius: 8,
                        paddingVertical: 12,
                        alignItems: "center",
                      }}
                    >
                      <StyledText
                        className="text-white/60 text-xs mb-1"
                        style={{ fontFamily: fontNames.light }}
                      >
                        {t("max", "Max")}
                      </StyledText>
                      <StyledText
                        className="text-white"
                        style={{ fontFamily: fontNames.regular }}
                      >
                        {formatTime(resetTimeMax)}
                      </StyledText>
                    </StyledTouchableOpacity>
                  </StyledView>
                </StyledView>

                {/* Duration Range */}
                <StyledView className="mt-6">
                  <StyledText
                    className="text-white mb-3"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 16,
                    }}
                  >
                    {t("duration", "Duration")}
                  </StyledText>
                  <StyledView className="flex-row items-center">
                    <StyledTouchableOpacity
                      onPress={() => setShowDurationMinPicker(true)}
                      onLongPress={() => clearTimeFilter('durationMin')}
                      className="flex-1 mr-2"
                      style={{
                        backgroundColor: durationMin !== undefined
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        borderColor: durationMin !== undefined
                          ? "rgba(16, 185, 129, 0.4)"
                          : "rgba(255, 255, 255, 0.2)",
                        borderRadius: 8,
                        paddingVertical: 12,
                        alignItems: "center",
                      }}
                    >
                      <StyledText
                        className="text-white/60 text-xs mb-1"
                        style={{ fontFamily: fontNames.light }}
                      >
                        {t("min", "Min")}
                      </StyledText>
                      <StyledText
                        className="text-white"
                        style={{ fontFamily: fontNames.regular }}
                      >
                        {formatTime(durationMin)}
                      </StyledText>
                    </StyledTouchableOpacity>

                    <StyledText className="text-white/60 mx-2">—</StyledText>

                    <StyledTouchableOpacity
                      onPress={() => setShowDurationMaxPicker(true)}
                      onLongPress={() => clearTimeFilter('durationMax')}
                      className="flex-1 ml-2"
                      style={{
                        backgroundColor: durationMax !== undefined
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        borderColor: durationMax !== undefined
                          ? "rgba(16, 185, 129, 0.4)"
                          : "rgba(255, 255, 255, 0.2)",
                        borderRadius: 8,
                        paddingVertical: 12,
                        alignItems: "center",
                      }}
                    >
                      <StyledText
                        className="text-white/60 text-xs mb-1"
                        style={{ fontFamily: fontNames.light }}
                      >
                        {t("max", "Max")}
                      </StyledText>
                      <StyledText
                        className="text-white"
                        style={{ fontFamily: fontNames.regular }}
                      >
                        {formatTime(durationMax)}
                      </StyledText>
                    </StyledTouchableOpacity>
                  </StyledView>
                </StyledView>

                {/* Angles */}
                <StyledView className="mt-6 mb-6">
                  <StyledText
                    className="text-white mb-3"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 16,
                    }}
                  >
                    {t("angle", "Angle")}
                  </StyledText>
                  <StyledView className="flex-row flex-wrap">
                    {ANGLES.map((angle) => (
                      <StyledTouchableOpacity
                        key={angle}
                        onPress={() => toggleAngle(angle)}
                        style={{
                          backgroundColor: selectedAngles.includes(angle)
                            ? "rgba(16, 185, 129, 0.3)"
                            : "rgba(255, 255, 255, 0.1)",
                          borderWidth: 1,
                          borderColor: selectedAngles.includes(angle)
                            ? "rgba(16, 185, 129, 0.6)"
                            : "rgba(255, 255, 255, 0.2)",
                          borderRadius: 8,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          marginRight: 8,
                          marginBottom: 8,
                        }}
                      >
                        <StyledText
                          className="text-white"
                          style={{
                            fontFamily: fontNames.regular,
                            fontSize: 14,
                          }}
                        >
                          {angle}°
                        </StyledText>
                      </StyledTouchableOpacity>
                    ))}
                  </StyledView>
                </StyledView>
              </StyledScrollView>

              {/* Apply Button */}
              <StyledView className="p-4 border-t border-white/10">
                <StyledTouchableOpacity
                  onPress={applyFilters}
                  className="bg-[#10b981] rounded-lg py-3"
                  style={{
                    backgroundColor:
                      getActiveFiltersCount() > 0
                        ? "rgba(16, 185, 129, 0.8)"
                        : "rgba(16, 185, 129, 0.4)",
                  }}
                >
                  <StyledText
                    className="text-white text-center"
                    style={{
                      fontFamily: fontNames.medium,
                      fontSize: 16,
                    }}
                  >
                    {getActiveFiltersCount() > 0
                      ? `${t("apply", "Apply")} (${getActiveFiltersCount()})`
                      : t("apply", "Apply")}
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            </StyledView>
          </StyledView>
        </KeyboardAvoidingView>
      </StyledModal>

      {/* Time Picker Modals */}
      <TimePickerModal
        visible={showResetTimeMinPicker}
        onClose={() => setShowResetTimeMinPicker(false)}
        onConfirm={(seconds) => {
          setResetTimeMin(seconds);
          setShowResetTimeMinPicker(false);
        }}
        initialMinutes={resetTimeMin ? Math.floor(resetTimeMin / 60) : 0}
        initialSeconds={resetTimeMin ? resetTimeMin % 60 : 0}
        title={t("selectMinResetTime", "Select Minimum Reset Time")}
      />

      <TimePickerModal
        visible={showResetTimeMaxPicker}
        onClose={() => setShowResetTimeMaxPicker(false)}
        onConfirm={(seconds) => {
          setResetTimeMax(seconds);
          setShowResetTimeMaxPicker(false);
        }}
        initialMinutes={resetTimeMax ? Math.floor(resetTimeMax / 60) : 0}
        initialSeconds={resetTimeMax ? resetTimeMax % 60 : 0}
        title={t("selectMaxResetTime", "Select Maximum Reset Time")}
      />

      <TimePickerModal
        visible={showDurationMinPicker}
        onClose={() => setShowDurationMinPicker(false)}
        onConfirm={(seconds) => {
          setDurationMin(seconds);
          setShowDurationMinPicker(false);
        }}
        initialMinutes={durationMin ? Math.floor(durationMin / 60) : 0}
        initialSeconds={durationMin ? durationMin % 60 : 0}
        title={t("selectMinDuration", "Select Minimum Duration")}
      />

      <TimePickerModal
        visible={showDurationMaxPicker}
        onClose={() => setShowDurationMaxPicker(false)}
        onConfirm={(seconds) => {
          setDurationMax(seconds);
          setShowDurationMaxPicker(false);
        }}
        initialMinutes={durationMax ? Math.floor(durationMax / 60) : 0}
        initialSeconds={durationMax ? durationMax % 60 : 0}
        title={t("selectMaxDuration", "Select Maximum Duration")}
      />
    </>
  );
}
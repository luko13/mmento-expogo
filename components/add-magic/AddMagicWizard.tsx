"use client";

import { useState } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../lib/supabase";
import { uploadFileToStorage } from "../../utils/mediaUtils";
import type { EncryptedMagicTrick } from "../../types/encryptedMagicTrick";
import TitleCategoryStep from "./steps/TitleCategoryStep";
import EffectStep from "./steps/EffectStep";
import ExtrasStep from "./steps/ExtrasStep";
import SuccessCreationModal from "../ui/SuccessCreationModal";

interface AddMagicWizardProps {
  onComplete?: (trickId: string) => void;
  onCancel?: () => void;
  onViewItem?: (trickId: string) => void;
}

export default function AddMagicWizard({
  onComplete,
  onCancel,
  onViewItem,
}: AddMagicWizardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [trickData, setTrickData] = useState<EncryptedMagicTrick>({
    title: "",
    categories: [],
    tags: [],
    selectedCategoryId: null,
    effect: "",
    effect_video_url: null,
    angles: [],
    duration: null,
    reset: null,
    difficulty: 5,
    secret: "",
    secret_video_url: null,
    special_materials: [],
    notes: "",
    script: "",
    photo_url: null,
    techniqueIds: [],
    gimmickIds: [],
    is_public: false,
    status: "draft",
    price: null,
    isEncryptionEnabled: false,
    encryptedFields: {},
    encryptedFiles: {},
    localFiles: { effectVideo: null, secretVideo: null, photos: [] },
  });

  const updateTrickData = (data: Partial<EncryptedMagicTrick>) => {
    setTrickData((prev) => ({ ...prev, ...data }));
  };

  const steps = [
    { title: t("titleAndCategories", "Title & Categories"), component: TitleCategoryStep },
    { title: t("effect", "Effect"), component: EffectStep },
    { title: t("extras", "Extras"), component: ExtrasStep },
  ];

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error("User not found");

      const uploads: { [key: string]: string | null } = {};
      if (trickData.localFiles?.effectVideo) {
        uploads.effect_video_url = await uploadFileToStorage(
          trickData.localFiles.effectVideo,
          user.id,
          "videos",
          "video/mp4",
          `effect_${Date.now()}.mp4`
        );
      }
      if (trickData.localFiles?.secretVideo) {
        uploads.secret_video_url = await uploadFileToStorage(
          trickData.localFiles.secretVideo,
          user.id,
          "videos",
          "video/mp4",
          `secret_${Date.now()}.mp4`
        );
      }
      if (trickData.localFiles?.photos?.length) {
        const photoUrl = await uploadFileToStorage(
          trickData.localFiles.photos[0],
          user.id,
          "images",
          "image/jpeg",
          `photo_${Date.now()}.jpg`
        );
        uploads.photo_url = photoUrl;
      }

      const trickId = uuidv4();
      const { error } = await supabase.from("magic_tricks").insert({
        id: trickId,
        user_id: user.id,
        title: trickData.title,
        effect: trickData.effect,
        secret: trickData.secret,
        duration: trickData.duration,
        angles: trickData.angles,
        notes: trickData.notes,
        special_materials: trickData.special_materials,
        is_public: trickData.is_public,
        status: trickData.status,
        price: trickData.price,
        photo_url: uploads.photo_url,
        effect_video_url: uploads.effect_video_url,
        secret_video_url: uploads.secret_video_url,
        views_count: 0,
        likes_count: 0,
        dislikes_count: 0,
        version: 1,
        parent_trick_id: null,
        reset: trickData.reset,
        difficulty: trickData.difficulty,
        is_encrypted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setCreatedItemId(trickId);
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      Alert.alert(t("error", "Error"), err instanceof Error ? err.message : "");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepComponent = (steps[currentStep].component as any);
  return (
    <>
      <StepComponent
        trickData={trickData}
        updateTrickData={updateTrickData}
        onNext={() => {
          if (currentStep === steps.length - 1) {
            handleSubmit();
          } else {
            setCurrentStep(currentStep + 1);
          }
        }}
        onCancel={() => {
          if (currentStep === 0) {
            onCancel?.();
          } else {
            setCurrentStep(currentStep - 1);
          }
        }}
        currentStep={currentStep + 1}
        totalSteps={steps.length}
        isSubmitting={isSubmitting}
        isLastStep={currentStep === steps.length - 1}
      />
      <SuccessCreationModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (onComplete && createdItemId) onComplete(createdItemId);
        }}
        onViewItem={() => {
          setShowSuccessModal(false);
          if (onViewItem && createdItemId) onViewItem(createdItemId);
        }}
        onAddAnother={() => {
          setShowSuccessModal(false);
          setTrickData({
            ...trickData,
            title: "",
            effect: "",
            secret: "",
            localFiles: { effectVideo: null, secretVideo: null, photos: [] },
          });
          setCurrentStep(0);
        }}
        itemName={trickData.title || t("common.trick", "Trick")}
        itemType="trick"
      />
    </>
  );
}

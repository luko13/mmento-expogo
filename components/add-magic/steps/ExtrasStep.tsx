"use client";

import { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import {
  Entypo,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import type { EncryptedMagicTrick } from "../../../types/encryptedMagicTrick"
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import * as FileSystem from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";

// Importar modales
import TechniquesModal from "../../../components/add-magic/ui/TechniquesModal";
import GimmicksModal from "../../../components/add-magic/ui/GimmicksModal";
import ScriptModal from "../../../components/add-magic/ui/ScriptModal";
import DifficultySlider from "../../../components/add-magic/ui/DifficultySlider";

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

// Definir interfaces para técnica y gimmick
interface Technique {
  id: string;
  name: string;
  description?: string;
}

interface Gimmick {
  id: string;
  name: string;
  description?: string;
}

interface ScriptData {
  id?: string;
  title: string;
  content: string;
}

interface StepProps {
  trickData: EncryptedMagicTrick;
  updateTrickData: (data: Partial<EncryptedMagicTrick>) => void;
  onNext?: () => void;
  onCancel?: () => void;
  currentStep?: number;
  totalSteps?: number;
  isSubmitting?: boolean;
  isNextButtonDisabled?: boolean;
  isLastStep?: boolean;
}

export default function ExtrasStep({
  trickData,
  updateTrickData,
  onNext,
  onCancel,
  currentStep = 2,
  totalSteps = 2,
  isSubmitting = false,
  isNextButtonDisabled = false,
  isLastStep = true,
}: StepProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Estados para modales
  const [techniquesModalVisible, setTechniquesModalVisible] = useState(false);
  const [gimmicksModalVisible, setGimmicksModalVisible] = useState(false);
  const [scriptModalVisible, setScriptModalVisible] = useState(false);

  // Estados para los selectores de tiempo
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showResetPicker, setShowResetPicker] = useState(false);
  const [durationDate, setDurationDate] = useState(new Date());
  const [resetDate, setResetDate] = useState(new Date());

  // Estados para datos
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [gimmicks, setGimmicks] = useState<Gimmick[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<Technique[]>([]);
  const [selectedGimmicks, setSelectedGimmicks] = useState<Gimmick[]>([]);
  const [scriptData, setScriptData] = useState<ScriptData>({
    title: "",
    content: "",
  });

  // Opciones de selección de ángulos
  const angles = [
    { value: "90", label: "90°" },
    { value: "120", label: "120°" },
    { value: "180", label: "180°" },
    { value: "360", label: "360°" },
  ];

  // Seleccionar ángulo (estilo botón de radio)
  const selectAngle = (angle: string): void => {
    const updatedAngles = trickData.angles.includes(angle)
      ? trickData.angles.filter((a) => a !== angle)
      : [...trickData.angles, angle];

    updateTrickData({ angles: updatedAngles });
  };

  // Mostrar selector de tiempo de duración
  const openDurationPicker  = () => {
    // Crear una fecha con los minutos y segundos actuales
    const currentDate = new Date();
    if (trickData.duration) {
      const minutes = Math.floor(trickData.duration / 60);
      const seconds = trickData.duration % 60;
      currentDate.setHours(0, minutes, seconds, 0);
    } else {
      currentDate.setHours(0, 0, 0, 0);
    }

    setDurationDate(currentDate);
    setShowDurationPicker(true);
  };
  // Mostrar selector de tiempo de reinicio
  const openResetTimePicker  = () => {
    // Crear una fecha con los minutos y segundos actuales
    const currentDate = new Date();
    if (trickData.reset) {
      const minutes = Math.floor(trickData.reset / 60);
      const seconds = trickData.reset % 60;
      currentDate.setHours(0, minutes, seconds, 0);
    } else {
      currentDate.setHours(0, 0, 0, 0);
    }

    setResetDate(currentDate);
    setShowResetPicker(true);
  };

  // Manejar cambio de duración
  const handleDurationChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDurationPicker(Platform.OS === "ios");

    if (selectedDate) {
      const minutes = selectedDate.getMinutes();
      const seconds = selectedDate.getSeconds();
      const totalSeconds = minutes * 60 + seconds;
      updateTrickData({ duration: totalSeconds });
    }
  };

  // Manejar cambio de tiempo de reinicio
  const handleResetChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowResetPicker(Platform.OS === "ios");

    if (selectedDate) {
      const minutes = selectedDate.getMinutes();
      const seconds = selectedDate.getSeconds();
      const totalSeconds = minutes * 60 + seconds;
      updateTrickData({ reset: totalSeconds });
    }
  };

  // Manejar cambio de dificultad
  const handleDifficultyChange = (value: number) => {
    updateTrickData({ difficulty: value });
  };

  // Obtener técnicas y gimmicks de la base de datos
  useEffect(() => {
    fetchTechniques();
    fetchGimmicks();

    // Inicializar elementos seleccionados si los datos del truco los tienen
    if (trickData.techniqueIds && trickData.techniqueIds.length > 0) {
      fetchSelectedTechniques(trickData.techniqueIds);
    }

    if (trickData.gimmickIds && trickData.gimmickIds.length > 0) {
      fetchSelectedGimmicks(trickData.gimmickIds);
    }

    // Inicializar datos del script si están disponibles
    if (trickData.scriptId) {
      fetchScriptData(trickData.scriptId);
    }
  }, []);

  const fetchTechniques = async () => {
    try {
      const { data, error } = await supabase
        .from("techniques")
        .select("id, name, description")
        .eq("is_public", true);

      if (error) throw error;
      setTechniques(data || []);
    } catch (error) {
      console.error("Error al obtener técnicas:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorFetchingTechniques", "Error al obtener técnicas")
      );
    }
  };

  const fetchGimmicks = async () => {
    try {
      const { data, error } = await supabase
        .from("gimmicks")
        .select("id, name, description")
        .eq("is_public", true);

      if (error) throw error;
      setGimmicks(data || []);
    } catch (error) {
      console.error("Error al obtener gimmicks:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorFetchingGimmicks", "Error al obtener gimmicks")
      );
    }
  };

  const fetchSelectedTechniques = async (techniqueIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("techniques")
        .select("id, name, description")
        .in("id", techniqueIds);

      if (error) throw error;
      setSelectedTechniques(data || []);
    } catch (error) {
      console.error("Error al obtener técnicas seleccionadas:", error);
    }
  };

  const fetchSelectedGimmicks = async (gimmickIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("gimmicks")
        .select("id, name, description")
        .in("id", gimmickIds);

      if (error) throw error;
      setSelectedGimmicks(data || []);
    } catch (error) {
      console.error("Error al obtener gimmicks seleccionados:", error);
    }
  };

  const fetchScriptData = async (scriptId: string) => {
    try {
      const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content")
        .eq("id", scriptId)
        .single();

      if (error) throw error;
      if (data) {
        setScriptData(data);
      }
    } catch (error) {
      console.error("Error al obtener datos del script:", error);
    }
  };

  // Alternar selección de técnicas (se moverá al componente TechniquesModal)
  const toggleTechniqueSelection = (technique: Technique) => {
    const isSelected = selectedTechniques.some((t) => t.id === technique.id);

    if (isSelected) {
      setSelectedTechniques(
        selectedTechniques.filter((t) => t.id !== technique.id)
      );
    } else {
      setSelectedTechniques([...selectedTechniques, technique]);
    }
  };

  // Alternar selección de gimmicks (se moverá al componente GimmicksModal)
  const toggleGimmickSelection = (gimmick: Gimmick) => {
    const isSelected = selectedGimmicks.some((g) => g.id === gimmick.id);

    if (isSelected) {
      setSelectedGimmicks(selectedGimmicks.filter((g) => g.id !== gimmick.id));
    } else {
      setSelectedGimmicks([...selectedGimmicks, gimmick]);
    }
  };

  // Guardar técnicas en el truco (se moverá al componente TechniquesModal)
  const saveTechniques = () => {
    const techniqueIds = selectedTechniques.map((t) => t.id);
    updateTrickData({ techniqueIds });
    setTechniquesModalVisible(false);
  };

  // Guardar gimmicks en el truco (se moverá al componente GimmicksModal)
  const saveGimmicks = () => {
    const gimmickIds = selectedGimmicks.map((g) => g.id);
    updateTrickData({ gimmickIds });
    setGimmicksModalVisible(false);
  };

  // Guardar script para el truco (se moverá al componente ScriptModal)
  const saveScript = async () => {
    try {
      if (!scriptData.title || !scriptData.content) {
        Alert.alert(
          t("missingFields", "Campos faltantes"),
          t(
            "pleaseCompleteTitleAndContent",
            "Por favor completa tanto el título como el contenido"
          )
        );
        return;
      }

      let scriptId = scriptData.id;

      if (scriptId) {
        // Actualizar script existente
        const { error } = await supabase
          .from("scripts")
          .update({
            title: scriptData.title,
            content: scriptData.content,
            updated_at: new Date(),
          })
          .eq("id", scriptId);

        if (error) throw error;
      } else {
        // Crear nuevo script
        const { data, error } = await supabase
          .from("scripts")
          .insert({
            title: scriptData.title,
            content: scriptData.content,
            trick_id: trickData.id,
            user_id: trickData.user_id,
            language: "es", // Idioma predeterminado
          })
          .select("id")
          .single();

        if (error) throw error;
        if (data) {
          scriptId = data.id;
        }
      }

      // Actualizar datos del truco con ID del script
      updateTrickData({ scriptId });
      setScriptModalVisible(false);
    } catch (error) {
      console.error("Error al guardar script:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorSavingScript", "Error al guardar el script")
      );
    }
  };

  // Seleccionar imagen para el truco
  const pickImage = async () => {
    try {
      // Solicitar permisos primero
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("permissionRequired", "Permiso Requerido"),
          t(
            "mediaLibraryPermission",
            "Necesitamos acceso a tu galería de medios para subir fotos."
          ),
          [{ text: t("ok", "OK") }]
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3] as [number, number],
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;

        // Verificar tamaño del archivo
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);

          // Verificar si el archivo existe y tiene tamaño
          if (fileInfo.exists && "size" in fileInfo) {
            // Si el archivo es más grande que 10MB, mostrar advertencia
            if (fileInfo.size > 10 * 1024 * 1024) {
              Alert.alert(
                t("fileTooLarge", "Archivo Demasiado Grande"),
                t(
                  "imageSizeWarning",
                  "La imagen seleccionada es demasiado grande. Por favor selecciona una imagen más pequeña."
                ),
                [{ text: t("ok", "OK") }]
              );
              return;
            }
          }
        } catch (error) {
          console.error("Error al verificar tamaño del archivo:", error);
        }

        await uploadImage(uri);
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      Alert.alert(
        t("error", "Error"),
        t(
          "imagePickError",
          "Hubo un error al seleccionar la imagen. Por favor intenta de nuevo."
        ),
        [{ text: t("ok", "OK") }]
      );
    }
  };

  // Subir imagen a Supabase Storage
  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      // Obtener nombre de archivo
      const fileName = uri.split("/").pop() || "";
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `trick_photos/${Date.now()}.${fileExt}`;

      // En iOS, usar FileSystem para leer el archivo en lugar de fetch/blob
      if (Platform.OS === "ios") {
        try {
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const { data, error } = await supabase.storage
            .from("magic_trick_media")
            .upload(filePath, fileContent, {
              contentType: `image/${fileExt}`,
              upsert: true,
            });

          if (error) {
            console.error("Error al subir imagen:", error);
            Alert.alert(t("uploadError", "Error de Subida"), error.message);
            return;
          }

          // Obtener URL pública
          const { data: publicURL } = supabase.storage
            .from("magic_trick_media")
            .getPublicUrl(filePath);

          // Actualizar datos del truco
          updateTrickData({ photo_url: publicURL.publicUrl });
        } catch (error) {
          console.error("Error al leer archivo:", error);
          Alert.alert(
            t("fileReadError", "Error de Lectura de Archivo"),
            t(
              "couldNotReadFile",
              "No se pudo leer el archivo de imagen. Por favor intenta con una imagen diferente."
            )
          );
        }
      } else {
        // Para Android, continuar usando el método anterior
        const response = await fetch(uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from("magic_trick_media")
          .upload(filePath, blob);

        if (error) {
          console.error("Error al subir imagen:", error);
          Alert.alert(t("uploadError", "Error de Subida"), error.message);
          return;
        }

        // Obtener URL pública
        const { data: publicURL } = supabase.storage
          .from("magic_trick_media")
          .getPublicUrl(filePath);

        // Actualizar datos del truco
        updateTrickData({ photo_url: publicURL.publicUrl });
      }
    } catch (error) {
      console.error("Error en el proceso de subida:", error);
      Alert.alert(
        t("uploadError", "Error de Subida"),
        t(
          "generalUploadError",
          "Hubo un error al subir la imagen. Por favor intenta de nuevo."
        )
      );
    } finally {
      setUploading(false);
    }
  };

  // Manejar datos de componentes modales
  const handleSaveTechniques = (techniqueIds: string[]) => {
    updateTrickData({ techniqueIds });
  };

  const handleSaveGimmicks = (gimmickIds: string[]) => {
    updateTrickData({ gimmickIds });
  };

  const handleSaveScript = (newScriptId: string) => {
    updateTrickData({ scriptId: newScriptId });
  };

  // Formatear tiempo de duración para mostrar
  const formatDuration = (durationInSeconds: number | null) => {
    if (!durationInSeconds)
      return t("setDurationTime", "Establecer tiempo de duración");

    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")} ${t(
      "minutes",
      "minutos"
    )}`;
  };

  // Formatear tiempo de reinicio para mostrar
  const formatReset = (resetInSeconds: number | null) => {
    if (!resetInSeconds)
      return t("setResetTime", "Establecer tiempo de reinicio");

    const minutes = Math.floor(resetInSeconds / 60);
    const seconds = resetInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")} ${t(
      "minutes",
      "minutos"
    )}`;
  };

  return (
    <StyledView className="flex-1">
      {/* Gradiente de fondo */}
      <LinearGradient
        colors={["#15322C", "#15322C"]}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />

      {/* Encabezado */}
      <StyledView className="flex-row items-center px-6 pt-4">
        <StyledTouchableOpacity onPress={onCancel} className="p-2">
          <Feather name="chevron-left" size={24} color="white" />
        </StyledTouchableOpacity>

        <StyledView className="flex-1 items-center">
          <StyledText className="text-white text-lg font-semibold">
            {trickData.title || t("trickTitle", "[Título Magia]")}
          </StyledText>
          <StyledText className="text-emerald-200 text-sm opacity-70">
            {t("statistics", "Estadísticas")}
          </StyledText>
        </StyledView>

        <StyledTouchableOpacity className="p-2">
          <Feather name="info" size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      <StyledScrollView className="flex-1 px-6">
        {/* Sección de Estadísticas */}
        <StyledView className="mt-6">
          <StyledText className="text-white/60 text-lg font-semibold mb-4">
            {t("statistics", "Estadísticas")}
          </StyledText>

          {/* Selección de Ángulos */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="tag" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between">
                {angles.map((angle) => (
                  <StyledTouchableOpacity
                    key={angle.value}
                    onPress={() => selectAngle(angle.value)}
                    className="flex-row items-center"
                  >
                    <StyledView
                      className={`w-5 h-5 rounded-full border ${
                        trickData.angles.includes(angle.value)
                          ? "border-white bg-white"
                          : "border-white/50"
                      } mr-2`}
                    >
                      {trickData.angles.includes(angle.value) && (
                        <StyledView className="w-3 h-3 rounded-full bg-emerald-800 m-auto" />
                      )}
                    </StyledView>
                    <StyledText className="text-white">
                      {angle.label}
                    </StyledText>
                  </StyledTouchableOpacity>
                ))}
              </StyledView>
            </StyledView>
          </StyledView>

          {/* Tiempo de Duración */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="clock" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={openDurationPicker}
              >
                <StyledText className="text-white/70">
                  {formatDuration(trickData.duration)}
                </StyledText>
                <Feather name="plus" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Tiempo de Reinicio */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="refresh-cw" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={openResetTimePicker}
              >
                <StyledText className="text-white/70">
                  {formatReset(trickData.reset)}
                </StyledText>
                <Feather name="plus" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Deslizador de dificultad */}
          <StyledView className="flex-row mb-3">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <MaterialIcons
                name="signal-cellular-alt"
                size={24}
                color="white"
              />
            </StyledView>

            <StyledView className="flex-1">
              <StyledView className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg pb-3 border border-[#5bb9a3]">
                {/* Componente DifficultySlider */}
                <DifficultySlider
                  value={trickData.difficulty || 5}
                  onChange={handleDifficultyChange}
                  min={1}
                  max={10}
                  step={1}
                />
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Sección de Extras */}
        <StyledView className="mb-2">
          <StyledText className="text-white/60 text-lg font-semibold mb-2">
            {t("extras", "Extras")}
          </StyledText>

          {/* Subida de Imagen */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="image" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                onPress={pickImage}
                disabled={uploading}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledText className="text-white/70">
                  {uploading
                    ? t("uploading", "Subiendo...")
                    : trickData.photo_url
                    ? t("imageUploaded", "Imagen subida")
                    : t("imagesUpload", "Subir Imágenes")}
                </StyledText>
                <Feather name="upload" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Selección de Técnicas */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="award" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setTechniquesModalVisible(true)}
              >
                <StyledText className="text-white/70">
                  {selectedTechniques.length > 0
                    ? `${selectedTechniques.length} ${t(
                        "techniquesSelected",
                        "técnicas seleccionadas"
                      )}`
                    : t("technique", "Técnica")}
                </StyledText>
                <Feather name="link" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Selección de Gimmicks */}
          <StyledView className="flex-row mb-6">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="box" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setGimmicksModalVisible(true)}
              >
                <StyledText className="text-white/70">
                  {selectedGimmicks.length > 0
                    ? `${selectedGimmicks.length} ${t(
                        "gimmicksSelected",
                        "gimmicks seleccionados"
                      )}`
                    : t("gimmicks", "Gimmicks")}
                </StyledText>
                <Feather name="link" size={20} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Escritura de Script */}
          <StyledView className="flex-row mb-2">
            <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
              <Feather name="edit" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setScriptModalVisible(true)}
              >
                <StyledText className="text-white/70">
                  {scriptData.title
                    ? scriptData.title
                    : t("writeScript", "Escribir Script")}
                </StyledText>
                <MaterialCommunityIcons
                  name="typewriter"
                  size={20}
                  color="white"
                />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Indicador de paso */}
        <StyledText className="text-center text-white/60 mb-4">
          {`${currentStep} de ${totalSteps}`}
        </StyledText>

        {/* Botón de Registro de Magia */}
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row mb-6 ${
            isSubmitting ? "bg-white/10" : "bg-emerald-700"
          }`}
          disabled={isSubmitting}
          onPress={onNext}
        >
          <StyledText className="text-white font-semibold text-base">
            {isSubmitting
              ? t("saving", "Guardando...")
              : t("registerMagic", "Registrar Magia")}
          </StyledText>
          {isSubmitting && (
            <Ionicons
              name="refresh"
              size={20}
              color="white"
              style={{ marginLeft: 8 }}
            />
          )}
        </StyledTouchableOpacity>
      </StyledScrollView>

      {/* Modales - Estos se moverán a componentes separados */}
      {/* Por ahora, renderizando condicionalmente con marcadores de posición para futuros componentes */}
      {techniquesModalVisible && (
        <TechniquesModal
          visible={techniquesModalVisible}
          onClose={() => setTechniquesModalVisible(false)}
          techniques={techniques}
          selectedTechniques={selectedTechniques}
          onSave={handleSaveTechniques}
          onToggleSelection={toggleTechniqueSelection}
        />
      )}

      {gimmicksModalVisible && (
        <GimmicksModal
          visible={gimmicksModalVisible}
          onClose={() => setGimmicksModalVisible(false)}
          gimmicks={gimmicks}
          selectedGimmicks={selectedGimmicks}
          onSave={handleSaveGimmicks}
          onToggleSelection={toggleGimmickSelection}
        />
      )}

      {scriptModalVisible && (
        <ScriptModal
          visible={scriptModalVisible}
          onClose={() => setScriptModalVisible(false)}
          scriptData={scriptData}
          onSave={handleSaveScript}
          trickId={trickData.id}
          userId={trickData.user_id}
        />
      )}
      {/* DateTimePicker nativo para duración */}
      {showDurationPicker && (
        <DateTimePicker
          value={durationDate}
          mode="time"
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDurationChange}
          minuteInterval={1}
        />
      )}

      {/* DateTimePicker nativo para reinicio */}
      {showResetPicker && (
        <DateTimePicker
          value={resetDate}
          mode="time"
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleResetChange}
          minuteInterval={1}
        />
      )}
    </StyledView>
  );
}

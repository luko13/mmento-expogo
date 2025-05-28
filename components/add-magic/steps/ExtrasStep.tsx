"use client";

import { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
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
import type { EncryptedMagicTrick } from "../../../types/encryptedMagicTrick";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import * as FileSystem from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import { useEncryption } from "../../../hooks/useEncryption";
import { FileEncryptionService } from "../../../utils/fileEncryption";
import CustomTooltip from "../../ui/Tooltip";

// Importar modales
import TechniquesModal from "../../../components/add-magic/ui/TechniquesModal";
import GimmicksModal from "../../../components/add-magic/ui/GimmicksModal";
import ScriptModal from "../../../components/add-magic/ui/ScriptModal";
import DifficultySlider from "../../../components/add-magic/ui/DifficultySlider";
import TimePickerModal from "../ui/TimePickerModal";

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

export default function ExtrasStepEncrypted({
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
  const [uploadingType, setUploadingType] = useState<"photo" | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // Hooks de cifrado
  const {
    isReady: encryptionReady,
    keyPair,
    encryptForSelf,
    getPublicKey,
    error: encryptionError,
  } = useEncryption();

  const fileEncryptionService = new FileEncryptionService();

  // Estados para modales
  const [techniquesModalVisible, setTechniquesModalVisible] = useState(false);
  const [gimmicksModalVisible, setGimmicksModalVisible] = useState(false);
  const [scriptModalVisible, setScriptModalVisible] = useState(false);

  // Estados para los selectores de tiempo
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showResetPicker, setShowResetPicker] = useState(false);

  // Estados para datos
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [gimmicks, setGimmicks] = useState<Gimmick[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<Technique[]>([]);
  const [selectedGimmicks, setSelectedGimmicks] = useState<Gimmick[]>([]);
  const [scriptData, setScriptData] = useState<ScriptData>({
    title: "",
    content: "",
  });

  // Verificar que el cifrado esté listo
  useEffect(() => {
    if (!encryptionReady && !encryptionError) {
    } else if (encryptionError) {
      console.error("Error en el cifrado:", encryptionError);
      Alert.alert(
        t("security.error", "Error de Seguridad"),
        t("security.encryptionNotReady", "El sistema de cifrado no está listo")
      );
    }
  }, [encryptionReady, encryptionError, t]);

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
  const openDurationPicker = () => {
    setShowDurationPicker(true);
  };

  // Mostrar selector de tiempo de reinicio
  const openResetTimePicker = () => {
    setShowResetPicker(true);
  };

  // Manejar cambio de duración
  const handleDurationChange = (totalSeconds: number) => {
    updateTrickData({ duration: totalSeconds });
    setShowDurationPicker(false);
  };

  // Manejar cambio de tiempo de reinicio
  const handleResetChange = (totalSeconds: number) => {
    updateTrickData({ reset: totalSeconds });
    setShowDurationPicker(false);
  };

  // Manejar cambio de dificultad
  const handleDifficultyChange = (value: number) => {
    updateTrickData({ difficulty: value });
  };

  // Obtener técnicas y gimmicks de la base de datos
  useEffect(() => {
    fetchTechniques();
    fetchGimmicks();
    // Inicializar fotos cargadas
    if (trickData.encryptedFiles?.photos) {
      setUploadedPhotos(trickData.encryptedFiles.photos);
    }
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

  // Alternar selección de técnicas
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

  // Alternar selección de gimmicks
  const toggleGimmickSelection = (gimmick: Gimmick) => {
    const isSelected = selectedGimmicks.some((g) => g.id === gimmick.id);

    if (isSelected) {
      setSelectedGimmicks(selectedGimmicks.filter((g) => g.id !== gimmick.id));
    } else {
      setSelectedGimmicks([...selectedGimmicks, gimmick]);
    }
  };

  // Guardar técnicas en el truco
  const saveTechniques = () => {
    const techniqueIds = selectedTechniques.map((t) => t.id);
    updateTrickData({ techniqueIds });
    setTechniquesModalVisible(false);
  };

  // Guardar gimmicks en el truco
  const saveGimmicks = () => {
    const gimmickIds = selectedGimmicks.map((g) => g.id);
    updateTrickData({ gimmickIds });
    setGimmicksModalVisible(false);
  };

  // Guardar script para el truco
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

      // Actualizar el script en el estado del truco
      updateTrickData({ script: scriptData.content });
      setScriptModalVisible(false);
    } catch (error) {
      console.error("Error al guardar script:", error);
      Alert.alert(
        t("error", "Error"),
        t("errorSavingScript", "Error al guardar el script")
      );
    }
  };

  // Seleccionar imagen para el truco con cifrado
  const pickImage = async () => {
    try {
      if (!encryptionReady || !keyPair) {
        Alert.alert(
          t("security.error", "Error de Seguridad"),
          t(
            "security.encryptionNotReady",
            "El sistema de cifrado no está listo"
          )
        );
        return;
      }

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
        mediaTypes: ["images"],
        allowsEditing: false, // False para no recortar
        allowsMultipleSelection: true, // Permitir selección múltiple
        quality: 0.7,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Procesar múltiples imágenes
        for (const asset of result.assets) {
          const uri = asset.uri;

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
                    "Una o más imágenes son demasiado grandes. El límite es 10MB por imagen."
                  ),
                  [{ text: t("ok", "OK") }]
                );
                continue; // Saltar esta imagen y continuar con las demás
              }
            }
          } catch (error) {
            console.error("Error al verificar tamaño del archivo:", error);
          }

          await encryptAndStoreImage(uri);
        }
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      Alert.alert(
        t("error", "Error"),
        t(
          "imagePickError",
          "Hubo un error al seleccionar las imágenes. Por favor intenta de nuevo."
        ),
        [{ text: t("ok", "OK") }]
      );
    }
  };

  // Cifrar y almacenar imagen
  const encryptAndStoreImage = async (uri: string) => {
    if (!keyPair) return;

    try {
      setUploading(true);
      setUploadingType("photo");

      // Obtener información del usuario
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      // Cifrar y subir imagen
      const metadata = await fileEncryptionService.encryptAndUploadFile(
        uri,
        `trick_photo_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}.jpg`,
        "image/jpeg",
        user.id,
        [user.id], // Solo el autor tiene acceso
        getPublicKey,
        () => keyPair.privateKey
      );

      // Actualizar el array de fotos cifradas
      const currentPhotos = trickData.encryptedFiles?.photos || [];
      const updatedPhotos = [...currentPhotos, metadata.fileId];
      setUploadedPhotos(updatedPhotos);

      // Actualizar los datos del truco con el array de fotos
      updateTrickData({
        encryptedFiles: {
          ...trickData.encryptedFiles,
          photos: updatedPhotos,
        },
      });

      // Si es la primera foto, también establecerla como photo_url principal
      if (updatedPhotos.length === 1) {
        updateTrickData({
          photo_url: metadata.fileId,
        });
      }
    } catch (error) {
      console.error("Error cifrando imagen:", error);
      Alert.alert(
        t("security.error", "Error de Cifrado"),
        t(
          "security.imageEncryptionError",
          "No se pudo cifrar la imagen. Inténtalo de nuevo."
        ),
        [{ text: t("ok", "OK") }]
      );
    } finally {
      setUploading(false);
      setUploadingType(null);
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

    if (minutes === 0) {
      return `${seconds} s`;
    } else if (seconds === 0) {
      return `${minutes} min`;
    } else {
      return `${minutes} min ${seconds} s`;
    }
  };

  // Formatear tiempo de reinicio para mostrar
  const formatReset = (resetInSeconds: number | null) => {
    if (!resetInSeconds)
      return t("setResetTime", "Establecer tiempo de reinicio");

    const minutes = Math.floor(resetInSeconds / 60);
    const seconds = resetInSeconds % 60;

    if (minutes === 0) {
      return `${seconds} s`;
    } else if (seconds === 0) {
      return `${minutes} min`;
    } else {
      return `${minutes} min ${seconds} s`;
    }
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
          <MaterialIcons name="security" size={24} color="#10b981" />
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
            <CustomTooltip
              text={t("tooltips.angle")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="tag" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
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
            <CustomTooltip
              text={t("tooltips.duration")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="clock" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
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
            <CustomTooltip
              text={t("tooltips.reset")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="refresh-cw" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
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
            <CustomTooltip
              text={t("tooltips.difficulty")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <MaterialIcons
                  name="signal-cellular-alt"
                  size={24}
                  color="white"
                />
              </StyledView>
            </CustomTooltip>
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

          {/* Subida de Imagen con Cifrado */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.imageUpload")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="image" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledTouchableOpacity
                onPress={pickImage}
                disabled={uploading || !encryptionReady}
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
              >
                <StyledView className="flex-1 flex-row items-center">
                  {uploading && uploadingType === "photo" ? (
                    <>
                      <ActivityIndicator size="small" color="#10b981" />
                      <StyledText className="text-white/70 ml-2">
                        {t("security.encryptingImage", "Cifrando imagen...")}
                      </StyledText>
                    </>
                  ) : (
                    <>
                      <StyledText className="text-white/70 flex-1">
                        {uploadedPhotos.length > 0
                          ? t(
                              "security.photosEncrypted",
                              `${uploadedPhotos.length} fotos cifradas ✓`
                            )
                          : t("imagesUpload", "Subir Imágenes")}
                      </StyledText>
                      <StyledView className="flex-row items-center">
                        <Feather
                          name="upload"
                          size={16}
                          color="white"
                          style={{ marginLeft: 4 }}
                        />
                      </StyledView>
                    </>
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Selección de Técnicas */}
          <StyledView className="flex-row mb-6">
            <CustomTooltip
              text={t("tooltips.techniques")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="award" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
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
            <CustomTooltip
              text={t("tooltips.gimmicks")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="box" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
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

          {/* Escritura de Script con Cifrado */}
          <StyledView className="flex-row mb-2">
            <CustomTooltip
              text={t("tooltips.script")}
              backgroundColor="rgba(91, 185, 163, 0.95)"
              textColor="white"
            >
              <StyledView className="w-12 h-12 bg-[#5bb9a3]/30 border border-[#5bb9a3] rounded-lg items-center justify-center mr-3">
                <Feather name="edit" size={24} color="white" />
              </StyledView>
            </CustomTooltip>
            <StyledView className="flex-1">
              <StyledTouchableOpacity
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] flex-row items-center justify-between"
                onPress={() => setScriptModalVisible(true)}
              >
                <StyledView className="flex-row items-center flex-1">
                  <StyledText className="text-white/70 flex-1">
                    {scriptData.title
                      ? scriptData.title
                      : t("writeScript", "Escribir Script")}
                  </StyledText>
                  <MaterialCommunityIcons
                    name="typewriter"
                    size={20}
                    color="white"
                  />
                </StyledView>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {/* Notes Field with Encryption */}
          {/* <StyledView className="flex-row mt-6 mb-4">
            <StyledView className="w-12 h-19 bg-[#5bb9a3]/30 border border-[#eafffb]/40 rounded-lg items-center justify-center mr-3">
              <Feather name="file-text" size={24} color="white" />
            </StyledView>

            <StyledView className="flex-1">
              <StyledView className="flex-row items-center mb-2">
                <StyledText className="text-white flex-1 ml-1">
                  {t("notes", "Notas adicionales")}
                </StyledText>
              </StyledView>
              <StyledTextInput
                className="text-[#FFFFFF]/70 text-base bg-[#D4D4D4]/10 rounded-lg p-3 border border-[#5bb9a3] min-h-[80px]"
                placeholder={t("notesPlaceholder", "Notas privadas sobre el truco")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={trickData.notes}
                onChangeText={(text) => updateTrickData({ notes: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </StyledView>
          </StyledView> */}
        </StyledView>
      </StyledScrollView>
      <StyledView className="justify-end px-6 pb-6">
        {/* Indicador de paso */}
        <StyledText className="text-center text-white/60 mb-4">
          {`${currentStep} de ${totalSteps}`}
        </StyledText>

        {/* Botón de Registro de Magia */}
        <StyledTouchableOpacity
          className={`w-full py-4 rounded-lg items-center justify-center flex-row mb-6 ${
            isSubmitting || !encryptionReady ? "bg-white/10" : "bg-emerald-700"
          }`}
          disabled={isSubmitting || !encryptionReady}
          onPress={onNext}
        >
          <StyledText className="text-white font-semibold text-base">
            {isSubmitting
              ? t("saving", "Guardando...")
              : t("registerMagic", "Registrar Magia")}
          </StyledText>
          {isSubmitting ? (
            <Ionicons
              name="refresh"
              size={20}
              color="white"
              style={{ marginLeft: 8 }}
            />
          ) : (
            <MaterialIcons
              name="security"
              size={20}
              color="white"
              style={{ marginLeft: 8 }}
            />
          )}
        </StyledTouchableOpacity>
      </StyledView>
      {/* Modales */}
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
        <TimePickerModal
          visible={showDurationPicker}
          onClose={() => setShowDurationPicker(false)}
          onConfirm={handleDurationChange}
          initialMinutes={
            trickData.duration ? Math.floor(trickData.duration / 60) : 0
          }
          initialSeconds={trickData.duration ? trickData.duration % 60 : 0}
          title={t("setDurationTime", "Set Duration Time")}
        />
      )}

      {/* DateTimePicker nativo para reinicio */}
      {showResetPicker && (
        <TimePickerModal
          visible={showResetPicker}
          onClose={() => setShowResetPicker(false)}
          onConfirm={handleResetChange}
          initialMinutes={
            trickData.reset ? Math.floor(trickData.reset / 60) : 0
          }
          initialSeconds={trickData.reset ? trickData.reset % 60 : 0}
          title={t("setResetTime", "Set Reset Time")}
        />
      )}
    </StyledView>
  );
}

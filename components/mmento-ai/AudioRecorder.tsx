// components/AudioRecorder.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { fontNames } from '../../app/_layout';
import OpenAIService from '../../services/openAIService';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onTranscription, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const openAI = OpenAIService.getInstance();

  // Animación de pulso mientras graba
  React.useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const startRecording = async () => {
    try {
      // Solicitar permisos
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Se necesita permiso para grabar audio');
        return;
      }

      // Configurar modo de audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Configuración de grabación optimizada para voz
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      // Iniciar grabación
      const { recording } = await Audio.Recording.createAsync(
        recordingOptions,
        undefined,
        undefined
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      alert('No se pudo iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsTranscribing(true);

      // Detener grabación
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('No se obtuvo la URI del audio');
      }

      // Transcribir audio
      const transcription = await openAI.transcribeAudio(uri);
      
      if (transcription) {
        onTranscription(transcription);
      }

      // Limpiar
      setRecording(null);
    } catch (error) {
      console.error('Error procesando audio:', error);
      alert('No se pudo procesar el audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handlePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (isTranscribing) {
    return (
      <StyledView className="w-12 h-12 justify-center items-center">
        <ActivityIndicator size="small" color="#10b981" />
      </StyledView>
    );
  }

  return (
    <Animated.View
      style={{
        transform: [{ scale: pulseAnim }],
      }}
    >
      <StyledTouchableOpacity
        onPress={handlePress}
        disabled={disabled || isTranscribing}
        className={`w-12 h-12 rounded-full justify-center items-center ${
          isRecording ? 'bg-red-500' : 'bg-emerald-500'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <Ionicons
          name={isRecording ? 'stop' : 'mic'}
          size={24}
          color="white"
        />
      </StyledTouchableOpacity>
    </Animated.View>
  );
}
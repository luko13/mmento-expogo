// components/security/EncryptionSetup.tsx
"use client"

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { styled } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useEncryption } from '../../hooks/useEncryption';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);
const StyledModal = styled(Modal);

interface EncryptionSetupProps {
  visible: boolean;
  onClose: () => void;
  onSetupComplete: () => void;
}

export const EncryptionSetup: React.FC<EncryptionSetupProps> = ({
  visible,
  onClose,
  onSetupComplete,
}) => {
  const { t } = useTranslation();
  const {
    isReady,
    keyPair,
    generateKeys,
    error: encryptionError
  } = useEncryption();
  
  const [setupStep, setSetupStep] = useState<'welcome' | 'generating' | 'complete' | 'error'>('welcome');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (visible) {
      if (isReady && keyPair) {
        setSetupStep('complete');
      } else if (encryptionError) {
        setSetupStep('error');
      } else {
        setSetupStep('welcome');
      }
    }
  }, [visible, isReady, keyPair, encryptionError]);

  const handleGenerateKeys = async () => {
    Alert.alert(
      t('security.info', 'Información'),
      t('security.keysAlreadyGenerated', 'Las claves se generan automáticamente al iniciar sesión. Si no tienes claves, cierra sesión y vuelve a entrar.'),
      [{ text: t('ok', 'OK'), onPress: onClose }]
    );
  };

  const handleComplete = () => {
    onSetupComplete();
    onClose();
  };

  const renderWelcomeStep = () => (
    <StyledView className="px-6 py-8">
      {/* Icon */}
      <StyledView className="items-center mb-6">
        <StyledView className="w-20 h-20 bg-emerald-600/20 rounded-full items-center justify-center mb-4">
          <MaterialIcons name="security" size={40} color="#10b981" />
        </StyledView>
        <StyledText className="text-white text-2xl font-bold text-center">
          {t('security.setupTitle', 'Configurar Cifrado Seguro')}
        </StyledText>
      </StyledView>

      {/* Description */}
      <StyledView className="mb-8">
        <StyledText className="text-white/80 text-base leading-6 text-center mb-4">
          {t('security.setupDescription', 'Para proteger tu información sensible, vamos a configurar cifrado de extremo a extremo.')}
        </StyledText>
        
        <StyledView className="bg-white/10 rounded-lg p-4 mb-4">
          <StyledView className="flex-row items-center mb-3">
            <Feather name="shield" size={20} color="#10b981" />
            <StyledText className="text-white font-semibold ml-3">
              {t('security.benefits', 'Beneficios:')}
            </StyledText>
          </StyledView>
          
          <StyledView className="ml-8">
            <StyledText className="text-white/80 text-sm mb-2">
              • {t('security.benefit1', 'Tus secretos están protegidos')}
            </StyledText>
            <StyledText className="text-white/80 text-sm mb-2">
              • {t('security.benefit2', 'Solo tú puedes ver tu contenido')}
            </StyledText>
            <StyledText className="text-white/80 text-sm">
              • {t('security.benefit3', 'Cifrado de nivel militar')}
            </StyledText>
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Actions */}
      <StyledView className="flex-row space-x-3">
        <StyledTouchableOpacity
          className="flex-1 bg-white/10 py-4 rounded-lg items-center justify-center"
          onPress={onClose}
        >
          <StyledText className="text-white/80 font-semibold">
            {t('actions.later', 'Más Tarde')}
          </StyledText>
        </StyledTouchableOpacity>
        
        <StyledTouchableOpacity
          className="flex-1 bg-emerald-600 py-4 rounded-lg items-center justify-center"
          onPress={handleGenerateKeys}
          disabled={isGenerating}
        >
          <StyledText className="text-white font-semibold">
            {t('security.setupNow', 'Configurar Ahora')}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    </StyledView>
  );

  const renderGeneratingStep = () => (
    <StyledView className="px-6 py-8 items-center">
      <StyledView className="mb-6">
        <ActivityIndicator size="large" color="#10b981" />
      </StyledView>
      
      <StyledText className="text-white text-xl font-bold text-center mb-4">
        {t('security.generating', 'Generando Claves Seguras')}
      </StyledText>
      
      <StyledText className="text-white/80 text-center leading-6">
        {t('security.generatingDescription', 'Estamos creando tus claves de cifrado únicas. Esto puede tomar unos momentos.')}
      </StyledText>
      
      <StyledView className="bg-white/10 rounded-lg p-4 mt-6">
        <StyledText className="text-white/60 text-sm text-center">
          {t('security.generatingNote', 'Tu clave privada se guardará de forma segura en tu dispositivo y nunca se compartirá.')}
        </StyledText>
      </StyledView>
    </StyledView>
  );

  const renderCompleteStep = () => (
    <StyledView className="px-6 py-8">
      {/* Success Icon */}
      <StyledView className="items-center mb-6">
        <StyledView className="w-20 h-20 bg-emerald-600/20 rounded-full items-center justify-center mb-4">
          <Feather name="check-circle" size={40} color="#10b981" />
        </StyledView>
        <StyledText className="text-white text-2xl font-bold text-center">
          {t('security.setupComplete', '¡Configuración Completa!')}
        </StyledText>
      </StyledView>

      {/* Key Info */}
      <StyledView className="bg-white/10 rounded-lg p-4 mb-6">
        <StyledText className="text-white font-semibold mb-3">
          {t('security.keyInfo', 'Información de tus Claves:')}
        </StyledText>
        
        <StyledView className="flex-row items-center mb-2">
          <Feather name="key" size={16} color="#10b981" />
          <StyledText className="text-white/80 text-sm ml-3">
            {t('security.publicKeyGenerated', 'Clave pública generada y compartida')}
          </StyledText>
        </StyledView>
        
        <StyledView className="flex-row items-center mb-2">
          <Feather name="lock" size={16} color="#10b981" />
          <StyledText className="text-white/80 text-sm ml-3">
            {t('security.privateKeySecure', 'Clave privada guardada de forma segura')}
          </StyledText>
        </StyledView>
        
        {keyPair && (
          <StyledView className="mt-3 pt-3 border-t border-white/20">
            <StyledText className="text-white/60 text-xs">
              {t('security.publicKeyId', 'ID de clave pública:')} {keyPair.publicKey.substring(0, 16)}...
            </StyledText>
          </StyledView>
        )}
      </StyledView>

      {/* Security Notice */}
      <StyledView className="bg-amber-500/20 rounded-lg p-4 mb-6 border border-amber-500/30">
        <StyledView className="flex-row items-center mb-2">
          <Ionicons name="warning" size={20} color="#f59e0b" />
          <StyledText className="text-amber-200 font-semibold ml-3">
            {t('security.importantNotice', 'Importante')}
          </StyledText>
        </StyledView>
        <StyledText className="text-amber-200/80 text-sm">
          {t('security.backupWarning', 'Si pierdes tu dispositivo, no podrás recuperar el contenido cifrado. Asegúrate de hacer respaldos regulares.')}
        </StyledText>
      </StyledView>

      {/* Complete Button */}
      <StyledTouchableOpacity
        className="bg-emerald-600 py-4 rounded-lg items-center justify-center"
        onPress={handleComplete}
      >
        <StyledText className="text-white font-semibold text-lg">
          {t('security.startUsing', 'Comenzar a Usar')}
        </StyledText>
      </StyledTouchableOpacity>
    </StyledView>
  );

  const renderErrorStep = () => (
    <StyledView className="px-6 py-8">
      {/* Error Icon */}
      <StyledView className="items-center mb-6">
        <StyledView className="w-20 h-20 bg-red-600/20 rounded-full items-center justify-center mb-4">
          <Feather name="alert-circle" size={40} color="#ef4444" />
        </StyledView>
        <StyledText className="text-white text-2xl font-bold text-center">
          {t('security.setupError', 'Error en la Configuración')}
        </StyledText>
      </StyledView>

      {/* Error Details */}
      <StyledView className="bg-red-500/20 rounded-lg p-4 mb-6 border border-red-500/30">
        <StyledText className="text-red-200 text-center">
          {encryptionError || t('security.unknownError', 'Ha ocurrido un error desconocido')}
        </StyledText>
      </StyledView>

      {/* Actions */}
      <StyledView className="flex-row space-x-3">
        <StyledTouchableOpacity
          className="flex-1 bg-white/10 py-4 rounded-lg items-center justify-center"
          onPress={onClose}
        >
          <StyledText className="text-white/80 font-semibold">
            {t('actions.cancel', 'Cancelar')}
          </StyledText>
        </StyledTouchableOpacity>
        
        <StyledTouchableOpacity
          className="flex-1 bg-emerald-600 py-4 rounded-lg items-center justify-center"
          onPress={() => {
            setSetupStep('welcome');
            handleGenerateKeys();
          }}
          disabled={isGenerating}
        >
          <StyledText className="text-white font-semibold">
            {t('actions.retry', 'Reintentar')}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    </StyledView>
  );

  const renderStepContent = () => {
    switch (setupStep) {
      case 'welcome':
        return renderWelcomeStep();
      case 'generating':
        return renderGeneratingStep();
      case 'complete':
        return renderCompleteStep();
      case 'error':
        return renderErrorStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <StyledModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={setupStep === 'generating' ? undefined : onClose}
    >
      <BlurView intensity={10} tint="dark" style={{ flex: 1 }}>
        <StyledView className="flex-1 justify-center items-center p-4">
          <StyledView className="w-full max-w-md bg-gray-900/95 rounded-2xl overflow-hidden border border-white/10">
            <LinearGradient
              colors={['#1f2937', '#111827']}
              style={{ flex: 1 }}
            >
              <StyledScrollView className="flex-1">
                {renderStepContent()}
              </StyledScrollView>
            </LinearGradient>
          </StyledView>
        </StyledView>
      </BlurView>
    </StyledModal>
  );
};
// components/EncryptionMigrationModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { styled } from 'nativewind';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { CryptoService } from '../utils/cryptoService';
import { supabase } from '../lib/supabase';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface EncryptionMigrationModalProps {
  visible: boolean;
  onComplete: () => void;
  userId: string;
}

export default function EncryptionMigrationModal({
  visible,
  onComplete,
  userId
}: EncryptionMigrationModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const cryptoService = CryptoService.getInstance();

  const handleMigration = async () => {
    if (!password) {
      Alert.alert(t('error'), t('passwordRequired'));
      return;
    }

    setLoading(true);

    try {
      // Get existing private key from local storage
      const privateKey = await cryptoService.getPrivateKey(userId);
      
      if (!privateKey) {
        throw new Error('No local private key found');
      }

      // Store it encrypted in the cloud
      await cryptoService.storePrivateKeyInCloud(privateKey, userId, password);
      
      Alert.alert(
        t('migrationSuccess', 'Migration Successful'),
        t('encryptionNowSynced', 'Your encryption keys are now synced across all devices'),
        [{ text: 'OK', onPress: onComplete }]
      );
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert(
        t('migrationError', 'Migration Failed'),
        t('checkPasswordAndTryAgain', 'Please check your password and try again')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <StyledView className="flex-1 justify-center items-center bg-black/70">
        <StyledView className="bg-gray-800 p-6 rounded-xl w-5/6 max-w-md">
          <StyledView className="flex-row items-center mb-4">
            <Ionicons name="sync-circle" size={24} color="#10b981" />
            <StyledText className="text-white text-xl font-bold ml-2">
              {t('enableCrossDevice', 'Enable Cross-Device Sync')}
            </StyledText>
          </StyledView>

          <StyledText className="text-gray-300 mb-4 text-sm">
            {t('migrationInfo', 'Your encrypted content is currently only available on this device. Enter your password to enable access from all your devices.')}
          </StyledText>

          <StyledView className="mb-4">
            <StyledView className="bg-gray-700 rounded-lg flex-row items-center">
              <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
                <StyledTextInput
                  className="text-white p-3 flex-1"
                  placeholder={t('password', 'Password')}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </BlurView>
              <StyledTouchableOpacity
                className="p-3"
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="rgba(255, 255, 255, 0.5)" 
                />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          <StyledView className="flex-row justify-end">
            <StyledTouchableOpacity
              className="bg-gray-600 px-4 py-2 rounded-lg mr-2"
              onPress={onComplete}
              disabled={loading}
            >
              <StyledText className="text-white">{t('later', 'Later')}</StyledText>
            </StyledTouchableOpacity>

            <StyledTouchableOpacity
              className="bg-emerald-600 px-4 py-2 rounded-lg flex-row items-center"
              onPress={handleMigration}
              disabled={loading || !password}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={16} color="white" />
                  <StyledText className="text-white ml-1">
                    {t('enableSync', 'Enable Sync')}
                  </StyledText>
                </>
              )}
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>
      </StyledView>
    </Modal>
  );
}
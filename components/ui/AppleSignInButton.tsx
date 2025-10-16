import { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, Platform, Alert } from 'react-native';
import { styled } from 'nativewind';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { fontNames } from '../../app/_layout';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

interface AppleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  mode?: 'signin' | 'signup';
}

export function AppleSignInButton({ onSuccess, onError, mode = 'signin' }: AppleSignInButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if Sign in with Apple is available on this device
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    if (Platform.OS === 'ios') {
      const available = await AppleAuthentication.isAvailableAsync();
      setIsAvailable(available);
    }
  };

  const handleAppleSignIn = async () => {
    if (!isAvailable) {
      Alert.alert(t('error'), t('appleSignInNotAvailable'));
      return;
    }

    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Sign in with Supabase using the Apple credential
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken!,
      });

      if (error) {
        throw error;
      }

      if (data) {
        onSuccess?.();
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow
        return;
      }

      console.error('Apple Sign In Error:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      Alert.alert(t('error'), t('appleSignInError'));
    } finally {
      setLoading(false);
    }
  };

  // Don't render the button if Apple Sign In is not available
  if (!isAvailable) {
    return null;
  }

  return (
    <StyledTouchableOpacity
      className="w-full bg-white rounded-md h-11 items-center justify-center flex-row"
      onPress={handleAppleSignIn}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#000000" />
      ) : (
        <>
          <Ionicons name="logo-apple" size={20} color="#000000" style={{ marginRight: 8 }} />
          <StyledText
            className="text-black font-medium"
            style={{
              fontFamily: fontNames.medium,
              includeFontPadding: false,
            }}
          >
            {mode === 'signup' ? t('signUpWithApple') : t('signInWithApple')}
          </StyledText>
        </>
      )}
    </StyledTouchableOpacity>
  );
}

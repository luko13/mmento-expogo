import React from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { AntDesign, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useFavorites } from '../../hooks/useFavorites';

const StyledTouchableOpacity = styled(TouchableOpacity);

interface FavoriteButtonProps {
  contentId: string;
  contentType: 'magic' | 'gimmick' | 'technique' | 'script';
  size?: number;
  style?: any;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  contentId,
  contentType,
  size = 24,
  style
}) => {
  const { isFavorite, toggleFavorite, loading } = useFavorites(
    contentId,
    contentType
  );

  return (
    <StyledTouchableOpacity
      onPress={toggleFavorite}
      disabled={loading}
      style={style}
      className="p-2"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#10b981" />
      ) : (
        <FontAwesome
          name={isFavorite ? "star" : "star-o"}
          size={size}
          color={isFavorite ? "#fadc91" : "#ffffff"}
        />
      )}
    </StyledTouchableOpacity>
  );
};
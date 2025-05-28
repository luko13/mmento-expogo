// utils/trickHelpers.ts
import { supabase } from '../lib/supabase';

export const getTrickWithEncryptedPhotos = async (trickId: string) => {
  try {
    // Obtener el truco básico
    const { data: trick, error } = await supabase
      .from('magic_tricks')
      .select('*')
      .eq('id', trickId)
      .single();

    if (error || !trick) {
      console.error('Error obteniendo truco:', error);
      return null;
    }

    // Si el truco está cifrado, obtener los datos de encrypted_content
    if (trick.is_encrypted) {
      const { data: encryptedData, error: encryptedError } = await supabase
        .from('encrypted_content')
        .select('encrypted_files')
        .eq('content_id', trickId)
        .eq('content_type', 'magic_tricks')
        .single();

      if (!encryptedError && encryptedData?.encrypted_files?.photos) {
        // Agregar el array de fotos al objeto trick
        trick.photos = encryptedData.encrypted_files.photos;
        console.log(`📸 Truco ${trickId} tiene ${trick.photos.length} fotos cifradas`);
      }
    }

    return trick;
  } catch (error) {
    console.error('Error en getTrickWithEncryptedPhotos:', error);
    return null;
  }
};
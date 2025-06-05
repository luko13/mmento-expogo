// services/encryptedContentService.ts
import { supabase } from "../lib/supabase";
import { useEncryption } from "../hooks/useEncryption";
import { FileEncryptionService } from "../utils/fileEncryption";

interface DecryptedContent {
  [key: string]: any;
}

export class EncryptedContentService {
  private fileEncryption: FileEncryptionService;

  constructor() {
    this.fileEncryption = new FileEncryptionService();
  }

  /**
   * Obtiene y descifra contenido propio
   */
  async getOwnContent(
    contentId: string,
    contentType: "techniques" | "gimmicks" | "magic_tricks",
    decryptForSelf: (encrypted: string) => Promise<string>,
    getPrivateKey: () => string
  ): Promise<DecryptedContent | null> {
    try {
      // Obtener contenido original
      const { data: content, error: contentError } = await supabase
        .from(contentType)
        .select("*")
        .eq("id", contentId)
        .single();

      if (contentError || !content) {
        console.error("Error obteniendo contenido:", contentError);
        return null;
      }

      // Si no está cifrado, devolver tal cual
      if (!content.is_encrypted) {
        return content;
      }

      // Obtener metadatos de cifrado
      const { data: encryptedMeta, error: metaError } = await supabase
        .from("encrypted_content")
        .select("encrypted_fields, encrypted_files")
        .eq("content_id", contentId)
        .eq("content_type", contentType)
        .single();

      if (metaError || !encryptedMeta) {
        console.error("Error obteniendo metadatos:", metaError);
        return content; // Devolver sin descifrar
      }
      console.log("🔍 Encrypted content:", encryptedMeta.encrypted_fields);
      // Descifrar campos
      const decrypted = { ...content };

      if (encryptedMeta.encrypted_fields) {
        for (const [field, encryptedValue] of Object.entries(
          encryptedMeta.encrypted_fields
        )) {
          if (encryptedValue) {
            console.log(`🔓 Descifrando campo: ${field}`);
            console.log(`🔓 Valor cifrado:`, encryptedValue);
            try {
              decrypted[field] = await decryptForSelf(encryptedValue as string);
              console.log(`✅ ${field} descifrado OK`);
            } catch (error) {
              console.error(`Error descifrando campo ${field}:`, error);
              console.error(`❌ ${field} falló:`, error)
            }
          }
        }
      }

      // Manejar archivos cifrados
      if (encryptedMeta.encrypted_files) {
        for (const [fileType, fileId] of Object.entries(
          encryptedMeta.encrypted_files
        )) {
          if (fileId) {
            decrypted[`${fileType}_url`] = fileId; // El ID del archivo cifrado
            decrypted[`${fileType}_encrypted`] = true;
          }
        }
      }

      return decrypted;
    } catch (error) {
      console.error("Error en getOwnContent:", error);
      return null;
    }
  }

  /**
   * Obtiene y descifra contenido compartido
   */
  async getSharedContent(
    contentId: string,
    contentType: "techniques" | "gimmicks" | "magic_tricks",
    userId: string,
    decryptForSelf: (encrypted: string) => Promise<string>
  ): Promise<DecryptedContent | null> {
    try {
      // Verificar si el contenido fue compartido con este usuario
      const { data: sharedAccess, error: sharedError } = await supabase
        .from("shared_content")
        .select("encrypted_fields, permissions")
        .eq("content_id", contentId)
        .eq("content_type", contentType)
        .eq("shared_with", userId)
        .single();

      if (sharedError || !sharedAccess) {
        console.error("No tienes acceso a este contenido");
        return null;
      }

      // Obtener contenido original
      const { data: content, error: contentError } = await supabase
        .from(contentType)
        .select("*")
        .eq("id", contentId)
        .single();

      if (contentError || !content) {
        return null;
      }

      // Descifrar campos compartidos
      const decrypted = { ...content };

      if (sharedAccess.encrypted_fields) {
        for (const [field, encryptedValue] of Object.entries(
          sharedAccess.encrypted_fields
        )) {
          if (encryptedValue) {
            try {
              decrypted[field] = await decryptForSelf(encryptedValue as string);
            } catch (error) {
              console.error(
                `Error descifrando campo compartido ${field}:`,
                error
              );
            }
          }
        }
      }

      // Agregar indicador de contenido compartido
      decrypted.is_shared = true;
      decrypted.permissions = sharedAccess.permissions;

      return decrypted;
    } catch (error) {
      console.error("Error en getSharedContent:", error);
      return null;
    }
  }

  /**
   * Obtiene contenido (propio o compartido) automáticamente
   */
  async getContent(
    contentId: string,
    contentType: "techniques" | "gimmicks" | "magic_tricks",
    userId: string,
    decryptForSelf: (encrypted: string) => Promise<string>,
    getPrivateKey: () => string
  ): Promise<DecryptedContent | null> {
    // Primero verificar si es contenido propio
    const { data: content } = await supabase
      .from(contentType)
      .select("user_id")
      .eq("id", contentId)
      .single();

    if (content?.user_id === userId) {
      return this.getOwnContent(
        contentId,
        contentType,
        decryptForSelf,
        getPrivateKey
      );
    } else {
      return this.getSharedContent(
        contentId,
        contentType,
        userId,
        decryptForSelf
      );
    }
  }

  /**
   * Compartir contenido con otro usuario
   */
  async shareContent(
    contentId: string,
    contentType: "techniques" | "gimmicks" | "magic_tricks",
    targetUserId: string,
    permissions: string[],
    encryptForUser: (data: string, publicKey: string) => Promise<string>,
    decryptForSelf: (encrypted: string) => Promise<string>
  ): Promise<boolean> {
    try {
      // Obtener clave pública del destinatario
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("public_key")
        .eq("id", targetUserId)
        .single();

      if (!targetProfile?.public_key) {
        throw new Error(
          "El usuario destinatario no tiene configurado el cifrado"
        );
      }

      // Obtener metadatos cifrados originales
      const { data: encryptedMeta } = await supabase
        .from("encrypted_content")
        .select("encrypted_fields")
        .eq("content_id", contentId)
        .eq("content_type", contentType)
        .single();

      if (!encryptedMeta) {
        throw new Error("No se encontraron metadatos cifrados");
      }

      // Descifrar y recifrar para el destinatario
      const sharedFields: any = {};

      for (const [field, encryptedValue] of Object.entries(
        encryptedMeta.encrypted_fields
      )) {
        if (encryptedValue) {
          // Descifrar con mi clave
          const decrypted = await decryptForSelf(encryptedValue as string);
          // Cifrar con la clave del destinatario
          sharedFields[field] = await encryptForUser(
            decrypted,
            targetProfile.public_key
          );
        }
      }

      // Guardar acceso compartido
      const { error } = await supabase.from("shared_content").upsert({
        content_id: contentId,
        content_type: contentType,
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        shared_with: targetUserId,
        encrypted_fields: sharedFields,
        permissions: permissions,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error compartiendo contenido:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error en shareContent:", error);
      return false;
    }
  }

  /**
   * Revocar acceso compartido
   */
  async revokeSharedAccess(
    contentId: string,
    contentType: string,
    targetUserId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("shared_content")
        .delete()
        .eq("content_id", contentId)
        .eq("content_type", contentType)
        .eq("shared_with", targetUserId);

      return !error;
    } catch (error) {
      console.error("Error revocando acceso:", error);
      return false;
    }
  }

  /**
   * Obtener lista de usuarios con acceso compartido
   */
  async getSharedUsers(contentId: string, contentType: string): Promise<any[]> {
    try {
      const { data } = await supabase
        .from("shared_content")
        .select(
          `
          shared_with,
          permissions,
          created_at,
          profiles!shared_content_shared_with_fkey (
            id,
            username,
            avatar_url
          )
        `
        )
        .eq("content_id", contentId)
        .eq("content_type", contentType);

      return data || [];
    } catch (error) {
      console.error("Error obteniendo usuarios compartidos:", error);
      return [];
    }
  }
}

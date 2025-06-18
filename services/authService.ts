import { supabase } from "../lib/supabase";
import { CryptoService } from "../utils/cryptoService";


/**
 * Interface para el resultado del login
 */
export interface SignInResult {
  user: any;
  session: any;
  keysInitialized: boolean;
  needsPasswordForKeys?: boolean;
}

/**
 * Servicio de autenticación
 * Implementa el patrón Singleton
 */
export class AuthService {
  private static instance: AuthService;
  private cryptoService = CryptoService.getInstance();

  /**
   * Constructor privado para el patrón Singleton
   */
  private constructor() {}

  /**
   * Obtiene la instancia única del servicio
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Registra un nuevo usuario con cifrado habilitado
   *
   * @param email - Email del usuario
   * @param password - Contraseña del usuario
   * @param username - Nombre de usuario opcional
   * @returns Datos del usuario y sesión creada
   */
  async signUp(email: string, password: string, username?: string) {
    try {
      console.log("🔐 Iniciando registro con cifrado...");

      // Validar parámetros de entrada
      if (!email || !password) {
        throw new Error("Email y contraseña son requeridos");
      }

      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }

      if (!email.includes("@") || !email.includes(".")) {
        throw new Error("El email no es válido");
      }

      // Verificar que el servicio de criptografía funcione
      const cryptoWorking = await this.cryptoService.testCryptoService();
      if (!cryptoWorking) {
        console.warn(
          "⚠️ Crypto service no funciona correctamente, continuando sin cifrado..."
        );
      }

      console.log("📧 Creando cuenta en Supabase...");

      // Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split("@")[0],
          },
        },
      });

      if (authError) {
        console.error("❌ Error en signUp:", authError);
        throw this.translateAuthError(authError);
      }

      if (!authData.user) {
        throw new Error("No se recibieron datos del usuario");
      }

      console.log("✅ Usuario creado:", authData.user.id);

      // Generar claves de cifrado solo si crypto funciona
      let keysInitialized = false;
      if (cryptoWorking) {
        try {
          console.log("🔑 Generando claves de cifrado...");
          await this.cryptoService.generateKeyPairWithCloudBackup(
            authData.user.id,
            password
          );
          keysInitialized = true;
          console.log("✅ Claves generadas y guardadas");
        } catch (cryptoError) {
          console.warn(
            "⚠️ Error generando claves, pero el usuario fue creado:",
            cryptoError
          );
          // No fallar el registro completo por errores de cifrado
        }
      }

      return {
        user: authData.user,
        session: authData.session,
        keysInitialized,
      };
    } catch (error) {
      console.error("❌ Error en registro:", error);

      // Mejorar mensajes de error
      if (error instanceof Error) {
        if (error.message.includes("already_registered")) {
          throw new Error("Este email ya está registrado");
        }
        if (error.message.includes("invalid_email")) {
          throw new Error("El email no es válido");
        }
        if (error.message.includes("weak_password")) {
          throw new Error("La contraseña es muy débil");
        }
      }

      throw error;
    }
  }

  /**
   * Inicia sesión y recupera las claves de cifrado automáticamente
   *
   * @param email - Email del usuario
   * @param password - Contraseña del usuario
   * @returns Resultado del login con estado de claves
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    try {
      console.log("🔐 Iniciando login con cifrado...");

      // Validar parámetros
      if (!email || !password) {
        throw new Error("Email y contraseña son requeridos");
      }

      // Verificar servicio de criptografía
      const cryptoWorking = await this.cryptoService.testCryptoService();
      if (!cryptoWorking) {
        console.warn(
          "⚠️ Crypto service no funciona, continuando con login básico..."
        );
      }

      console.log("🔑 Autenticando en Supabase...");

      // Autenticar con Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        console.error("❌ Error en signIn:", authError);
        throw this.translateAuthError(authError);
      }

      if (!authData.user || !authData.session) {
        throw new Error("Credenciales inválidas");
      }

      console.log("✅ Usuario autenticado:", authData.user.id);

      // Inicializar respuesta
      const result: SignInResult = {
        user: authData.user,
        session: authData.session,
        keysInitialized: false,
        needsPasswordForKeys: false,
      };

      // Intentar recuperar claves de cifrado si crypto funciona
      if (cryptoWorking) {
        const keysStatus = await this.initializeUserKeys(
          authData.user.id,
          password
        );
        result.keysInitialized = keysStatus.initialized;
        result.needsPasswordForKeys = keysStatus.needsPassword;
      }
      console.log(
        "🧪 TEST: Intentando recuperar claves con todos los métodos..."
      );
      return result;
    } catch (error) {
      console.error("❌ Error en login:", error);
      throw error;
    }
  }

  /**
   * Inicializa las claves del usuario de forma inteligente
   *
   * @param userId - ID del usuario
   * @param password - Contraseña del usuario
   * @returns Estado de las claves
   */
  private async initializeUserKeys(
    userId: string,
    password: string
  ): Promise<{
    initialized: boolean;
    needsPassword: boolean;
  }> {
    try {
      console.log("🔄 Inicializando claves del usuario...");

      // Primero verificar si hay claves locales
      const localPrivateKey = await this.cryptoService.getPrivateKey(userId);
      if (localPrivateKey) {
        console.log("✅ Claves ya presentes en almacenamiento local");
        return { initialized: true, needsPassword: false };
      }

      // Verificar si el usuario tiene claves en la nube
      const hasCloudKeys = await this.hasEncryptionSetup(userId);

      if (hasCloudKeys) {
        console.log(
          "☁️ Usuario tiene claves en la nube, intentando recuperar..."
        );

        // Intentar recuperar claves de la nube
        const keyPair = await this.cryptoService.initializeFromCloud(
          userId,
          password
        );

        if (keyPair) {
          console.log("✅ Claves recuperadas exitosamente de la nube");
          return { initialized: true, needsPassword: false };
        } else {
          console.warn(
            "⚠️ Las claves existen pero no se pudieron recuperar con el método estándar"
          );

          // Intentar migración con múltiples métodos
          console.log(
            "🔄 Intentando recuperación con múltiples métodos de derivación..."
          );
          const { tryRecoverKeysWithMultipleMethods } = await import(
            "../utils/keyMigration"
          );
          const recovered = await tryRecoverKeysWithMultipleMethods(
            userId,
            password
          );

          if (recovered) {
            console.log(
              "✅ Claves recuperadas con método alternativo y migradas"
            );
            return { initialized: true, needsPassword: false };
          }

          console.error(
            "❌ No se pudieron recuperar las claves con ningún método"
          );

          // Las claves existen pero necesitamos la contraseña correcta
          return { initialized: false, needsPassword: true };
        }
      } else {
        console.log(
          "🆕 Usuario sin cifrado configurado, generando nuevas claves..."
        );

        // Generar nuevas claves
        try {
          await this.cryptoService.generateKeyPairWithCloudBackup(
            userId,
            password
          );
          console.log("✅ Nuevas claves generadas y respaldadas");
          return { initialized: true, needsPassword: false };
        } catch (error) {
          console.error("❌ Error generando nuevas claves:", error);
          return { initialized: false, needsPassword: false };
        }
      }
    } catch (error) {
      console.error("❌ Error inicializando claves:", error);
      return { initialized: false, needsPassword: false };
    }
  }

  /**
   * Intenta recuperar las claves con una contraseña diferente
   * Se usa cuando el usuario tiene claves pero la contraseña del login no funcionó
   *
   * @param password - Contraseña alternativa
   * @returns true si las claves se recuperaron exitosamente
   */
  async retryKeysWithPassword(password: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      console.log(
        "🔄 Reintentando recuperar claves con contraseña alternativa..."
      );

      const keyPair = await this.cryptoService.initializeFromCloud(
        user.id,
        password
      );

      if (keyPair) {
        console.log("✅ Claves recuperadas exitosamente");
        return true;
      } else {
        console.log(
          "❌ No se pudieron recuperar las claves con esta contraseña"
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error recuperando claves:", error);
      return false;
    }
  }

  /**
   * Cierra la sesión del usuario y limpia datos locales
   */
  async signOut() {
    try {
      console.log("🚪 Cerrando sesión...");

      // Obtener usuario actual antes de cerrar sesión
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        try {
          // Limpiar claves locales
          await this.cryptoService.clearLocalKeys(user.id);
          console.log("🗑️ Claves locales limpiadas");
        } catch (error) {
          console.warn("⚠️ Error limpiando claves locales:", error);
          // No fallar el logout por esto
        }
      }

      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
      console.log("✅ Sesión cerrada");
    } catch (error) {
      console.error("❌ Error en logout:", error);
      throw error;
    }
  }

  /**
   * Verifica si un usuario tiene cifrado configurado
   *
   * @param userId - ID del usuario
   * @returns true si tiene cifrado configurado
   */
  async hasEncryptionSetup(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("public_key, encrypted_private_key")
        .eq("id", userId)
        .single();

      // Verificar que ambas claves existan
      return !!(data?.public_key && data?.encrypted_private_key);
    } catch (error) {
      console.error("Error verificando cifrado:", error);
      return false;
    }
  }

  /**
   * Configura cifrado para un usuario existente que no lo tenía
   * Se usa para migrar usuarios antiguos al sistema de cifrado
   *
   * @param userId - ID del usuario
   * @param password - Contraseña del usuario
   * @returns true si se configuró exitosamente
   */
  async setupEncryptionForExistingUser(
    userId: string,
    password: string
  ): Promise<boolean> {
    try {
      console.log("🔧 Configurando cifrado para usuario existente...");

      // Verificar que crypto funcione
      const cryptoWorking = await this.cryptoService.testCryptoService();
      if (!cryptoWorking) {
        throw new Error("El servicio de cifrado no está funcionando");
      }

      // Generar y guardar claves
      await this.cryptoService.generateKeyPairWithCloudBackup(userId, password);
      console.log("✅ Cifrado configurado exitosamente");
      return true;
    } catch (error) {
      console.error("❌ Error configurando cifrado:", error);
      return false;
    }
  }

  /**
   * Prueba la conexión con Supabase
   * Útil para diagnosticar problemas de red
   *
   * @returns true si la conexión es exitosa
   */
  async testConnection(): Promise<boolean> {
    try {
      // Hacer una consulta simple para verificar conexión
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      return !error;
    } catch (error) {
      console.error("Error probando conexión:", error);
      return false;
    }
  }

  /**
   * Traduce errores de Supabase Auth a mensajes en español
   *
   * @param error - Error de Supabase
   * @returns Error con mensaje traducido
   */
  private translateAuthError(error: any): Error {
    const message = error.message || "";

    // Mapeo de errores comunes
    const errorMap: { [key: string]: string } = {
      "Invalid login credentials": "Email o contraseña incorrectos",
      "Email not confirmed": "Debes confirmar tu email antes de iniciar sesión",
      "User already registered": "Este email ya está registrado",
      "Password should be at least":
        "La contraseña debe tener al menos 6 caracteres",
      "Unable to validate email address": "El email no es válido",
      "Too many requests":
        "Demasiados intentos. Espera unos minutos e inténtalo de nuevo",
      "Network request failed": "Error de conexión. Verifica tu internet",
      "JWT expired": "Tu sesión ha expirado. Inicia sesión nuevamente",
      "Email link is invalid":
        "El enlace de confirmación es inválido o ha expirado",
      "New password should be different":
        "La nueva contraseña debe ser diferente a la actual",
      "Signups not allowed": "Los registros están temporalmente deshabilitados",
      "Email provider not allowed": "Este proveedor de email no está permitido",
      "SMS Provider error": "Error enviando SMS de verificación",
      "Phone number invalid format": "El número de teléfono no es válido",
    };

    // Buscar coincidencias en el mensaje
    for (const [key, value] of Object.entries(errorMap)) {
      if (message.includes(key)) {
        return new Error(value);
      }
    }

    // Si no hay traducción, devolver el mensaje original
    return error;
  }

  /**
   * Obtiene información del usuario actual
   *
   * @returns Usuario actual o null
   */
  async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error obteniendo usuario:", error);
        return null;
      }

      return user;
    } catch (error) {
      console.error("Error obteniendo usuario actual:", error);
      return null;
    }
  }

  /**
   * Actualiza la contraseña del usuario
   *
   * @param newPassword - Nueva contraseña
   * @returns true si se actualizó exitosamente
   */
  async updatePassword(newPassword: string): Promise<boolean> {
    try {
      if (newPassword.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw this.translateAuthError(error);
      }

      console.log("✅ Contraseña actualizada");
      return true;
    } catch (error) {
      console.error("Error actualizando contraseña:", error);
      throw error;
    }
  }

  /**
   * Envía un email para restablecer la contraseña
   *
   * @param email - Email del usuario
   * @returns true si se envió exitosamente
   */
  async resetPassword(email: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw this.translateAuthError(error);
      }

      console.log("✅ Email de restablecimiento enviado");
      return true;
    } catch (error) {
      console.error("Error enviando email de reset:", error);
      throw error;
    }
  }

  /**
   * Verifica si hay una sesión activa
   *
   * @returns true si hay sesión activa
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      return !error && !!session;
    } catch (error) {
      console.error("Error verificando autenticación:", error);
      return false;
    }
  }

  /**
   * Refresca la sesión actual
   * Útil para renovar tokens expirados
   *
   * @returns true si se refrescó exitosamente
   */
  async refreshSession(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Error refrescando sesión:", error);
        return false;
      }

      console.log("✅ Sesión refrescada");
      return true;
    } catch (error) {
      console.error("Error refrescando sesión:", error);
      return false;
    }
  }
}

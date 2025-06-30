// services/authService.ts
import { supabase } from "../lib/supabase";

/**
 * Interface para el resultado del login
 */
export interface SignInResult {
  user: any;
  session: any;
}

/**
 * Servicio de autenticación
 * Implementa el patrón Singleton
 */
export class AuthService {
  private static instance: AuthService;

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
   * Registra un nuevo usuario
   *
   * @param email - Email del usuario
   * @param password - Contraseña del usuario
   * @param username - Nombre de usuario opcional
   * @returns Datos del usuario y sesión creada
   */
  async signUp(email: string, password: string, username?: string) {
    try {
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
      return {
        user: authData.user,
        session: authData.session,
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
   * Inicia sesión del usuario
   *
   * @param email - Email del usuario
   * @param password - Contraseña del usuario
   * @returns Resultado del login
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    try {
      // Validar parámetros
      if (!email || !password) {
        throw new Error("Email y contraseña son requeridos");
      }
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
      return {
        user: authData.user,
        session: authData.session,
      };
    } catch (error) {
      console.error("❌ Error en login:", error);
      throw error;
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async signOut() {
    try {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error("❌ Error en logout:", error);
      throw error;
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
      return true;
    } catch (error) {
      console.error("Error refrescando sesión:", error);
      return false;
    }
  }
}

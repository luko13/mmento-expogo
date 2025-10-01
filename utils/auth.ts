// utils/auth.ts
import { AuthService } from "../services/authService";
import { setAuthToken, removeAuthToken } from "./storage";

const authService = AuthService.getInstance();

/**
 * Inicia sesión del usuario
 */
export const signIn = async (
  email: string,
  password: string
): Promise<boolean> => {
  try {
    const result = await authService.signIn(email, password);

    // Guardar token de sesión
    if (result.session?.access_token) {
      await setAuthToken(result.session.access_token);
    }

    return true;
  } catch (error) {
    console.error("Error en signIn:", error);
    throw error;
  }
};

/**
 * Registra un nuevo usuario
 */
export const signUp = async (
  email: string,
  password: string,
  username?: string
): Promise<boolean> => {
  try {
    const result = await authService.signUp(email, password, username);

    // Guardar token de sesión si está disponible
    if (result.session?.access_token) {
      await setAuthToken(result.session.access_token);
    }

    return true;
  } catch (error) {
    console.error("Error en signUp:", error);
    throw error;
  }
};

/**
 * Cierra la sesión del usuario
 */
export const signOut = async (): Promise<void> => {
  try {
    await authService.signOut();
    await removeAuthToken();
  } catch (error) {
    console.error("Error en signOut:", error);
    throw error;
  }
};

/**
 * Obtiene el usuario actual
 */
export const getCurrentUser = async () => {
  return authService.getCurrentUser();
};

/**
 * Verifica si hay una sesión activa
 */
export const isAuthenticated = async (): Promise<boolean> => {
  return authService.isAuthenticated();
};

/**
 * Envía email para restablecer contraseña
 */
export const resetPassword = async (email: string): Promise<boolean> => {
  return authService.resetPassword(email);
};

/**
 * Actualiza la contraseña del usuario
 */
export const updatePassword = async (newPassword: string): Promise<boolean> => {
  return authService.updatePassword(newPassword);
};

/**
 * Refresca la sesión actual
 */
export const refreshSession = async (): Promise<boolean> => {
  return authService.refreshSession();
};

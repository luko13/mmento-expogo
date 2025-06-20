// utils/auth.ts
import { supabase } from "../lib/supabase";
import { getAuthToken, setAuthToken, removeAuthToken } from "./storage";
import { AuthService } from "../services/authService";

const authService = AuthService.getInstance();

/**
 * Verificar el estado de la autenticación con mejor manejo de errores
 */
export const checkAuthStatus = async (): Promise<boolean> => {
  try {
    console.log("🔍 Verificando estado de autenticación...");

    // Primero verificar token local
    const token = await getAuthToken();
    if (!token) {
      console.log("❌ No hay token local");
      return false;
    }

    console.log("✅ Token local encontrado");

    // Verificar usuario en Supabase
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      console.log("❌ Token inválido o usuario no encontrado:", error?.message);
      await removeAuthToken();
      return false;
    }

    console.log("✅ Usuario verificado:", data.user.id);
    return true;
  } catch (error) {
    console.error("❌ Error verificando auth status:", error);
    await removeAuthToken();
    return false;
  }
};

/**
 * Función de login con mejor manejo de errores
 */
export const signIn = async (
  email: string,
  password: string
): Promise<boolean> => {
  try {
    console.log("🔑 Iniciando proceso de login...");

    // Validar inputs
    if (!email || !password) {
      throw new Error("Email y contraseña son requeridos");
    }

    if (!email.includes("@")) {
      throw new Error("El email no es válido");
    }

    // Test de conexión primero
    const connectionOk = await authService.testConnection();
    if (!connectionOk) {
      throw new Error(
        "No se puede conectar con el servidor. Verifica tu conexión a internet"
      );
    }

    console.log("🌐 Conexión con servidor OK");

    // Intentar login
    const { user, session } = await authService.signIn(
      email.trim().toLowerCase(),
      password
    );

    if (!session) {
      console.error("❌ No session returned");
      throw new Error("No se pudo crear la sesión");
    }

    console.log("🎫 Guardando token de sesión...");
    await setAuthToken(session.access_token);

    console.log("✅ Login exitoso");
    return true;
  } catch (error) {
    console.error("❌ Error signing in:", error);

    // Limpiar cualquier token corrupto
    await removeAuthToken();

    // Re-throw con el mensaje original
    throw error;
  }
};

/**
 * Función de registro con mejor manejo de errores
 */
export const signUp = async (
  email: string,
  password: string,
  username?: string
): Promise<boolean> => {
  try {
    console.log("📝 Iniciando proceso de registro...");

    // Validar inputs
    if (!email || !password) {
      throw new Error("Email y contraseña son requeridos");
    }

    if (!email.includes("@")) {
      throw new Error("El email no es válido");
    }

    if (password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    // Test de conexión primero
    const connectionOk = await authService.testConnection();
    if (!connectionOk) {
      throw new Error(
        "No se puede conectar con el servidor. Verifica tu conexión a internet"
      );
    }

    console.log("🌐 Conexión con servidor OK");

    const { user, session } = await authService.signUp(
      email.trim().toLowerCase(),
      password,
      username
    );

    if (!user) {
      throw new Error("No se pudo crear el usuario");
    }

    console.log("👤 Usuario creado:", user.id);

    if (session) {
      console.log("🎫 Guardando token de sesión...");
      await setAuthToken(session.access_token);
      console.log("✅ Registro y login automático exitoso");
    } else {
      console.log("📧 Usuario creado, verificación de email requerida");
    }

    return true;
  } catch (error) {
    console.error("❌ Error en registro:", error);

    // Limpiar cualquier token corrupto
    await removeAuthToken();

    // Re-throw con el mensaje original
    throw error;
  }
};

/**
 * Función de logout mejorada
 */
export const signOut = async (): Promise<void> => {
  try {
    console.log("🚪 Cerrando sesión...");

    // Usar el servicio de auth mejorado
    await authService.signOut();

    // Limpiar token local
    await removeAuthToken();

    console.log("✅ Logout completado");
  } catch (error) {
    console.error("❌ Error en logout:", error);

    // Asegurar que el token se limpie aunque haya errores
    await removeAuthToken();

    // No re-throw para logout, solo log
  }
};

/**
 * Función de debug para diagnosticar problemas
 */
export const debugAuth = async (): Promise<void> => {
  console.log("🔍 === DIAGNÓSTICO DE AUTENTICACIÓN ===");

  try {
    // 1. Verificar token local
    const localToken = await getAuthToken();
    console.log("1️⃣ Token local:", localToken ? "✅ Presente" : "❌ Ausente");

    // 2. Verificar conexión
    const connectionOk = await authService.testConnection();
    console.log("2️⃣ Conexión servidor:", connectionOk ? "✅ OK" : "❌ Error");

    // 3. Verificar usuario actual
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    console.log(
      "3️⃣ Usuario actual:",
      user ? `✅ ${user.email}` : "❌ No autenticado"
    );
    if (error) console.log("   Error:", error.message);

    // 4. Verificar sesión
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    console.log("4️⃣ Sesión activa:", session ? "✅ Válida" : "❌ Inválida");
    if (sessionError) console.log("   Error:", sessionError.message);
  } catch (error) {
    console.log("❌ Error en diagnóstico:", error);
  }

  console.log("🔍 === FIN DIAGNÓSTICO ===");
};

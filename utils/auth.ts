// utils/auth.ts
import { supabase } from "../lib/supabase"
import { getAuthToken, setAuthToken, removeAuthToken } from "./storage"
import { AuthService } from "../services/authService"

const authService = AuthService.getInstance();

//* Vemos como esta el estado de la autenticación
export const checkAuthStatus = async (): Promise<boolean> => {
  //Guardamos el token
  const token = await getAuthToken()

  if (!token) return false //No hay token

  //no hay usuario
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    await removeAuthToken()
    return false
  }

  //si hay token o usuario
  return true
}

//* Funcion logeo con cifrado automático
export const signIn = async (email: string, password: string): Promise<boolean> => {
  try {
    const { user, session } = await authService.signIn(email, password);
    
    if (!session) {
      console.error("No session returned");
      return false;
    }
    
    await setAuthToken(session.access_token);
    return true;
  } catch (error) {
    console.error("Error signing in: ", error);
    return false;
  }
}

//* Funcion registro con cifrado automático
export const signUp = async (email: string, password: string): Promise<boolean> => {
  try {
    
    
    const { user, session } = await authService.signUp(email, password);
    
    if (!user) {
      
      return false;
    }

    

    if (session) {
      
      await setAuthToken(session.access_token);
    } else {
      
    }

    return true;
  } catch (error) {
    console.error("Error en registro:", error);
    return false;
  }
}

//* Deslogueo
export const signOut = async (): Promise<void> => {
  await authService.signOut();
  await removeAuthToken();
}
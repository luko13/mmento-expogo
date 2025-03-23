import AsyncStorage from "@react-native-async-storage/async-storage"

const FIRST_TIME_KEY = "isFirstTime"
const AUTH_TOKEN_KEY = "authToken"
const SESSION_KEY = "session"

//*Funcion de setFirstTimeUSer
export const setFirstTimeUser = async (isFirstTime: boolean) => {
  try {
    await AsyncStorage.setItem(FIRST_TIME_KEY, JSON.stringify(isFirstTime))
  } catch (error) {
    console.error("Error setting first time user:", error)
  }
}

//*Constante de isFirstTimeUser
export const isFirstTimeUser = async (): Promise<boolean> => {
  /* try {
    const value = await AsyncStorage.getItem(FIRST_TIME_KEY);
    return value === null ? true : JSON.parse(value);
  } catch (error) {
    console.error("Error checking if first time user:", error);
    return true; // Assume it's the first time if there's an error
  } */
  return true
}

//* Guardar authToken
export const setAuthToken = async (token: string) => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token)
    // También establecemos la sesión como activa
    await AsyncStorage.setItem(SESSION_KEY, "true")
    return true
  } catch (error) {
    console.error("Error setting auth token:", error)
    return false
  }
}

//* Recuperar authToken
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY)
  } catch (error) {
    console.error("Error getting auth token:", error)
    return null
  }
}

//* Eliminar authToken
export const removeAuthToken = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY)
    await AsyncStorage.removeItem(SESSION_KEY)
  } catch (error) {
    console.error("Error removing auth token:", error)
  }
}

//* Verificar si hay una sesión activa
export const checkSession = async (): Promise<boolean> => {
  try {
    const session = await AsyncStorage.getItem(SESSION_KEY)
    return session === "true"
  } catch (error) {
    console.error("Error checking session:", error)
    return false
  }
}


import { supabase } from "../lib/supabase"
import { getAuthToken, setAuthToken, removeAuthToken } from "./storage"

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

//* Funcion logeo
export const signIn = async (email: string, password: string): Promise<boolean> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  // no funciona el signin
  if (error || !data.session) {
    console.error("Error signing in: ", error)
    return false
  }
  // funciona el sign in
  await setAuthToken(data.session.access_token) //Guardamos el token
  return true
}

//* Funcion registro
export const signUp = async (email: string, password: string): Promise<boolean> => {
  console.log("Iniciando signUp en auth.ts")
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    console.error("Error de Supabase en signUp:", error)
    return false
  }

  if (data.user) {
    console.log("Registro exitoso en auth, creando entrada en tabla profiles")

    // Crear entrada en la tabla profiles
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email: data.user.email,
      username: data.user.email?.split("@")[0] || "user",
      is_active: true,
      is_verified: false,
      subscription_type: "free",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error("Error al crear perfil:", profileError)
      return false
    }

    if (data.session) {
      console.log("Sesión creada, guardando token")
      await setAuthToken(data.session.access_token)
    } else {
      console.log("Esperando confirmación de email")
    }

    return true
  }

  console.log("Situación inesperada en el registro")
  return false
}

//* Deslogueo
export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut() //Cerramos sesión en supabase
  await removeAuthToken() //Eliminamos el token
}


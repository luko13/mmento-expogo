// services/authService.ts - VERSIÓN MEJORADA
import { supabase } from '../lib/supabase';
import { CryptoService } from '../utils/cryptoService';

export class AuthService {
  private static instance: AuthService;
  private cryptoService = CryptoService.getInstance();

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async signUp(email: string, password: string, username?: string) {
    try {
      console.log("🔐 Iniciando registro con cifrado...");
      
      // Validar parámetros
      if (!email || !password) {
        throw new Error("Email y contraseña son requeridos");
      }

      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }

      // Test crypto service ANTES de hacer auth
      const cryptoWorking = await this.cryptoService.testCryptoService();
      if (!cryptoWorking) {
        console.warn("⚠️ Crypto service no funciona correctamente, continuando sin cifrado...");
      }
      
      console.log("📧 Creando cuenta en Supabase...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username || email.split('@')[0] }
        }
      });

      if (authError) {
        console.error("❌ Error en signUp:", authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('No se recibieron datos del usuario');
      }

      console.log("✅ Usuario creado:", authData.user.id);

      // Solo generar claves si crypto funciona
      if (cryptoWorking) {
        try {
          console.log("🔑 Generando claves de cifrado...");
          const keyPair = await this.cryptoService.generateKeyPairWithCloudBackup(
            authData.user.id,
            password
          );
          console.log("✅ Claves generadas y guardadas");
        } catch (cryptoError) {
          console.warn("⚠️ Error generando claves, pero el usuario fue creado:", cryptoError);
          // No fallar el registro por esto
        }
      }

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('❌ Enhanced sign up error:', error);
      
      // Mejorar mensajes de error
      if (error instanceof Error) {
        if (error.message.includes('already_registered')) {
          throw new Error('Este email ya está registrado');
        }
        if (error.message.includes('invalid_email')) {
          throw new Error('El email no es válido');
        }
        if (error.message.includes('weak_password')) {
          throw new Error('La contraseña es muy débil');
        }
      }
      
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    try {
      console.log("🔐 Iniciando login con cifrado...");
      
      // Validar parámetros
      if (!email || !password) {
        throw new Error("Email y contraseña son requeridos");
      }

      // Test crypto service
      const cryptoWorking = await this.cryptoService.testCryptoService();
      if (!cryptoWorking) {
        console.warn("⚠️ Crypto service no funciona, continuando con login básico...");
      }
      
      console.log("🔑 Autenticando en Supabase...");
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error("❌ Error en signIn:", authError);
        
        // Mejorar mensajes de error
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Email o contraseña incorrectos');
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Debes confirmar tu email antes de iniciar sesión');
        }
        if (authError.message.includes('Too many requests')) {
          throw new Error('Demasiados intentos. Espera unos minutos e inténtalo de nuevo');
        }
        
        throw authError;
      }
      
      if (!authData.user || !authData.session) {
        throw new Error('Credenciales inválidas');
      }

      console.log("✅ Usuario autenticado:", authData.user.id);

      // Solo intentar recuperar claves si crypto funciona
      if (cryptoWorking) {
        try {
          console.log("🔄 Intentando recuperar claves de la nube...");
          const keyPair = await this.cryptoService.initializeFromCloud(
            authData.user.id,
            password
          );

          if (!keyPair) {
            console.log("🆕 No hay claves en la nube, generando nuevas...");
            await this.cryptoService.generateKeyPairWithCloudBackup(
              authData.user.id,
              password
            );
            console.log("✅ Nuevas claves generadas");
          } else {
            console.log("✅ Claves recuperadas de la nube");
          }
        } catch (cryptoError) {
          console.warn("⚠️ Error con claves de cifrado, pero login exitoso:", cryptoError);
          // No fallar el login por esto
        }
      }

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('❌ Enhanced sign in error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      console.log("🚪 Cerrando sesión...");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        try {
          await this.cryptoService.clearLocalKeys(user.id);
          console.log("🗑️ Claves locales limpiadas");
        } catch (error) {
          console.warn("⚠️ Error limpiando claves locales:", error);
          // No fallar el logout por esto
        }
      }
      
      await supabase.auth.signOut();
      console.log("✅ Sesión cerrada");
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  }

  /**
   * Verificar si el usuario tiene cifrado configurado
   */
  async hasEncryptionSetup(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('public_key, encrypted_private_key')
        .eq('id', userId)
        .single();

      return !!(data?.public_key && data?.encrypted_private_key);
    } catch (error) {
      console.error('Error verificando cifrado:', error);
      return false;
    }
  }

  /**
   * Configurar cifrado para usuario existente
   */
  async setupEncryptionForExistingUser(userId: string, password: string): Promise<boolean> {
    try {
      console.log("🔧 Configurando cifrado para usuario existente...");
      
      const cryptoWorking = await this.cryptoService.testCryptoService();
      if (!cryptoWorking) {
        throw new Error("El servicio de cifrado no está funcionando");
      }

      await this.cryptoService.generateKeyPairWithCloudBackup(userId, password);
      console.log("✅ Cifrado configurado");
      return true;
    } catch (error) {
      console.error("❌ Error configurando cifrado:", error);
      return false;
    }
  }

  /**
   * Test de conexión con Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch (error) {
      console.error('Error testing connection:', error);
      return false;
    }
  }
}
// services/authService.ts
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
      
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username || email.split('@')[0] }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user data returned');

      

      // Generar claves usando la contraseña del login
      const keyPair = await this.cryptoService.generateKeyPairWithCloudBackup(
        authData.user.id,
        password
      );

      

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('Enhanced sign up error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    try {
      
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!authData.user || !authData.session) throw new Error('Invalid credentials');

      

      // Intentar recuperar claves de la nube
      const keyPair = await this.cryptoService.initializeFromCloud(
        authData.user.id,
        password
      );

      if (!keyPair) {
        
        await this.cryptoService.generateKeyPairWithCloudBackup(
          authData.user.id,
          password
        );
      } else {
        
      }

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('Enhanced sign in error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await this.cryptoService.clearLocalKeys(user.id);
      }
      
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }
}
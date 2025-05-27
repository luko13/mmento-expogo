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

  /**
   * Enhanced sign up with automatic encryption setup
   */
  async signUp(email: string, password: string, username?: string) {
    try {
      console.log('AuthService: Starting enhanced sign up');
      
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username || email.split('@')[0] }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user data returned');

      console.log('AuthService: User created, generating encryption keys');

      // 2. Generate encryption keys using the login password
      const keyPair = await this.cryptoService.generateKeyPairWithCloudBackup(
        authData.user.id,
        password
      );

      console.log('AuthService: Keys generated, updating profile');

      // 3. Create/update profile with encryption data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: authData.user.email,
          username: username || authData.user.email?.split('@')[0] || 'user',
          public_key: keyPair.publicKey,
          encryption_initialized_at: new Date().toISOString(),
          is_active: true,
          is_verified: false,
          subscription_type: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
        // Don't throw - profile might already exist
      }

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('Enhanced sign up error:', error);
      throw error;
    }
  }

  /**
   * Enhanced sign in with automatic encryption initialization
   */
  async signIn(email: string, password: string) {
    try {
      console.log('AuthService: Starting enhanced sign in');
      
      // 1. Sign in user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!authData.user || !authData.session) throw new Error('Invalid credentials');

      console.log('AuthService: User authenticated, initializing encryption');

      // 2. Try to initialize encryption from cloud
      const keyPair = await this.cryptoService.initializeFromCloud(
        authData.user.id,
        password
      );

      if (!keyPair) {
        console.log('AuthService: No existing keys found, checking if this is a legacy user');
        
        // Check if user has public key but no encrypted private key (legacy user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('public_key, encrypted_private_key')
          .eq('id', authData.user.id)
          .single();

        if (profile?.public_key && !profile.encrypted_private_key) {
          console.log('AuthService: Legacy user detected, need to migrate keys');
          // This is a legacy user who needs to set up cloud backup
          // We'll handle this in the app by prompting them to enable encryption backup
        } else if (!profile?.public_key) {
          console.log('AuthService: No encryption setup found, generating new keys');
          // New user or user without encryption - generate keys
          await this.cryptoService.generateKeyPairWithCloudBackup(
            authData.user.id,
            password
          );
        }
      } else {
        console.log('AuthService: Encryption initialized successfully');
      }

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('Enhanced sign in error:', error);
      throw error;
    }
  }

  /**
   * Sign out and clear encryption data
   */
  async signOut() {
    try {
      await supabase.auth.signOut();
      // Encryption keys will be cleared by the useEncryption hook
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }
}
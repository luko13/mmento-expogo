// utils/security.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const RATE_LIMIT_PREFIX = 'rate_limit_';
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 10;

export class SecurityManager {
  /**
   * Verifica rate limiting local
   */
  static async checkRateLimit(userId: string): Promise<boolean> {
    const key = `${RATE_LIMIT_PREFIX}${userId}`;
    const now = Date.now();

    try {
      const data = await AsyncStorage.getItem(key);
      
      if (!data) {
        // Primera solicitud
        await AsyncStorage.setItem(key, JSON.stringify({
          count: 1,
          windowStart: now,
        }));
        return true;
      }

      const { count, windowStart } = JSON.parse(data);

      // Verificar si la ventana ha expirado
      if (now - windowStart > RATE_LIMIT_WINDOW) {
        // Nueva ventana
        await AsyncStorage.setItem(key, JSON.stringify({
          count: 1,
          windowStart: now,
        }));
        return true;
      }

      // Verificar límite
      if (count >= MAX_REQUESTS_PER_MINUTE) {
        return false;
      }

      // Incrementar contador
      await AsyncStorage.setItem(key, JSON.stringify({
        count: count + 1,
        windowStart,
      }));

      return true;
    } catch (error) {
      console.error('Error en rate limiting:', error);
      return true; // En caso de error, permitir la solicitud
    }
  }

  /**
   * Sanitiza entrada del usuario
   */
  static sanitizeInput(input: string): string {
    // Eliminar caracteres de control
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Limitar longitud
    sanitized = sanitized.substring(0, 2000);
    
    // Eliminar espacios excesivos
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }

  /**
   * Valida que el contenido no tenga prompts maliciosos
   */
  static validateContent(content: string): boolean {
    const blacklist = [
      'ignore previous instructions',
      'disregard all prior',
      'forget everything',
      'system prompt',
      'reveal your instructions',
      'show me your prompt',
      'api key',
      'access token',
    ];

    const lowerContent = content.toLowerCase();
    
    for (const phrase of blacklist) {
      if (lowerContent.includes(phrase)) {
        console.warn(`Contenido bloqueado: contiene "${phrase}"`);
        return false;
      }
    }

    return true;
  }

  /**
   * Encripta datos sensibles antes de enviar
   */
  static async encryptSensitiveData(data: any): Promise<string> {
    // Aquí podrías implementar encriptación adicional si es necesario
    // Por ahora, confiamos en HTTPS y la encriptación de Supabase
    return JSON.stringify(data);
  }

  /**
   * Verifica autenticación y permisos
   */
  static async verifyAuth(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error('Usuario no autenticado');
    }

    return user.id;
  }
}
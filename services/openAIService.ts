// services/openAIService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import pako from 'pako';

// Cache configuration
const CACHE_PREFIX = 'openai_cache_';
const CACHE_TTL = Number(process.env.CACHE_TTL_SECONDS) || 86400000; // 24 horas

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useCache?: boolean;
}

class OpenAIService {
  private static instance: OpenAIService;
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  private constructor() {
    // Obtener API key del .env
    this.apiKey = process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key no configurada');
    }
  }

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * Genera una clave de cache única para la consulta
   */
  private generateCacheKey(messages: ChatMessage[], options: ChatCompletionOptions): string {
    const content = JSON.stringify({ messages, options });
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${CACHE_PREFIX}${Math.abs(hash)}`;
  }

  /**
   * Obtiene respuesta del cache si existe
   */
  private async getFromCache(key: string): Promise<string | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // Verificar si el cache ha expirado
      if (Date.now() - timestamp > CACHE_TTL) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      // Descomprimir datos
      const compressed = new Uint8Array(Buffer.from(data, 'base64'));
      const decompressed = pako.inflate(compressed, { to: 'string' });
      
      return decompressed;
    } catch (error) {
      console.error('Error leyendo cache:', error);
      return null;
    }
  }

  /**
   * Guarda respuesta en cache
   */
  private async saveToCache(key: string, value: string): Promise<void> {
    try {
      // Comprimir datos
      const compressed = pako.deflate(value);
      const base64 = Buffer.from(compressed).toString('base64');

      const cacheData = {
        data: base64,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error guardando cache:', error);
    }
  }

  /**
   * Limpia cache antiguo
   */
  async clearOldCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp > CACHE_TTL) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error limpiando cache:', error);
    }
  }

  /**
   * Envía mensaje al chat completion API
   */
  async sendChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<{ content: string; tokensUsed: number; model: string }> {
    const {
      model = process.env.OPENAI_MODEL_PRIMARY || 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = Number(process.env.MAX_TOKENS_PER_QUERY) || 2000,
      useCache = true,
    } = options;

    // Verificar cache si está habilitado
    if (useCache) {
      const cacheKey = this.generateCacheKey(messages, options);
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        console.log('Respuesta obtenida del cache');
        return {
          content: cached,
          tokensUsed: 0, // No consume tokens del cache
          model: model + ' (cached)',
        };
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(process.env.OPENAI_ORG_ID ? { 'OpenAI-Organization': process.env.OPENAI_ORG_ID } : {})
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Error ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || 0;

      // Guardar en cache si está habilitado
      if (useCache && content) {
        const cacheKey = this.generateCacheKey(messages, options);
        await this.saveToCache(cacheKey, content);
      }

      return {
        content,
        tokensUsed,
        model,
      };
    } catch (error: any) {
      console.error('Error en OpenAI API:', error);
      
      // Manejar errores específicos
      if (error.message?.includes('429')) {
        throw new Error('Límite de rate excedido. Por favor, intenta más tarde.');
      } else if (error.message?.includes('401')) {
        throw new Error('API key inválida');
      } else if (error.message?.includes('503')) {
        throw new Error('El servicio de OpenAI está temporalmente no disponible');
      }
      
      throw new Error(error.message || 'Error al procesar tu solicitud');
    }
  }

  /**
   * Transcribe audio usando Whisper
   */
  async transcribeAudio(audioPath: string): Promise<string> {
    try {
      const formData = new FormData();
      
      // Leer archivo de audio
      const audioFile = {
        uri: audioPath,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any;
      
      formData.append('file', audioFile);
      formData.append('model', process.env.OPENAI_MODEL_WHISPER || 'whisper-1');
      formData.append('language', 'es'); // Español

      const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error transcribiendo audio:', error);
      throw new Error('No se pudo transcribir el audio');
    }
  }

  /**
   * Selecciona el modelo óptimo basado en la complejidad
   */
  selectOptimalModel(messageLength: number, conversationLength: number): string {
    // Usar GPT-3.5 para consultas simples y cortas
    if (messageLength < 100 && conversationLength < 5) {
      return process.env.OPENAI_MODEL_SECONDARY || 'gpt-3.5-turbo';
    }
    
    // Usar GPT-4 mini para consultas normales
    return process.env.OPENAI_MODEL_PRIMARY || 'gpt-4o-mini';
  }
}

export default OpenAIService;
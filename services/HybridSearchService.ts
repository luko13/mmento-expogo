// services/HybridSearchService.ts
import { supabase } from "../lib/supabase";
import type { SearchFilters } from "../components/home/CompactSearchBar";
import type { LocalTrick } from "./LocalDataService";

/**
 * Servicio de búsqueda híbrida
 * - Para < 500 trucos: búsqueda en cliente (JavaScript)
 * - Para >= 500 trucos: búsqueda en servidor (Supabase con índices)
 */

const HYBRID_THRESHOLD = 1; // Umbral para cambiar a búsqueda en servidor

export class HybridSearchService {
  /**
   * Determina si debe usar búsqueda en servidor basado en cantidad de datos
   */
  static shouldUseServerSearch(tricksCount: number): boolean {
    return tricksCount >= HYBRID_THRESHOLD;
  }

  /**
   * Búsqueda en servidor usando Supabase con índices optimizados
   */
  static async searchOnServer(
    userId: string,
    query: string,
    filters?: SearchFilters
  ): Promise<LocalTrick[]> {
    console.log('[HybridSearch] Using SERVER search');

    try {
      let supabaseQuery = supabase
        .from("magic_tricks")
        .select(`
          *,
          trick_categories!inner(category_id),
          trick_tags(tag_id),
          user_favorites(id)
        `)
        .eq("user_id", userId);

      // Filtro de texto usando índice GIN (full-text search)
      // OPTIMIZADO: Usa columna 'search_vector' pre-calculada con índice GIN
      // MULTI-IDIOMA: Usa configuración 'simple' que funciona con español, inglés, y otros idiomas
      // Requiere: columna search_vector + índice GIN + trigger (ver FTS_MULTILANGUAGE_MIGRATION.sql)
      if (query.trim()) {
        // Sanitizar query para prevenir SQL injection
        const sanitizedQuery = query.trim().replace(/'/g, "''");

        // Usar columna search_vector pre-calculada + índice GIN (ULTRA RÁPIDO)
        // Nota: Usamos 'simple' en lugar de 'spanish' para soporte multi-idioma
        // websearch_to_tsquery permite sintaxis tipo Google: "carta OR mazo", "carta -baraja"
        supabaseQuery = supabaseQuery.filter(
          'search_vector',
          'fts',
          `websearch_to_tsquery('simple', '${sanitizedQuery}')`
        );
      }

      // Filtro de categorías
      if (filters?.categories && filters.categories.length > 0) {
        supabaseQuery = supabaseQuery.in(
          'trick_categories.category_id',
          filters.categories
        );
      }

      // Filtro de dificultad
      if (filters?.difficulties && filters.difficulties.length > 0) {
        supabaseQuery = supabaseQuery.in('difficulty', filters.difficulties);
      }

      // Filtro de duración (min - max)
      if (filters?.durations) {
        const { min, max } = filters.durations;
        if (min !== undefined) {
          supabaseQuery = supabaseQuery.gte('duration', min);
        }
        if (max !== undefined) {
          supabaseQuery = supabaseQuery.lte('duration', max);
        }
      }

      // Filtro de reset time (min - max)
      if (filters?.resetTimes) {
        const { min, max } = filters.resetTimes;
        if (min !== undefined) {
          supabaseQuery = supabaseQuery.gte('reset', min);
        }
        if (max !== undefined) {
          supabaseQuery = supabaseQuery.lte('reset', max);
        }
      }

      // Filtro de ángulos (JSONB contains)
      if (filters?.angles && filters.angles.length > 0) {
        // Buscar tricks que contengan al menos uno de los ángulos seleccionados
        const anglesConditions = filters.angles.map(angle =>
          `angles @> '["${angle}"]'`
        );
        supabaseQuery = supabaseQuery.or(anglesConditions.join(','));
      }

      // Ordenamiento
      if (filters?.sortOrder === "last") {
        supabaseQuery = supabaseQuery.order('created_at', { ascending: true });
      } else {
        supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        console.error('[HybridSearch] Server search error:', error);
        throw error;
      }

      // Transformar a formato LocalTrick
      return this.transformToLocalTricks(data || []);

    } catch (error) {
      console.error('[HybridSearch] Server search failed:', error);
      throw error;
    }
  }

  /**
   * Transforma resultados de Supabase a formato LocalTrick
   */
  private static transformToLocalTricks(data: any[]): LocalTrick[] {
    return data.map(trick => ({
      id: trick.id,
      title: trick.title || '',
      effect: trick.effect || '',
      secret: trick.secret || '',
      duration: trick.duration,
      reset: trick.reset,
      difficulty: trick.difficulty,
      angles: Array.isArray(trick.angles) ? trick.angles : [],
      notes: trick.notes || '',
      photo_url: trick.photo_url,
      effect_video_url: trick.effect_video_url,
      secret_video_url: trick.secret_video_url,
      is_public: trick.is_public || false,
      status: trick.status || 'draft',
      created_at: trick.created_at,
      updated_at: trick.updated_at,
      user_id: trick.user_id,
      category_ids: trick.trick_categories?.map((tc: any) => tc.category_id) || [],
      tag_ids: trick.trick_tags?.map((tt: any) => tt.tag_id) || [],
      is_favorite: trick.user_favorites?.length > 0,
      photos: [], // Se cargan por separado si es necesario
    }));
  }

  /**
   * Búsqueda optimizada que elige automáticamente entre cliente y servidor
   */
  static async hybridSearch(
    userId: string,
    allTricks: LocalTrick[],
    query: string,
    filters?: SearchFilters
  ): Promise<{ tricks: LocalTrick[], usedServer: boolean }> {
    const tricksCount = allTricks.length;
    const useServer = this.shouldUseServerSearch(tricksCount);

    if (useServer) {
      // Búsqueda en servidor
      const tricks = await this.searchOnServer(userId, query, filters);
      return { tricks, usedServer: true };
    } else {
      // Búsqueda en cliente (se hace en buildSections)
      return { tricks: allTricks, usedServer: false };
    }
  }
}

export const hybridSearchService = HybridSearchService;

// services/chatService.ts
import { supabase } from "../lib/supabase";
import OpenAIService, { ChatMessage } from "./openAIService";
import {
  getMagicTrickPrompt,
  getSystemInstructions,
  UserContext,
} from "../utils/prompts";
import { v4 as uuidv4 } from "uuid";

export interface Conversation {
  id: string;
  title: string;
  folder_id?: string;
  is_pinned: boolean;
  is_archived: boolean;
  message_count: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  audio_url?: string;
  tokens_used: number;
  model_used: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

// Interface actualizada para incluir información de desarrollador
export interface UserLimits {
  can_query: boolean;
  queries_today: number;
  queries_limit: number;
  is_plus: boolean;
  is_developer?: boolean; // Nuevo campo
}

class ChatService {
  private static instance: ChatService;
  private openAI: OpenAIService;

  private constructor() {
    this.openAI = OpenAIService.getInstance();
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Verifica si el usuario puede hacer una consulta
   */
  async checkUserLimit(userId: string): Promise<UserLimits> {
    const { data, error } = await supabase.rpc("check_user_ai_limit", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error verificando límite:", error);
      throw new Error("No se pudo verificar tu límite de consultas");
    }

    // Los datos ya vienen con el formato correcto de la BD
    const result = data[0];
    console.log("Límites del usuario:", result);

    // Detectar si es desarrollador por el límite muy alto
    const isDeveloper = result.queries_limit > 1000;

    return {
      can_query: result.can_query,
      queries_today: result.queries_today,
      queries_limit: result.queries_limit,
      is_plus: result.is_plus,
      is_developer: isDeveloper,
    };
  }

  /**
   * Incrementa el contador de uso
   */
  async incrementUsage(userId: string, tokensUsed: number): Promise<void> {
    const { error } = await supabase.rpc("increment_ai_usage", {
      p_user_id: userId,
      p_tokens: tokensUsed,
    });

    if (error) {
      console.error("Error actualizando uso:", error);
    }
  }

  /**
   * Crea una nueva conversación
   */
  async createConversation(
    userId: string,
    title: string
  ): Promise<Conversation> {
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: userId,
        title,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando conversación:", error);
      throw new Error("No se pudo crear la conversación");
    }

    return data;
  }

  /**
   * Obtiene todas las conversaciones del usuario
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error obteniendo conversaciones:", error);
      throw new Error("No se pudieron cargar las conversaciones");
    }

    return data || [];
  }

  /**
   * Busca conversaciones por título
   */
  async searchConversations(
    userId: string,
    query: string
  ): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .ilike("title", `%${query}%`)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error buscando conversaciones:", error);
      throw new Error("Error en la búsqueda");
    }

    return data || [];
  }

  /**
   * Obtiene mensajes de una conversación
   */
  async getMessages(
    conversationId: string,
    limit: number = 50
  ): Promise<Message[]> {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error obteniendo mensajes:", error);
      throw new Error("No se pudieron cargar los mensajes");
    }

    return data || [];
  }

  /**
   * Obtiene el contexto completo del usuario incluyendo todos sus trucos
   */
  private async getUserContext(userId: string): Promise<UserContext> {
    console.log("🔍 getUserContext iniciado para userId:", userId);

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, subscription_type")
      .eq("id", userId)
      .single();

    console.log("👤 Perfil obtenido:", profile);
    if (profileError)
      console.error("❌ Error obteniendo perfil:", profileError);

    // Obtener TODOS los trucos del usuario con sus relaciones
    const { data: tricks, error: tricksError } = await supabase
      .from("magic_tricks")
      .select(
        `
        id,
        title,
        effect,
        secret,
        duration,
        difficulty,
        reset,
        special_materials,
        angles,
        is_public,
        created_at,
        trick_categories (
          category_id
        ),
        trick_tags (
          tag_id
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    console.log("🎩 Trucos obtenidos:", tricks?.length || 0);
    if (tricksError) console.error("❌ Error obteniendo trucos:", tricksError);

    // Log de los primeros 3 trucos para ver la estructura
    if (tricks && tricks.length > 0) {
      console.log("📋 Primeros 3 trucos:", tricks.slice(0, 3));
    }

    // Obtener técnicas
    const { data: techniques, error: techniquesError } = await supabase
      .from("techniques")
      .select("id, name, description, difficulty")
      .eq("user_id", userId);

    console.log("🔧 Técnicas obtenidas:", techniques?.length || 0);
    if (techniquesError)
      console.error("❌ Error obteniendo técnicas:", techniquesError);

    // Obtener todas las categorías (predefinidas y del usuario)
    const { data: predefinedCategories, error: predCatError } = await supabase
      .from("predefined_categories")
      .select("id, name");

    console.log(
      "📁 Categorías predefinidas:",
      predefinedCategories?.length || 0
    );
    if (predCatError)
      console.error(
        "❌ Error obteniendo categorías predefinidas:",
        predCatError
      );

    const { data: userCategories, error: userCatError } = await supabase
      .from("user_categories")
      .select("id, name")
      .eq("user_id", userId);

    console.log("📂 Categorías del usuario:", userCategories?.length || 0);
    if (userCatError)
      console.error(
        "❌ Error obteniendo categorías del usuario:",
        userCatError
      );

    // Obtener todos los tags
    const { data: tags, error: tagsError } = await supabase
      .from("predefined_tags")
      .select("id, name")
      .order("usage_count", { ascending: false });

    console.log("🏷️ Tags obtenidos:", tags?.length || 0);
    if (tagsError) console.error("❌ Error obteniendo tags:", tagsError);

    // Formatear trucos con categorías y tags
    const formattedTricks =
      tricks?.map((trick) => {
        // Obtener nombres de categorías
        const categoryIds =
          trick.trick_categories?.map((tc: any) => tc.category_id) || [];
        const categoryNames: string[] = [];

        // Buscar nombres en ambas tablas de categorías
        categoryIds.forEach((catId: string) => {
          const predefinedCat = predefinedCategories?.find(
            (c) => c.id === catId
          );
          const userCat = userCategories?.find((c) => c.id === catId);

          if (predefinedCat) {
            categoryNames.push(predefinedCat.name);
          } else if (userCat) {
            categoryNames.push(userCat.name);
          }
        });

        // Obtener nombres de tags
        const tagIds = trick.trick_tags?.map((tt: any) => tt.tag_id) || [];
        const tagNames = tagIds
          .map((tagId: string) => {
            const tag = tags?.find((t) => t.id === tagId);
            return tag?.name;
          })
          .filter(Boolean);

        return {
          ...trick,
          categories: categoryNames,
          tags: tagNames,
          angles: Array.isArray(trick.angles) ? trick.angles : [],
        };
      }) || [];

    const context = {
      username: profile?.username || "",
      isPlus:
        profile?.subscription_type === "plus" ||
        profile?.subscription_type === "developer",
      tricksCount: formattedTricks.length,
      tricks: formattedTricks,
      categories: [...(predefinedCategories || []), ...(userCategories || [])],
      tags: tags || [],
    };

    console.log("✅ Contexto final construido:", {
      username: context.username,
      isPlus: context.isPlus,
      tricksCount: context.tricksCount,
      categoriesCount: context.categories.length,
      tagsCount: context.tags.length,
    });

    // Log del prompt que se enviará
    console.log(
      "📝 Primeras líneas del prompt:",
      getMagicTrickPrompt(context).substring(0, 500)
    );

    return context;
  }

  /**
   * Envía un mensaje y obtiene respuesta
   */
  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
    audioUrl?: string
  ): Promise<Message> {
    // Verificar límites
    const limits = await this.checkUserLimit(userId);
    console.log("Verificando límites antes de enviar:", limits);

    if (!limits.can_query) {
      const errorKey = limits.is_plus
        ? "dailyLimitReachedPlus"
        : "dailyLimitReached";
      throw new Error(errorKey);
    }

    // Verificar si la conversación está archivada
    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("message_count, is_archived")
      .eq("id", conversationId)
      .single();

    if (conversation?.is_archived) {
      throw new Error("conversationArchived");
    }

    if (conversation?.message_count >= 100) {
      // Archivar automáticamente
      await supabase
        .from("ai_conversations")
        .update({ is_archived: true })
        .eq("id", conversationId);

      throw new Error("conversationLimitReached");
    }

    // Guardar mensaje del usuario
    const { data: userMessage, error: userError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        content,
        audio_url: audioUrl,
      })
      .select()
      .single();

    if (userError) {
      console.error("Error guardando mensaje:", userError);
      throw new Error("No se pudo enviar el mensaje");
    }

    try {
      // Obtener historial de conversación (últimos 20 mensajes para contexto)
      const recentMessages = await this.getMessages(conversationId, 20);

      // Obtener contexto COMPLETO del usuario
      console.log("Obteniendo contexto del usuario...");
      const userContext = await this.getUserContext(userId);
      console.log(
        `Contexto cargado: ${userContext.tricksCount} trucos encontrados`
      );

      // Preparar mensajes para OpenAI
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: getSystemInstructions(),
        },
        {
          role: "system",
          content: getMagicTrickPrompt(userContext),
        },
        ...recentMessages.slice(0, -1).map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        {
          role: "user",
          content,
        },
      ];

      // Seleccionar modelo óptimo
      const model = this.openAI.selectOptimalModel(
        content.length,
        recentMessages.length
      );

      // Obtener respuesta de OpenAI
      const response = await this.openAI.sendChatCompletion(messages, {
        model,
        temperature: 0.7,
        maxTokens: 2000,
        useCache: false, // No cachear para tener siempre datos actualizados
      });

      // Verificar si la respuesta contiene una acción de guardar truco
      if (response.content.includes("GUARDAR_TRUCO")) {
        // Extraer el JSON del mensaje
        const jsonMatch = response.content.match(
          /GUARDAR_TRUCO\s*({[^}]+}(?:\s*})?)/
        );

        if (jsonMatch) {
          try {
            const trickData = JSON.parse(jsonMatch[1]);

            // Registrar el truco
            const result = await this.registerTrickFromChat(
              userId,
              trickData.datos,
              conversationId
            );

            if (result.success) {
              // Modificar la respuesta para incluir el éxito
              response.content = `✅ ¡Truco registrado exitosamente!

**${trickData.datos.title}**
- Categoría: ${trickData.datos.categoryName}
- Efecto: ${trickData.datos.effect || "No especificado"}
- Dificultad: ${trickData.datos.difficulty || "No especificada"}/10
- Duración: ${
                trickData.datos.duration
                  ? Math.floor(trickData.datos.duration / 60) + " min"
                  : "No especificada"
              }
- Reset: ${trickData.datos.reset || "No especificado"} segundos
- Tags: ${trickData.datos.tagNames?.join(", ") || "Sin tags"}

Tu nuevo truco ya está disponible en tu biblioteca. ¡Que disfrutes practicándolo!`;
            } else {
              response.content = `❌ Error al registrar el truco: ${
                result.error || "Error desconocido"
              }. Por favor, intenta de nuevo.`;
            }
          } catch (parseError) {
            console.error("Error parseando datos del truco:", parseError);
            response.content =
              "❌ Error al procesar los datos del truco. Por favor, intenta de nuevo.";
          }
        }
      }

      // Verificar si necesita crear una categoría
      if (response.content.includes("CREAR_CATEGORIA")) {
        const jsonMatch = response.content.match(
          /CREAR_CATEGORIA\s*({[\s\S]*?})/
        );
        if (jsonMatch) {
          try {
            const categoryData = JSON.parse(jsonMatch[1]);
            const result = await this.createUserCategory(
              userId,
              categoryData.name,
              categoryData.description
            );

            if (result.success) {
              response.content = response.content.replace(
                /CREAR_CATEGORIA\s*{[\s\S]*?}/,
                `✅ Categoría "${categoryData.name}" creada exitosamente.`
              );
            }
          } catch (error) {
            console.error("Error creando categoría:", error);
          }
        }
      }

      // Verificar si necesita crear un tag
      // Verificar si necesita crear un tag con color
      if (response.content.includes("CREAR_TAG_CON_COLOR")) {
        const tagMatches = response.content.matchAll(
          /CREAR_TAG_CON_COLOR\s*({[^}]+})/g
        );
        const createdTags: { name: string; id: string }[] = [];

        for (const match of tagMatches) {
          try {
            const tagData = JSON.parse(match[1]);
            const result = await this.createUserTag(
              userId,
              tagData.name,
              tagData.color
            );

            if (result.success && result.tagId) {
              createdTags.push({ name: tagData.name, id: result.tagId });
              response.content = response.content.replace(
                match[0],
                `✅ Tag "${tagData.name}" creado exitosamente con el color seleccionado.`
              );
            }
          } catch (error) {
            console.error("Error creando tag:", error);
            response.content = response.content.replace(
              match[0],
              `❌ Error al crear el tag. Por favor, intenta de nuevo.`
            );
          }
        }
      }

      // Guardar respuesta del asistente
      const { data: assistantMessage, error: assistantError } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: "assistant",
          content: response.content,
          tokens_used: response.tokensUsed,
          model_used: response.model,
        })
        .select()
        .single();

      if (assistantError) {
        console.error("Error guardando respuesta:", assistantError);
        throw new Error("No se pudo guardar la respuesta");
      }

      // Actualizar contador de uso
      await this.incrementUsage(userId, response.tokensUsed);

      return assistantMessage;
    } catch (error) {
      console.error("Error procesando mensaje:", error);
      throw error;
    }
  }

  /**
   * Registra un nuevo truco mediante IA (Solo usuarios Plus)
   */
  async registerTrickFromChat(
    userId: string,
    trickData: any,
    conversationId: string
  ): Promise<{ success: boolean; trickId?: string; error?: string }> {
    try {
      // Verificar que sea usuario Plus o Developer
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_type")
        .eq("id", userId)
        .single();

      if (
        profile?.subscription_type !== "plus" &&
        profile?.subscription_type !== "developer"
      ) {
        return { success: false, error: "registerTrickPlusOnly" };
      }

      // Generar ID único para el truco
      const trickId = uuidv4();

      // Crear truco usando la función RPC
      const { error: createError } = await supabase.rpc("create_magic_trick", {
        p_trick_id: trickId,
        p_user_id: userId,
        p_title: trickData.title || "",
        p_effect: trickData.effect || "",
        p_secret: trickData.secret || "",
        p_duration: trickData.duration || null,
        p_angles: trickData.angles || [],
        p_notes: trickData.notes || "",
        p_special_materials: trickData.special_materials || [],
        p_is_public: false,
        p_status: "draft",
        p_price: null,
        p_photo_url: null,
        p_effect_video_url: null,
        p_secret_video_url: null,
        p_reset: trickData.reset || null,
        p_difficulty: trickData.difficulty || null,
      });

      if (createError) {
        console.error("Error creando truco:", createError);
        return { success: false, error: createError.message };
      }

      // Asociar categoría
      if (trickData.categoryId) {
        await supabase.from("trick_categories").insert({
          trick_id: trickId,
          category_id: trickData.categoryId,
          created_at: new Date().toISOString(),
        });
      }

      // Asociar tags
      if (trickData.tagIds && trickData.tagIds.length > 0) {
        const tagInserts = trickData.tagIds.map((tagId: string) => ({
          trick_id: trickId,
          tag_id: tagId,
          created_at: new Date().toISOString(),
        }));

        await supabase.from("trick_tags").insert(tagInserts);

        // Actualizar contador de uso de tags
        for (const tagId of trickData.tagIds) {
          await supabase.rpc("increment_tag_usage", { tag_id: tagId });
        }
      }

      return { success: true, trickId };
    } catch (error) {
      console.error("Error en registerTrickFromChat:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  /**
   * Crear nueva categoría de usuario
   */
  async createUserCategory(
    userId: string,
    name: string,
    description?: string
  ): Promise<{ success: boolean; categoryId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("user_categories")
        .insert({
          user_id: userId,
          name,
          description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, categoryId: data.id };
    } catch (error) {
      console.error("Error creando categoría:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  /**
   * Crear nuevo tag
   */
  async createUserTag(
    userId: string,
    name: string,
    color?: string
  ): Promise<{ success: boolean; tagId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("predefined_tags")
        .insert({
          user_id: userId,
          name,
          color: color || "#4CAF50", // Color por defecto si no se especifica
          usage_count: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, tagId: data.id };
    } catch (error) {
      console.error("Error creando tag:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  /**
   * Convertir usuario a desarrollador (función administrativa)
   */
  async convertToDeveloper(userId: string): Promise<void> {
    const { error } = await supabase.rpc("set_user_as_developer", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error convirtiendo a desarrollador:", error);
      throw new Error("No se pudo convertir al usuario en desarrollador");
    }
  }

  /**
   * Obtener lista de desarrolladores
   */
  async getDevelopers(): Promise<any[]> {
    const { data, error } = await supabase.from("developer_users").select("*");

    if (error) {
      console.error("Error obteniendo desarrolladores:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Crea o mueve conversación a carpeta
   */
  async moveToFolder(
    conversationId: string,
    folderId: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from("ai_conversations")
      .update({ folder_id: folderId })
      .eq("id", conversationId);

    if (error) {
      console.error("Error moviendo conversación:", error);
      throw new Error("No se pudo mover la conversación");
    }
  }

  /**
   * Fija/desfija una conversación
   */
  async togglePin(conversationId: string): Promise<void> {
    const { data: current } = await supabase
      .from("ai_conversations")
      .select("is_pinned")
      .eq("id", conversationId)
      .single();

    const { error } = await supabase
      .from("ai_conversations")
      .update({ is_pinned: !current?.is_pinned })
      .eq("id", conversationId);

    if (error) {
      console.error("Error cambiando pin:", error);
      throw new Error("No se pudo cambiar el estado de fijado");
    }
  }

  /**
   * Elimina una conversación
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      console.error("Error eliminando conversación:", error);
      throw new Error("No se pudo eliminar la conversación");
    }
  }

  /**
   * Crea una nueva carpeta
   */
  async createFolder(
    userId: string,
    name: string,
    color: string = "#10b981"
  ): Promise<Folder> {
    const { data, error } = await supabase
      .from("ai_folders")
      .insert({
        user_id: userId,
        name,
        color,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando carpeta:", error);
      throw new Error("No se pudo crear la carpeta");
    }

    return data;
  }

  /**
   * Obtiene todas las carpetas del usuario
   */
  async getFolders(userId: string): Promise<Folder[]> {
    const { data, error } = await supabase
      .from("ai_folders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error obteniendo carpetas:", error);
      throw new Error("No se pudieron cargar las carpetas");
    }

    return data || [];
  }
}

export default ChatService;

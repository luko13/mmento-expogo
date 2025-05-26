import { supabase } from "../lib/supabase"

// Type for category
export interface Category {
  id: string
  name: string
  description?: string
  user_id?: string
  created_at?: string
  updated_at?: string
}

// Type for trick
export interface Trick {
  id: string;
  user_id: string;
  title: string;
  effect: string;
  secret: string;
  duration: number | null;
  angles: any;
  notes: string;
  special_materials: string[];
  is_public: boolean;
  status: string;
  price: number | null;
  photo_url: string | null;
  effect_video_url: string | null;
  secret_video_url: string | null;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  created_at?: string;
  updated_at?: string;
  version: number;
  parent_trick_id: string | null;
  reset: number | null;
  difficulty: number | null;
  
  // Nuevo campo requerido
  is_encrypted: boolean;
}

// Type for technique
export interface Technique {
  id: string
  name: string
  description: string
  difficulty?: number | null
  status: string
  created_at: string
  user_id: string
  notes?: string
  angles?: any
  special_materials?: string[]
  image_url?: string | null
  video_url?: string | null
  is_public: boolean
  price?: number | null
  is_encrypted?: boolean
}

// Type for gimmick
export interface Gimmick {
  id: string
  name: string
  description?: string
  secret_description?: string
  difficulty?: string | null
  status: string
  created_at: string
  user_id: string
  notes?: string
  instructions?: string
  angles?: any
  reset_time?: number | null
  special_materials?: string[]
  image_url?: string | null
  video_url?: string | null
  craft_video_url?: string | null
  is_public: boolean
  price?: number | null
  is_encrypted?: boolean
}

// Get user categories
export async function getUserCategories(userId: string): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("user_categories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching user categories:", error)
    return []
  }
}

// Get predefined categories
export async function getPredefinedCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("predefined_categories")
      .select("*")
      .order("name", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching predefined categories:", error)
    return []
  }
}

// Create a new category
export async function createCategory(
  userId: string,
  name: string,
  description?: string,
): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from("user_categories")
      .insert({
        user_id: userId,
        name,
        description,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error creating category:", error)
    return null
  }
}

// Update a category
export async function updateCategory(
  categoryId: string,
  name: string,
  description?: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_categories")
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)

    if (error) throw error
    return true
  } catch (error) {
    console.error("Error updating category:", error)
    return false
  }
}

// Delete a category
export async function deleteCategory(categoryId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("user_categories").delete().eq("id", categoryId)

    if (error) throw error
    return true
  } catch (error) {
    console.error("Error deleting category:", error)
    return false
  }
}

// Get tricks by category
export async function getTricksByCategory(categoryId: string): Promise<Trick[]> {
  try {
    // First get all trick IDs for this category
    const { data: trickCategories, error: catError } = await supabase
      .from("trick_categories")
      .select("trick_id")
      .eq("category_id", categoryId)

    if (catError) throw catError

    if (!trickCategories || trickCategories.length === 0) return []

    // Then get all tricks with those IDs
    const trickIds = trickCategories.map((tc) => tc.trick_id)
    const { data: tricks, error: tricksError } = await supabase
      .from("magic_tricks")
      .select("*")
      .in("id", trickIds)
      .order("created_at", { ascending: false })

    if (tricksError) throw tricksError

    return tricks || []
  } catch (error) {
    console.error("Error fetching tricks by category:", error)
    return []
  }
}

// Get techniques by category
export async function getTechniquesByCategory(categoryId: string, userId: string): Promise<Technique[]> {
  try {
    // First get all technique IDs for this category
    const { data: techniqueCategories, error: catError } = await supabase
      .from("technique_categories")
      .select("technique_id")
      .eq("category_id", categoryId)

    if (catError) throw catError

    if (!techniqueCategories || techniqueCategories.length === 0) return []

    // Then get all techniques with those IDs
    const techniqueIds = techniqueCategories.map((tc) => tc.technique_id)
    const { data: techniques, error: techniquesError } = await supabase
      .from("techniques")
      .select("*")
      .in("id", techniqueIds)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (techniquesError) throw techniquesError

    return techniques || []
  } catch (error) {
    console.error("Error fetching techniques by category:", error)
    return []
  }
}

// Get gimmicks by category
export async function getGimmicksByCategory(categoryId: string, userId: string): Promise<Gimmick[]> {
  try {
    // First get all gimmick IDs for this category
    const { data: gimmickCategories, error: catError } = await supabase
      .from("gimmick_categories")
      .select("gimmick_id")
      .eq("category_id", categoryId)

    if (catError) throw catError

    if (!gimmickCategories || gimmickCategories.length === 0) return []

    // Then get all gimmicks with those IDs
    const gimmickIds = gimmickCategories.map((gc) => gc.gimmick_id)
    const { data: gimmicks, error: gimmicksError } = await supabase
      .from("gimmicks")
      .select("*")
      .in("id", gimmickIds)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (gimmicksError) throw gimmicksError

    return gimmicks || []
  } catch (error) {
    console.error("Error fetching gimmicks by category:", error)
    return []
  }
}

// Ensure user has default categories
export async function ensureDefaultCategories(userId: string): Promise<void> {
  try {
    // Check if user already has categories
    const { data: existingCategories, error: checkError } = await supabase
      .from("user_categories")
      .select("id")
      .eq("user_id", userId)

    if (checkError) throw checkError

    // If user already has categories, don't create defaults
    if (existingCategories && existingCategories.length > 0) return

    // Default categories to create
    const defaultCategories = [
      { name: "Close-up", description: "Magia de cerca" },
      { name: "Stage", description: "Magia de escenario" },
      { name: "Mentalism", description: "Mentalismo" },
      { name: "Card Magic", description: "Magia con cartas" },
      { name: "Coins", description: "Magia con monedas" },
    ]

    // Create default categories for the user
    const categoriesToCreate = defaultCategories.map((cat) => ({
      user_id: userId,
      name: cat.name,
      description: cat.description,
    }))

    const { error: insertError } = await supabase.from("user_categories").insert(categoriesToCreate)

    if (insertError) throw insertError
  } catch (error) {
    console.error("Error ensuring default categories:", error)
  }
}

// Get all items count by category (tricks, techniques, gimmicks)
export async function getCategoryItemsCount(categoryId: string, userId: string): Promise<number> {
  try {
    let totalCount = 0

    // Count tricks
    const { count: tricksCount, error: tricksError } = await supabase
      .from("trick_categories")
      .select("trick_id", { count: "exact", head: true })
      .eq("category_id", categoryId)

    if (!tricksError && tricksCount) totalCount += tricksCount

    // Count techniques
    const { count: techniquesCount, error: techniquesError } = await supabase
      .from("technique_categories")
      .select("technique_id", { count: "exact", head: true })
      .eq("category_id", categoryId)

    if (!techniquesError && techniquesCount) totalCount += techniquesCount

    // Count gimmicks
    const { count: gimmicksCount, error: gimmicksError } = await supabase
      .from("gimmick_categories")
      .select("gimmick_id", { count: "exact", head: true })
      .eq("category_id", categoryId)

    if (!gimmicksError && gimmicksCount) totalCount += gimmicksCount

    return totalCount
  } catch (error) {
    console.error("Error counting category items:", error)
    return 0
  }
}

// NEW OPTIMIZED FUNCTION - Get all user content in one go
export async function getAllUserContent(userId: string) {
  try {
    // Execute all queries in parallel
    const [categories, tricksResult, techniquesResult, gimmicksResult, sharedContentResult] = await Promise.all([
      getUserCategories(userId),
      
      // Get all tricks with their categories and tags
      supabase
        .from("magic_tricks")
        .select(`
          *,
          trick_categories(category_id),
          trick_tags(tag_id)
        `)
        .eq("user_id", userId),
      
      // Get all techniques with their categories and tags
      supabase
        .from("techniques")
        .select(`
          *,
          technique_categories!technique_categories_technique_id_fkey(category_id),
          technique_tags(tag_id)
        `)
        .eq("user_id", userId),
      
      // Get all gimmicks with their categories
      supabase
        .from("gimmicks")
        .select(`
          *,
          gimmick_categories!gimmick_categories_gimmick_id_fkey(category_id)
        `)
        .eq("user_id", userId),
      
      // Get shared content
      supabase
        .from("shared_content")
        .select(`
          *,
          profiles!shared_content_owner_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq("shared_with", userId)
    ]);
    return {
      categories: categories || [],
      tricks: tricksResult.data || [],
      techniques: techniquesResult.data || [],
      gimmicks: gimmicksResult.data || [],
      sharedContent: sharedContentResult.data || []
    };
  } catch (error) {
    console.error("Error fetching user content:", error);
    return {
      categories: [],
      tricks: [],
      techniques: [],
      gimmicks: [],
      sharedContent: []
    };
  }
}
import { supabase } from "../lib/supabase"

export interface Category {
  id: string
  name: string
  description?: string
  user_id?: string
  created_at?: string
  updated_at?: string
  count?: number // For UI display purposes
}

export interface TrickCategory {
  trick_id: string
  category_id: string
  created_at?: string
}

// Get all categories for a user
export const getUserCategories = async (userId: string): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("user_categories")
    .select("id, name, description, user_id, created_at, updated_at")
    .eq("user_id", userId)
    .order("name")

  if (error) {
    console.error("Error fetching user categories:", error)
    return []
  }

  // Get count of tricks for each category
  const categoriesWithCount = await Promise.all(
    data.map(async (category) => {
      const { count, error: countError } = await supabase
        .from("trick_categories")
        .select("*", { count: "exact", head: true })
        .eq("category_id", category.id)

      if (countError) {
        console.error("Error counting tricks for category:", countError)
        return { ...category, count: 0 }
      }

      return { ...category, count: count || 0 }
    }),
  )

  return categoriesWithCount
}

// Get predefined categories
export const getPredefinedCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("predefined_categories")
    .select("id, name, description, created_at")
    .order("name")

  if (error) {
    console.error("Error fetching predefined categories:", error)
    return []
  }

  return data
}

// Create a new category
export const createCategory = async (userId: string, name: string, description?: string): Promise<Category | null> => {
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
    .single()

  if (error) {
    console.error("Error creating category:", error)
    return null
  }

  return { ...data, count: 0 }
}

// Update a category
export const updateCategory = async (categoryId: string, name: string, description?: string): Promise<boolean> => {
  const { error } = await supabase
    .from("user_categories")
    .update({
      name,
      description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)

  if (error) {
    console.error("Error updating category:", error)
    return false
  }

  return true
}

// Delete a category
export const deleteCategory = async (categoryId: string): Promise<boolean> => {
  // First, remove all trick associations
  const { error: associationError } = await supabase.from("trick_categories").delete().eq("category_id", categoryId)

  if (associationError) {
    console.error("Error removing trick associations:", associationError)
    return false
  }

  // Then delete the category
  const { error } = await supabase.from("user_categories").delete().eq("id", categoryId)

  if (error) {
    console.error("Error deleting category:", error)
    return false
  }

  return true
}

// Get tricks by category
export const getTricksByCategory = async (categoryId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from("trick_categories")
    .select(`
      trick_id,
      magic_tricks(
        id, title, effect, difficulty, status, duration, created_at, photo_url
      )
    `)
    .eq("category_id", categoryId)

  if (error) {
    console.error("Error fetching tricks by category:", error)
    return []
  }

  // Transform the data to a more usable format
  return data.map((item) => item.magic_tricks)
}

// Associate a trick with a category
export const addTrickToCategory = async (trickId: string, categoryId: string): Promise<boolean> => {
  const { error } = await supabase.from("trick_categories").insert({
    trick_id: trickId,
    category_id: categoryId,
    created_at: new Date().toISOString(),
  })

  if (error) {
    // If it's a duplicate, that's okay
    if (error.code === "23505") {
      return true
    }
    console.error("Error adding trick to category:", error)
    return false
  }

  return true
}

// Remove a trick from a category
export const removeTrickFromCategory = async (trickId: string, categoryId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("trick_categories")
    .delete()
    .eq("trick_id", trickId)
    .eq("category_id", categoryId)

  if (error) {
    console.error("Error removing trick from category:", error)
    return false
  }

  return true
}

// Get all categories for a trick
// Get all categories for a trick
export const getCategoriesForTrick = async (trickId: string): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("trick_categories")
      .select(`
        category_id,
        user_categories(id, name, description, user_id, created_at, updated_at)
      `)
      .eq("trick_id", trickId)
  
    if (error) {
      console.error("Error fetching categories for trick:", error)
      return []
    }
  
    // Flatten the array of arrays into a single array of Category objects
    return data.flatMap((item) => {
      // If user_categories is an array, return it; otherwise, wrap it in an array
      const categories = Array.isArray(item.user_categories) 
        ? item.user_categories 
        : [item.user_categories];
      
      return categories as Category[];
    });
  }

// Ensure user has default categories
export const ensureDefaultCategories = async (userId: string): Promise<void> => {
  // Check if user already has categories
  const { data, error } = await supabase.from("user_categories").select("id").eq("user_id", userId).limit(1)

  if (error) {
    console.error("Error checking user categories:", error)
    return
  }

  // If user has no categories, create default ones
  if (data.length === 0) {
    const defaultCategories = [
      { name: "Card Magic", description: "Tricks involving playing cards" },
      { name: "Coin Magic", description: "Tricks involving coins" },
      { name: "Mentalism", description: "Mind reading and psychological illusions" },
      { name: "Close-up", description: "Magic performed up close" },
      { name: "Stage Magic", description: "Magic performed on stage" },
    ]

    for (const category of defaultCategories) {
      await createCategory(userId, category.name, category.description)
    }
  }
}


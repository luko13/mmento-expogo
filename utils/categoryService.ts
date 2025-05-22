import { supabase } from "../lib/supabase"

export interface Category {
  id: string
  name: string
  description?: string
  user_id?: string
  created_at?: string
  updated_at?: string
  count?: number
  type?: 'user' | 'predefined' // Add this line
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
/**
 * Obtener técnicas por categoría
 */
export const getTechniquesByCategory = async (categoryId: string) => {
  try {
    const { data, error } = await supabase
      .from("techniques")
      .select(`
        id,
        name,
        description,
        difficulty,
        status,
        created_at,
        image_url,
        video_url,
        is_public,
        user_id,
        technique_categories!inner(category_id)
      `)
      .eq("technique_categories.category_id", categoryId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching techniques by category:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getTechniquesByCategory:", error);
    return [];
  }
};

/**
 * Función para garantizar que el usuario tenga categorías por defecto para técnicas
 */
export const ensureDefaultTechniqueCategories = async (userId: string) => {
  try {
    // Verificar si ya tiene categorías de técnicas
    const existingCategories = await getUserCategories(userId);
    const hasTechniqueCategories = existingCategories.some(cat => 
      cat.name.toLowerCase().includes('técnica') || 
      cat.name.toLowerCase().includes('technique') ||
      cat.name.toLowerCase().includes('sleight')
    );

    if (!hasTechniqueCategories) {
      // Crear categorías por defecto para técnicas
      const defaultTechniqueCategories = [
        {
          name: "Sleight of Hand",
          description: "Manual dexterity and manipulation techniques"
        },
        {
          name: "Misdirection",
          description: "Techniques for directing audience attention"
        },
        {
          name: "Flourishes",
          description: "Ornamental moves and displays"
        }
      ];

      for (const category of defaultTechniqueCategories) {
        await createCategory(userId, category.name, category.description);
      }
    }
  } catch (error) {
    console.error("Error ensuring default technique categories:", error);
  }
};

/**
 * Obtener todas las técnicas del usuario con sus categorías
 */
export const getUserTechniquesWithCategories = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("techniques")
      .select(`
        id,
        name,
        description,
        difficulty,
        status,
        created_at,
        image_url,
        video_url,
        is_public,
        technique_categories(
          category_id,
          user_categories(name),
          predefined_categories(name)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user techniques with categories:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUserTechniquesWithCategories:", error);
    return [];
  }
};

/**
 * Asociar una técnica con una categoría
 */
export const associateTechniqueWithCategory = async (techniqueId: string, categoryId: string) => {
  try {
    const { error } = await supabase
      .from("technique_categories")
      .insert({
        technique_id: techniqueId,
        category_id: categoryId,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Error associating technique with category:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in associateTechniqueWithCategory:", error);
    return false;
  }
};

/**
 * Eliminar asociación entre técnica y categoría
 */
export const dissociateTechniqueFromCategory = async (techniqueId: string, categoryId: string) => {
  try {
    const { error } = await supabase
      .from("technique_categories")
      .delete()
      .eq("technique_id", techniqueId)
      .eq("category_id", categoryId);

    if (error) {
      console.error("Error dissociating technique from category:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in dissociateTechniqueFromCategory:", error);
    return false;
  }
};

/**
 * Obtener las categorías de una técnica específica
 */
export const getTechniqueCategories = async (techniqueId: string): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from("technique_categories")
      .select(`
        category_id,
        user_categories(id, name, description),
        predefined_categories(id, name, description)
      `)
      .eq("technique_id", techniqueId);

    if (error) {
      console.error("Error fetching technique categories:", error);
      return [];
    }

    // Combinar categorías de usuario y predefinidas
    const categories: Category[] = [];
    
    data?.forEach(item => {
      if (item.user_categories) {
        // user_categories puede ser un array o un objeto individual
        const userCats = Array.isArray(item.user_categories) 
          ? item.user_categories 
          : [item.user_categories];
        
        userCats.forEach(cat => {
          if (cat) {
            categories.push({
              id: cat.id,
              name: cat.name,
              description: cat.description,
            });
          }
        });
      }
      
      if (item.predefined_categories) {
        // predefined_categories puede ser un array o un objeto individual
        const predefinedCats = Array.isArray(item.predefined_categories) 
          ? item.predefined_categories 
          : [item.predefined_categories];
        
        predefinedCats.forEach(cat => {
          if (cat) {
            categories.push({
              id: cat.id,
              name: cat.name,
              description: cat.description,
            });
          }
        });
      }
    });

    return categories;
  } catch (error) {
    console.error("Error in getTechniqueCategories:", error);
    return [];
  }
};
/**
 * Contar técnicas por categoría
 */
export const countTechniquesByCategory = async (categoryId: string) => {
  try {
    const { count, error } = await supabase
      .from("technique_categories")
      .select("*", { count: "exact", head: true })
      .eq("category_id", categoryId);

    if (error) {
      console.error("Error counting techniques by category:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in countTechniquesByCategory:", error);
    return 0;
  }
};

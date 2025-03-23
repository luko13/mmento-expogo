"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import {
  Plus,
  Search,
  SlidersHorizontal,
  Book,
  Eye,
  Wand2,
  Wrench,
  FileText,
  ChevronUp,
  Trash2,
  Edit,
} from "lucide-react-native"
import { BlurView } from "expo-blur"
import { supabase } from "../../lib/supabase"
import {
  type Category,
  getUserCategories,
  createCategory,
  deleteCategory,
  updateCategory,
  getTricksByCategory,
  ensureDefaultCategories,
} from "../../utils/categoryService"
import TrickViewScreen from "../TrickViewScreen"
import { SafeAreaProvider } from "react-native-safe-area-context"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTouchableOpacity = styled(TouchableOpacity)
const StyledTextInput = styled(TextInput)
const StyledAnimatedView = styled(Animated.View)
const StyledScrollView = styled(ScrollView)

const { width, height } = Dimensions.get("window")

// Calculate safe area for navigation bar
const NAVBAR_HEIGHT = 60
const BOTTOM_SPACING = Platform.OS === "ios" ? 20 : 10

interface LibraryItem {
  id: string
  title: string
  type: "magic" | "gimmick" | "technique" | "script"
  difficulty?: string
  status?: string
  created_at?: string
  duration?: number
}

interface CategorySection {
  category: Category
  items: LibraryItem[]
}

interface LibrariesSectionProps {
  scrollY: Animated.Value
  onSwipeUp?: () => void
}

export default function LibrariesSection({ scrollY, onSwipeUp }: LibrariesSectionProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddCategoryModalVisible, setAddCategoryModalVisible] = useState(false)
  const [isEditCategoryModalVisible, setEditCategoryModalVisible] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [categorySections, setCategorySections] = useState<CategorySection[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedTrickData, setSelectedTrickData] = useState<any>(null)

  // Animation values
  const opacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  })

  // Fetch user categories and tricks
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.error("No user found")
          return
        }

        // Ensure user has default categories
        await ensureDefaultCategories(user.id)

        // Get user categories
        const userCategories = await getUserCategories(user.id)
        setCategories(userCategories)

        // Get tricks for each category
        const sections: CategorySection[] = []

        for (const category of userCategories) {
          const tricks = await getTricksByCategory(category.id)

          // Transform tricks to LibraryItem format
          const items: LibraryItem[] = tricks.map((trick) => ({
            id: trick.id,
            title: trick.title,
            type: "magic",
            difficulty: trick.difficulty,
            status: trick.status,
            created_at: trick.created_at,
            duration: trick.duration,
          }))

          sections.push({
            category,
            items,
          })
        }

        setCategorySections(sections)
      } catch (error) {
        console.error("Error fetching categories:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error("No user found")
        return
      }

      const newCategory = await createCategory(
        user.id,
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined,
      )

      if (newCategory) {
        setCategories([...categories, newCategory])
        setCategorySections([
          ...categorySections,
          {
            category: newCategory,
            items: [],
          },
        ])
      }

      setNewCategoryName("")
      setNewCategoryDescription("")
      setAddCategoryModalVisible(false)
    } catch (error) {
      console.error("Error adding category:", error)
    }
  }

  // Edit category
  const handleEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return

    try {
      const success = await updateCategory(
        editingCategory.id,
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined,
      )

      if (success) {
        // Update categories state
        const updatedCategories = categories.map((cat) =>
          cat.id === editingCategory.id
            ? {
                ...cat,
                name: newCategoryName.trim(),
                description: newCategoryDescription.trim() || undefined,
              }
            : cat,
        )
        setCategories(updatedCategories)

        // Update category sections
        const updatedSections = categorySections.map((section) =>
          section.category.id === editingCategory.id
            ? {
                ...section,
                category: {
                  ...section.category,
                  name: newCategoryName.trim(),
                  description: newCategoryDescription.trim() || undefined,
                },
              }
            : section,
        )
        setCategorySections(updatedSections)
      }

      setEditingCategory(null)
      setNewCategoryName("")
      setNewCategoryDescription("")
      setEditCategoryModalVisible(false)
    } catch (error) {
      console.error("Error updating category:", error)
    }
  }

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const success = await deleteCategory(categoryId)

      if (success) {
        // Update categories state
        setCategories(categories.filter((cat) => cat.id !== categoryId))

        // Update category sections
        setCategorySections(categorySections.filter((section) => section.category.id !== categoryId))
      }
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  // Open edit category modal
  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setNewCategoryDescription(category.description || "")
    setEditCategoryModalVisible(true)
  }

  // Filter categories and tricks based on search query
  const filteredSections = categorySections.filter((section) => {
    // If no search query, show all
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase().trim()

    // Check if category name matches
    if (section.category.name.toLowerCase().includes(query)) return true

    // Check if any trick title matches
    return section.items.some((item) => item.title.toLowerCase().includes(query))
  })

  // Filter items within sections
  const getFilteredItems = (items: LibraryItem[]) => {
    if (!searchQuery.trim()) return items

    const query = searchQuery.toLowerCase().trim()
    return items.filter((item) => item.title.toLowerCase().includes(query))
  }

  // Get icon based on item type
  const getItemIcon = (type: string) => {
    switch (type) {
      case "magic":
        return <Wand2 size={20} color="white" />
      case "gimmick":
        return <Wrench size={20} color="white" />
      case "technique":
        return <Wrench size={20} color="white" />
      case "script":
        return <FileText size={20} color="white" />
      default:
        return <Wand2 size={20} color="white" />
    }
  }

  // Fetch complete trick data
  const fetchTrickData = async (trickId: string) => {
    try {
      const { data, error } = await supabase.from("magic_tricks").select("*").eq("id", trickId).single()

      if (error) {
        console.error("Error fetching trick data:", error)
        return null
      }

      // Parse angles if it's stored as a JSON string
      if (data.angles && typeof data.angles === "string") {
        try {
          data.angles = JSON.parse(data.angles)
        } catch (e) {
          data.angles = []
        }
      } else if (!data.angles) {
        data.angles = []
      }

      // Add default values for missing properties
      const trickData = {
        id: data.id,
        title: data.title,
        category: "Unknown", // We'll get the category name separately
        effect: data.effect || "",
        secret: data.secret || "",
        effect_video_url: data.effect_video_url,
        secret_video_url: data.secret_video_url,
        photo_url: data.photo_url,
        script: data.script || "",
        angles: data.angles,
        duration: data.duration || 0,
        reset: data.reset || 0,
        difficulty: data.difficulty ? Number.parseInt(data.difficulty) : 0,
      }

      // Get category name
      const { data: categoryData, error: categoryError } = await supabase
        .from("trick_categories")
        .select("category_id")
        .eq("trick_id", trickId)
        .limit(1)

      if (!categoryError && categoryData && categoryData.length > 0) {
        const categoryId = categoryData[0].category_id

        const { data: category, error: catError } = await supabase
          .from("user_categories")
          .select("name")
          .eq("id", categoryId)
          .single()

        if (!catError && category) {
          trickData.category = category.name
        }
      }

      return trickData
    } catch (error) {
      console.error("Error in fetchTrickData:", error)
      return null
    }
  }

  // Render category item
  const renderCategoryItem = ({ item }: { item: CategorySection }) => {
    const filteredItems = getFilteredItems(item.items)

    if (
      searchQuery.trim() &&
      filteredItems.length === 0 &&
      !item.category.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return null
    }

    return (
      <StyledView className="mb-4">
        <StyledView className="flex-row justify-between items-center bg-white/10 p-3 rounded-lg mb-2">
          <StyledText className="text-white font-bold">{item.category.name}</StyledText>
          <StyledView className="flex-row items-center">
            <StyledText className="text-white mr-2">{item.items.length}</StyledText>
            <StyledView className="flex-row">
              <StyledTouchableOpacity onPress={() => openEditCategoryModal(item.category)} className="p-2">
                <Edit size={16} color="white" />
              </StyledTouchableOpacity>
              <StyledTouchableOpacity onPress={() => handleDeleteCategory(item.category.id)} className="p-2">
                <Trash2 size={16} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>

        {filteredItems.length > 0 ? (
          filteredItems.map((libraryItem) => (
            <StyledTouchableOpacity
              key={libraryItem.id}
              className="flex-row justify-between items-center bg-white/5 p-3 rounded-lg mb-1"
              onPress={async () => {
                const trickData = await fetchTrickData(libraryItem.id)
                if (trickData) {
                  setSelectedTrickData(trickData)
                }
              }}
            >
              <StyledView className="flex-row items-center">
                {getItemIcon(libraryItem.type)}
                <StyledText className="text-white ml-2">{libraryItem.title}</StyledText>
              </StyledView>
              <Eye size={20} color="white" />
            </StyledTouchableOpacity>
          ))
        ) : (
          <StyledView className="bg-white/5 p-3 rounded-lg">
            <StyledText className="text-white/50 text-center">{t("noTricks")}</StyledText>
          </StyledView>
        )}
      </StyledView>
    )
  }

  // Filter categories for the horizontal scroll
  const handleCategoryFilter = (categoryId: string) => {
    if (selectedCategoryId === categoryId) {
      // If already selected, deselect it
      setSelectedCategoryId(null)
    } else {
      // Otherwise, select it
      setSelectedCategoryId(categoryId)
    }
  }

  // Apply category filter
  const filteredByCategorySections = selectedCategoryId
    ? categorySections.filter((section) => section.category.id === selectedCategoryId)
    : filteredSections

  return (
    <StyledAnimatedView className="flex-1" style={{ opacity }}>
      {/* Swipe Up Indicator */}
      <StyledView className="items-center mb-4">
        <StyledTouchableOpacity
          className="bg-white/10 px-4 py-2 rounded-full flex-row items-center"
          onPress={onSwipeUp}
        >
          <ChevronUp size={20} color="white" />
          <StyledText className="text-white ml-2">{t("swipeUp", "Swipe up to hide")}</StyledText>
        </StyledTouchableOpacity>
      </StyledView>

      {/* Libraries Header */}
      <StyledView className="flex-row justify-between items-center mb-4">
        <StyledView className="flex-row items-center">
          <Book size={24} color="white" />
          <StyledText className="text-white text-xl ml-2">
            {t("librariesCount", { count: categories.length })}
          </StyledText>
        </StyledView>

        <StyledTouchableOpacity
          className="bg-white/20 p-2 rounded-full"
          onPress={() => setAddCategoryModalVisible(true)}
        >
          <Plus size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      {/* Search Bar */}
      <StyledView className="flex-row mb-4">
        <StyledView className="flex-1 overflow-hidden rounded-lg mr-2">
          <BlurView intensity={20} tint="dark">
            <StyledView className="flex-row items-center p-3">
              <Search size={20} color="white" />
              <StyledTextInput
                className="text-white ml-2 flex-1"
                placeholder={t("searchPlaceholder")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </StyledView>
          </BlurView>
        </StyledView>

        <StyledTouchableOpacity className="bg-white/20 p-3 rounded-lg">
          <SlidersHorizontal size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      {/* Categories Filter */}
      <StyledView className="mb-4">
        <StyledText className="text-white mb-2">{t("categories")}</StyledText>
        <StyledScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <StyledTouchableOpacity
              key={category.id}
              className={`bg-white/10 px-4 py-2 rounded-full mr-2 ${
                selectedCategoryId === category.id ? "bg-emerald-600" : "bg-white/10"
              }`}
              onPress={() => handleCategoryFilter(category.id)}
            >
              <StyledText className="text-white">{category.name}</StyledText>
            </StyledTouchableOpacity>
          ))}
        </StyledScrollView>
      </StyledView>

      {/* Loading indicator */}
      {loading ? (
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
        </StyledView>
      ) : (
        /* Category Sections with bottom padding for navigation bar */
        <FlatList
          data={filteredByCategorySections}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.category.id}
          scrollEnabled={true}
          contentContainerStyle={{
            paddingBottom: NAVBAR_HEIGHT + BOTTOM_SPACING, // Add padding for navigation bar
          }}
          ListEmptyComponent={
            <StyledView className="bg-white/5 p-6 rounded-lg items-center">
              <StyledText className="text-white/50 text-center text-lg mb-2">
                {searchQuery.trim()
                  ? t("noSearchResults", "No results found")
                  : t("noCategories", "No categories found")}
              </StyledText>
              {!searchQuery.trim() && (
                <StyledTouchableOpacity
                  className="bg-emerald-700 px-4 py-2 rounded-lg mt-2"
                  onPress={() => setAddCategoryModalVisible(true)}
                >
                  <StyledText className="text-white">{t("addCategory")}</StyledText>
                </StyledTouchableOpacity>
              )}
            </StyledView>
          }
        />
      )}

      {/* Add Category Modal */}
      <Modal
        visible={isAddCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCategoryModalVisible(false)}
      >
        <StyledView className="flex-1 justify-center items-center bg-black/50">
          <StyledView className="bg-gray-800 p-6 rounded-xl w-4/5">
            <StyledText className="text-white text-xl font-bold mb-4">{t("addCategory")}</StyledText>

            <StyledView className="bg-gray-700 rounded-lg mb-4">
              <StyledTextInput
                className="text-white p-3"
                placeholder={t("categoryName")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
            </StyledView>

            <StyledView className="bg-gray-700 rounded-lg mb-4">
              <StyledTextInput
                className="text-white p-3"
                placeholder={t("description", "Description (optional)")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newCategoryDescription}
                onChangeText={setNewCategoryDescription}
                multiline
                numberOfLines={3}
              />
            </StyledView>

            <StyledView className="flex-row justify-end">
              <StyledTouchableOpacity
                className="bg-gray-600 px-4 py-2 rounded-lg mr-2"
                onPress={() => {
                  setNewCategoryName("")
                  setNewCategoryDescription("")
                  setAddCategoryModalVisible(false)
                }}
              >
                <StyledText className="text-white">{t("cancel")}</StyledText>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className="bg-emerald-700 px-4 py-2 rounded-lg"
                onPress={handleAddCategory}
                disabled={!newCategoryName.trim()}
              >
                <StyledText className="text-white">{t("add")}</StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        visible={isEditCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditCategoryModalVisible(false)}
      >
        <StyledView className="flex-1 justify-center items-center bg-black/50">
          <StyledView className="bg-gray-800 p-6 rounded-xl w-4/5">
            <StyledText className="text-white text-xl font-bold mb-4">{t("editCategory", "Edit Category")}</StyledText>

            <StyledView className="bg-gray-700 rounded-lg mb-4">
              <StyledTextInput
                className="text-white p-3"
                placeholder={t("categoryName")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
            </StyledView>

            <StyledView className="bg-gray-700 rounded-lg mb-4">
              <StyledTextInput
                className="text-white p-3"
                placeholder={t("description", "Description (optional)")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newCategoryDescription}
                onChangeText={setNewCategoryDescription}
                multiline
                numberOfLines={3}
              />
            </StyledView>

            <StyledView className="flex-row justify-end">
              <StyledTouchableOpacity
                className="bg-gray-600 px-4 py-2 rounded-lg mr-2"
                onPress={() => {
                  setEditingCategory(null)
                  setNewCategoryName("")
                  setNewCategoryDescription("")
                  setEditCategoryModalVisible(false)
                }}
              >
                <StyledText className="text-white">{t("cancel")}</StyledText>
              </StyledTouchableOpacity>

              <StyledTouchableOpacity
                className="bg-emerald-700 px-4 py-2 rounded-lg"
                onPress={handleEditCategory}
                disabled={!newCategoryName.trim()}
              >
                <StyledText className="text-white">{t("save", "Save")}</StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledView>
      </Modal>

      {/* Trick View Modal */}
      {selectedTrickData && (
        <Modal
          visible={!!selectedTrickData}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setSelectedTrickData(null)}
          presentationStyle="fullScreen"
        >
          <SafeAreaProvider>
            <TrickViewScreen trick={selectedTrickData} onClose={() => setSelectedTrickData(null)} />
          </SafeAreaProvider>
        </Modal>
      )}
    </StyledAnimatedView>
  )
}


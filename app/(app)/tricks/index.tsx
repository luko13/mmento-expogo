"use client"
import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, Dimensions } from "react-native"
import { styled } from "nativewind"
import { useTranslation } from "react-i18next"
import { supabase } from "../../../lib/supabase"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

const StyledView = styled(View)
const StyledText = styled(Text)
const StyledTextInput = styled(TextInput)
const StyledTouchableOpacity = styled(TouchableOpacity)

const { width, height } = Dimensions.get("window")

interface Trick {
  id: string
  title: string
  effect: string
  difficulty: string
  created_at: string
  duration: number | null
  is_public: boolean
  status: string
}

export default function Tricks() {
  const { t } = useTranslation()
  const [tricks, setTricks] = useState<Trick[]>([])
  const [filteredTricks, setFilteredTricks] = useState<Trick[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterVisible, setFilterVisible] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchTricks()
  }, [])

  useEffect(() => {
    filterTricks()
  }, [searchTerm, selectedDifficulty, selectedStatus, tricks])

  const fetchTricks = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from("magic_tricks")
        .select("id, title, effect, difficulty, created_at, duration, is_public, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (data) {
        setTricks(data)
        setFilteredTricks(data)
      }
      if (error) console.error("Error fetching tricks:", error)
    }
  }

  const filterTricks = () => {
    let filtered = tricks.filter(
      (trick) =>
        trick.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trick.effect.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    if (selectedDifficulty) {
      filtered = filtered.filter((trick) => trick.difficulty === selectedDifficulty)
    }

    if (selectedStatus) {
      filtered = filtered.filter((trick) => trick.status === selectedStatus)
    }

    setFilteredTricks(filtered)
  }

  const renderTrickItem = ({ item }: { item: Trick }) => (
    <StyledTouchableOpacity
      className="bg-white/10 p-4 rounded-lg mb-3"
      onPress={() => console.log("Navigate to trick details", item.id)}
    >
      <StyledText className="text-white font-bold">{item.title}</StyledText>
      <StyledText className="text-white/70">{t(`difficulty.${item.difficulty}`, item.difficulty)}</StyledText>
      <StyledText className="text-white/70">{t(`status.${item.status}`, item.status)}</StyledText>
      {item.duration && (
        <StyledText className="text-white/70">
          {t("duration")}: {item.duration}s
        </StyledText>
      )}
      <StyledText className="text-white/50 text-sm">{new Date(item.created_at).toLocaleDateString()}</StyledText>
    </StyledTouchableOpacity>
  )

  const renderFilterOptions = () => (
    <StyledView className="mb-4">
      <StyledText className="text-white mb-2">{t("filterBy", "Filter by")}:</StyledText>
      <StyledView className="flex-row flex-wrap mb-2">
        {["beginner", "easy", "intermediate", "advanced", "expert"].map((difficulty) => (
          <StyledTouchableOpacity
            key={difficulty}
            onPress={() => setSelectedDifficulty(selectedDifficulty === difficulty ? null : difficulty)}
            className={`m-1 px-3 py-2 rounded-full ${selectedDifficulty === difficulty ? "bg-emerald-600" : "bg-white/20"}`}
          >
            <StyledText className="text-white">{t(`difficulty.${difficulty}`)}</StyledText>
          </StyledTouchableOpacity>
        ))}
      </StyledView>
      <StyledView className="flex-row flex-wrap">
        {["draft", "published", "archived"].map((status) => (
          <StyledTouchableOpacity
            key={status}
            onPress={() => setSelectedStatus(selectedStatus === status ? null : status)}
            className={`m-1 px-3 py-2 rounded-full ${selectedStatus === status ? "bg-emerald-600" : "bg-white/20"}`}
          >
            <StyledText className="text-white">{t(`status.${status}`)}</StyledText>
          </StyledTouchableOpacity>
        ))}
      </StyledView>
    </StyledView>
  )

  return (
    <StyledView className="flex-1">
      <Image
        source={require("../../../assets/Background.png")}
        style={{
          width: width,
          height: height,
          position: "absolute",
        }}
        resizeMode="cover"
      />

      <StyledView className="p-4">
        <StyledView className="flex-row mb-4">
          <StyledView className="flex-1 overflow-hidden rounded-lg mr-2">
            <BlurView intensity={20} tint="dark">
              <StyledTextInput
                className="text-white p-3"
                placeholder={t("searchTricks", "Search tricks...")}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </BlurView>
          </StyledView>
          <StyledTouchableOpacity
            onPress={() => setFilterVisible(!filterVisible)}
            className="bg-emerald-700 p-3 rounded-lg"
          >
            <Ionicons name="filter" size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>

        {filterVisible && renderFilterOptions()}

        <FlatList
          data={filteredTricks}
          renderItem={renderTrickItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <StyledText className="text-white text-center">
              {t("noTricks", "You haven't added any tricks yet.")}
            </StyledText>
          }
        />
      </StyledView>
    </StyledView>
  )
}

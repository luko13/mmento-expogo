// types/encryptedMagicTrick.ts

export interface EncryptedMagicTrick {
  // ID y usuario
  id?: string
  user_id?: string

  // Campos de contenido
  title: string
  effect: string
  secret: string
  notes: string
  
  // Archivos multimedia
  photo_url: string | null
  effect_video_url: string | null
  secret_video_url: string | null
  
  // Campos no cifrados
  categories: string[]
  tags: string[]
  selectedCategoryId: string | null
  angles: string[]
  duration: number | null
  reset: number | null
  difficulty: number | null
  special_materials: string[]
  
  // Relaciones
  techniqueIds?: string[]
  gimmickIds?: string[]
  script: string
  scriptId?: string
  
  // Metadatos
  is_public: boolean
  status: "draft" | "published" | "under_review" | "deleted"
  price: number | null
  views_count?: number
  likes_count?: number
  dislikes_count?: number
  version?: number
  parent_trick_id?: string | null
  
  // Campos de cifrado
  isEncryptionEnabled: boolean
  encryptedFields: {
    title?: string
    effect?: string
    secret?: string
    notes?: string
  }
  encryptedFiles: {
    photo?: string
    photos?: string[]
    effect_video?: string
    secret_video?: string
  }
}

export interface MagicTrickDBRecord {
  id: string
  user_id: string
  title: string
  effect: string
  secret: string
  duration: number | null
  angles: any
  notes: string
  special_materials: string[]
  is_public: boolean
  status: "draft" | "published" | "under_review" | "deleted"
  price: number | null
  photo_url: string | null
  effect_video_url: string | null
  secret_video_url: string | null
  views_count: number
  likes_count: number
  dislikes_count: number
  created_at?: string
  updated_at?: string
  version: number
  parent_trick_id: string | null
  reset: number | null
  difficulty: number | null
  is_encrypted: boolean
}
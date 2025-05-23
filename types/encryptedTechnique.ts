// types/encryptedTechnique.ts

export interface EncryptedTechnique {
  // Campos base (existentes)
  id?: string
  user_id?: string
  name: string
  description: string
  difficulty: number | null
  categories: string[]
  tags: string[]
  selectedCategoryId: string | null
  angles: string[]
  notes: string
  special_materials: string[]
  image_url: string | null
  video_url: string | null
  is_public: boolean
  status: string
  price: number | null
  
  // Campos de cifrado
  isEncryptionEnabled: boolean
  encryptedFields?: {
    name?: string          // El nombre también debe cifrarse por privacidad
    description?: string   // Descripción cifrada
    notes?: string        // Notas cifradas
    special_materials?: string // Materiales especiales cifrados
  }
  encryptedFiles?: {
    image?: string        // ID del archivo de imagen cifrado
    video?: string        // ID del archivo de video cifrado
  }
}

// Interfaz para los datos que se guardan en la BD
export interface TechniqueDBRecord {
  id?: string
  user_id: string
  name: string              // "[ENCRYPTED]" si está cifrado
  description: string       // "[ENCRYPTED]" si está cifrado
  difficulty: number | null
  angles: string | null     // JSON string
  notes: string            // "[ENCRYPTED]" si está cifrado
  special_materials: string[] | null
  image_url: string | null  // ID del archivo cifrado o URL normal
  video_url: string | null  // ID del archivo cifrado o URL normal
  is_public: boolean
  status: string
  price: number | null
  is_encrypted: boolean     // Nueva columna
  created_at?: string
  updated_at?: string
}

// Interfaz para mostrar en la UI (con datos descifrados)
export interface TechniqueDisplayData {
  id: string
  user_id: string
  name: string              // Texto descifrado
  description: string       // Texto descifrado
  difficulty: number | null
  angles: string[]
  notes: string            // Texto descifrado
  special_materials: string[]
  image_url: string | null  // URL temporal del archivo descifrado
  video_url: string | null  // URL temporal del archivo descifrado
  is_public: boolean
  status: string
  price: number | null
  is_encrypted: boolean
  created_at: string
  updated_at: string
}
// types/encryptedMagicTrick.ts

export interface EncryptedMagicTrick {
  // Campos básicos
  id?: string;
  user_id?: string;
  title: string;
  categories: any[];
  tags: string[];
  selectedCategoryId: string | null;
  
  // Contenido del efecto
  effect: string;
  effect_video_url: string | null;
  
  // Estadísticas
  angles: string[];
  duration: number | null;
  reset: number | null;
  difficulty: number;
  
  // Contenido del secreto
  secret: string;
  secret_video_url: string | null;
  special_materials: string[];
  
  // Extras
  notes: string;
  script: string;
  photo_url: string | null;
  techniqueIds: string[];
  gimmickIds: string[];
  scriptId?: string;
  
  // Publicación
  is_public: boolean;
  status: 'draft' | 'published';
  price: number | null;
  
  // Cifrado
  isEncryptionEnabled: boolean;
  encryptedFields?: Record<string, string>;
  encryptedFiles?: {
    effect_video?: string;
    secret_video?: string;
    photo?: string;
    photos?: string[];
  };
  
  // Archivos locales (para subida diferida)
  localFiles?: {
    effectVideo?: string | null;
    secretVideo?: string | null;
    photos?: string[];
  };
  
  // Metadatos
  created_at?: string;
  updated_at?: string;
  views_count?: number;
  likes_count?: number;
  dislikes_count?: number;
  version?: number;
  parent_trick_id?: string | null;
  is_encrypted?: boolean;
}

export interface MagicTrickDBRecord {
  id: string;
  user_id: string;
  title: string;
  effect: string;
  secret: string;
  duration: number | null;
  angles: string[];
  notes: string;
  special_materials: string[];
  is_public: boolean;
  status: 'draft' | 'published';
  price: number | null;
  photo_url: string | null;
  effect_video_url: string | null;
  secret_video_url: string | null;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  version: number;
  parent_trick_id: string | null;
  reset: number | null;
  difficulty: number;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}
// types/magicTrick.ts

export interface MagicTrick {
  id?: string;
  user_id?: string;
  title: string;
  categories: string[];
  tags: string[];
  selectedCategoryId: string | null;
  effect: string;
  effect_video_url: string | null;
  angles: string[];
  duration: number | null;
  reset: number | null;
  difficulty: number | null;
  secret: string;
  secret_video_url: string | null;
  special_materials: string[];
  notes: string;
  script: string;
  scriptId?: string;
  photo_url: string | null;
  photos?: string[]; // URLs de fotos adicionales (modo edición)
  techniqueIds: string[];
  gimmickIds: string[];
  is_public: boolean;
  status: "draft" | "published" | "archived";
  price: number | null;
  created_at?: string;
  updated_at?: string;
  views_count?: number;
  likes_count?: number;
  dislikes_count?: number;
  version?: number;
  parent_trick_id?: string | null;

  // Archivos locales temporales (no se guardan en DB)
  localFiles?: {
    effectVideo: string | null;
    secretVideo: string | null;
    photos: string[];
  };

  // Para el callback de progreso (temporal)
  uploadProgressCallback?: (progress: number, fileName: string) => void;
}

export interface MagicTrickDBRecord {
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
}

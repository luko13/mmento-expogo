# 📊 Snapshot de Base de Datos Supabase - MMENTO

> **Última actualización:** 13 11 2025
> **Versión PostgreSQL:** [PEGAR RESULTADO DE version()]
> **Total de tablas:** [NÚMERO]
> **Total de usuarios:** [NÚMERO]

---

## 📋 Índice

1. [Tablas y Estructura](#1-tablas-y-estructura)
2. [Relaciones y Foreign Keys](#2-relaciones-y-foreign-keys)
3. [Índices](#3-índices)
4. [Triggers y Funciones](#4-triggers-y-funciones)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Tipos Personalizados y Enums](#6-tipos-personalizados-y-enums)
7. [Extensiones PostgreSQL](#7-extensiones-postgresql)
8. [Estadísticas de Tablas](#8-estadísticas-de-tablas)
9. [Datos de Ejemplo](#9-datos-de-ejemplo)
10. [Relaciones Complejas](#10-relaciones-complejas)
11. [Configuración Full-Text Search](#11-configuración-full-text-search)
12. [Storage y Archivos](#12-storage-y-archivos)
13. [Auth y Perfiles](#13-auth-y-perfiles)
14. [Metadata](#14-metadata)

---

## 1. Tablas y Estructura

### 1.1 Lista de Todas las Tablas

```
[PEGAR RESULTADO DE QUERY 1.1]

[
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "ai_folders",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "bans",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "chat_groups",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_categories",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "scripts",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "trick_gimmicks",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "trick_techniques",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "user_categories",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "user_roles",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "tableowner": "postgres"
  },
  {
    "schemaname": "public",
    "tablename": "video_processing_queue",
    "tableowner": "postgres"
  }
]

### 1.2 Estructura: magic_tricks

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()",
    "ordinal_position": 1
  },
  {
    "column_name": "user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "column_name": "title",
    "data_type": "character varying",
    "character_maximum_length": 255,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "column_name": "effect",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "column_name": "secret",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "column_name": "duration",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "column_name": "angles",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'[]'::jsonb",
    "ordinal_position": 8
  },
  {
    "column_name": "notes",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "column_name": "special_materials",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "column_name": "is_public",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 11
  },
  {
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'draft'::content_status",
    "ordinal_position": 12
  },
  {
    "column_name": "price",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "column_name": "photo_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 14
  },
  {
    "column_name": "effect_video_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 15
  },
  {
    "column_name": "secret_video_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 16
  },
  {
    "column_name": "views_count",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 17
  },
  {
    "column_name": "likes_count",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 18
  },
  {
    "column_name": "dislikes_count",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 19
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 20
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 21
  },
  {
    "column_name": "version",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "1",
    "ordinal_position": 22
  },
  {
    "column_name": "parent_trick_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 23
  },
  {
    "column_name": "reset",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 24
  },
  {
    "column_name": "difficulty",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 26
  },
  {
    "column_name": "search_vector",
    "data_type": "tsvector",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 28
  }
]

### 1.3 Estructura: user_categories

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()",
    "ordinal_position": 1
  },
  {
    "column_name": "user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "column_name": "name",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "column_name": "description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 5
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 6
  }
]

### 1.4 Estructura: user_favorites

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()",
    "ordinal_position": 1
  },
  {
    "column_name": "user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "column_name": "content_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "column_name": "content_type",
    "data_type": "character varying",
    "character_maximum_length": 50,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 5
  }
]

### 1.5 Estructura: trick_categories (Junction Table)

[
  {
    "column_name": "trick_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "column_name": "category_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 3
  }
]

### 1.6 Estructura: trick_tags

[
  {
    "column_name": "trick_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "column_name": "tag_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 3
  }
]

### 1.7 Estructura: trick_photos

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()",
    "ordinal_position": 1
  },
  {
    "column_name": "trick_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "column_name": "photo_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "column_name": "position",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 4
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 5
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()",
    "ordinal_position": 6
  }
]

### 1.8 Estructura: profiles

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 1
  },
  {
    "column_name": "username",
    "data_type": "character varying",
    "character_maximum_length": 255,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 2
  },
  {
    "column_name": "full_name",
    "data_type": "character varying",
    "character_maximum_length": 255,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 3
  },
  {
    "column_name": "email",
    "data_type": "character varying",
    "character_maximum_length": 255,
    "is_nullable": "NO",
    "column_default": null,
    "ordinal_position": 4
  },
  {
    "column_name": "phone",
    "data_type": "character varying",
    "character_maximum_length": 50,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 5
  },
  {
    "column_name": "profile_image_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 6
  },
  {
    "column_name": "external_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 7
  },
  {
    "column_name": "subscription_type",
    "data_type": "USER-DEFINED",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'free'::user_subscription_type",
    "ordinal_position": 8
  },
  {
    "column_name": "birth_date",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 9
  },
  {
    "column_name": "nationality",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 10
  },
  {
    "column_name": "is_active",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true",
    "ordinal_position": 11
  },
  {
    "column_name": "is_verified",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 12
  },
  {
    "column_name": "last_login",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 13
  },
  {
    "column_name": "social_links",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 14
  },
  {
    "column_name": "storage_used",
    "data_type": "bigint",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 15
  },
  {
    "column_name": "strike_count",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 16
  },
  {
    "column_name": "warning_count",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 17
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 18
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP",
    "ordinal_position": 19
  },
  {
    "column_name": "bio",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 20
  },
  {
    "column_name": "avatar_url",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null,
    "ordinal_position": 21
  },
  {
    "column_name": "preferences",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "ordinal_position": 22
  },
  {
    "column_name": "follower_count",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 23
  },
  {
    "column_name": "following_count",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0",
    "ordinal_position": 24
  },
  {
    "column_name": "is_admin",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false",
    "ordinal_position": 26
  }
]

### 1.9 Overview: Todas las Columnas

[
  {
    "table_name": "ai_conversations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "ai_conversations",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_conversations",
    "column_name": "title",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "ai_conversations",
    "column_name": "folder_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_conversations",
    "column_name": "is_pinned",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "ai_conversations",
    "column_name": "is_archived",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "ai_conversations",
    "column_name": "message_count",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "ai_conversations",
    "column_name": "last_message_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_conversations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "ai_conversations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "ai_folders",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "ai_folders",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_folders",
    "column_name": "name",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "ai_folders",
    "column_name": "color",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": "'#10b981'::character varying"
  },
  {
    "table_name": "ai_folders",
    "column_name": "icon",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": "'folder'::character varying"
  },
  {
    "table_name": "ai_folders",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "ai_folders",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "ai_messages",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "ai_messages",
    "column_name": "conversation_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_messages",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_messages",
    "column_name": "role",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_messages",
    "column_name": "content",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "ai_messages",
    "column_name": "audio_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_messages",
    "column_name": "tokens_used",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "ai_messages",
    "column_name": "model_used",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_messages",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "ai_usage_tracking",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "ai_usage_tracking",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "ai_usage_tracking",
    "column_name": "date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": "CURRENT_DATE"
  },
  {
    "table_name": "ai_usage_tracking",
    "column_name": "queries_count",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "ai_usage_tracking",
    "column_name": "tokens_used",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "ai_usage_tracking",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "bans",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "bans",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "bans",
    "column_name": "banned_by",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "bans",
    "column_name": "ban_type",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "bans",
    "column_name": "reason",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "bans",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "bans",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  {
    "table_name": "chat_groups",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "chat_groups",
    "column_name": "creator_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "chat_groups",
    "column_name": "name",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "chat_groups",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "chat_groups",
    "column_name": "is_private",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "true"
  },
  {
    "table_name": "chat_groups",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  {
    "table_name": "gimmick_categories",
    "column_name": "gimmick_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "gimmick_categories",
    "column_name": "category_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "gimmick_categories",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  {
    "table_name": "gimmicks",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "gimmicks",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "name",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "secret_description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "angles",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'[]'::jsonb"
  },
  {
    "table_name": "gimmicks",
    "column_name": "reset_time",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "difficulty",
    "data_type": "USER-DEFINED",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "instructions",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "special_materials",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "image_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "video_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "craft_video_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "is_public",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "gimmicks",
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "is_nullable": "YES",
    "column_default": "'draft'::content_status"
  },
  {
    "table_name": "gimmicks",
    "column_name": "price",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "gimmicks",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  {
    "table_name": "gimmicks",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  {
    "table_name": "group_members",
    "column_name": "group_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "group_members",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "group_members",
    "column_name": "role",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": "'member'::character varying"
  },
  {
    "table_name": "group_members",
    "column_name": "joined_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "title",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "effect",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "secret",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "duration",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "angles",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'[]'::jsonb"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "special_materials",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "is_public",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "is_nullable": "YES",
    "column_default": "'draft'::content_status"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "price",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "photo_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "effect_video_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "secret_video_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "views_count",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "likes_count",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "dislikes_count",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "version",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "1"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "parent_trick_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "reset",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "difficulty",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "magic_tricks",
    "column_name": "search_vector",
    "data_type": "tsvector",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "messages",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "messages",
    "column_name": "group_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "messages",
    "column_name": "sender_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "messages",
    "column_name": "content",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  }
]

---

## 2. Relaciones y Foreign Keys

### 2.1 Todas las Foreign Keys

[
  {
    "tabla_origen": "ai_conversations",
    "columna_origen": "folder_id",
    "tabla_referenciada": "ai_folders",
    "columna_referenciada": "id",
    "nombre_constraint": "ai_conversations_folder_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "SET NULL"
  },
  {
    "tabla_origen": "ai_conversations",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "ai_conversations_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "ai_folders",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "ai_folders_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "ai_messages",
    "columna_origen": "conversation_id",
    "tabla_referenciada": "ai_conversations",
    "columna_referenciada": "id",
    "nombre_constraint": "ai_messages_conversation_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "ai_messages",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "ai_messages_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "ai_usage_tracking",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "ai_usage_tracking_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "bans",
    "columna_origen": "banned_by",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "bans_banned_by_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "bans",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "bans_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "chat_groups",
    "columna_origen": "creator_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "chat_groups_creator_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "gimmick_categories",
    "columna_origen": "gimmick_id",
    "tabla_referenciada": "gimmicks",
    "columna_referenciada": "id",
    "nombre_constraint": "gimmick_categories_gimmick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "gimmick_categories",
    "columna_origen": "gimmick_id",
    "tabla_referenciada": "gimmicks",
    "columna_referenciada": "id",
    "nombre_constraint": "fk_gimmick_categories_gimmick",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "gimmicks",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "gimmicks_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "group_members",
    "columna_origen": "group_id",
    "tabla_referenciada": "chat_groups",
    "columna_referenciada": "id",
    "nombre_constraint": "group_members_group_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "group_members",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "group_members_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "magic_tricks",
    "columna_origen": "parent_trick_id",
    "tabla_referenciada": "magic_tricks",
    "columna_referenciada": "id",
    "nombre_constraint": "magic_tricks_parent_trick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "magic_tricks",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "magic_tricks_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "messages",
    "columna_origen": "group_id",
    "tabla_referenciada": "chat_groups",
    "columna_referenciada": "id",
    "nombre_constraint": "messages_group_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "messages",
    "columna_origen": "sender_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "messages_sender_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "predefined_tags",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "predefined_tags_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "purchases",
    "columna_origen": "buyer_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "purchases_buyer_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "purchases",
    "columna_origen": "seller_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "purchases_seller_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "reports",
    "columna_origen": "reported_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "reports_reported_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "reports",
    "columna_origen": "reporter_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "reports_reporter_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "reports",
    "columna_origen": "resolved_by",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "reports_resolved_by_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "scripts",
    "columna_origen": "trick_id",
    "tabla_referenciada": "magic_tricks",
    "columna_referenciada": "id",
    "nombre_constraint": "scripts_trick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "scripts",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "scripts_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "shared_content",
    "columna_origen": "owner_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "shared_content_owner_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "shared_content",
    "columna_origen": "shared_with",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "shared_content_shared_with_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "technique_categories",
    "columna_origen": "technique_id",
    "tabla_referenciada": "techniques",
    "columna_referenciada": "id",
    "nombre_constraint": "technique_categories_technique_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "technique_categories",
    "columna_origen": "technique_id",
    "tabla_referenciada": "techniques",
    "columna_referenciada": "id",
    "nombre_constraint": "fk_technique_categories_technique",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "technique_tags",
    "columna_origen": "tag_id",
    "tabla_referenciada": "predefined_tags",
    "columna_referenciada": "id",
    "nombre_constraint": "technique_tags_tag_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "technique_tags",
    "columna_origen": "technique_id",
    "tabla_referenciada": "techniques",
    "columna_referenciada": "id",
    "nombre_constraint": "technique_tags_technique_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "techniques",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "techniques_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "trick_categories",
    "columna_origen": "category_id",
    "tabla_referenciada": "user_categories",
    "columna_referenciada": "id",
    "nombre_constraint": "trick_categories_category_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "trick_categories",
    "columna_origen": "trick_id",
    "tabla_referenciada": "magic_tricks",
    "columna_referenciada": "id",
    "nombre_constraint": "trick_categories_trick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "trick_gimmicks",
    "columna_origen": "gimmick_id",
    "tabla_referenciada": "gimmicks",
    "columna_referenciada": "id",
    "nombre_constraint": "trick_gimmicks_gimmick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "trick_gimmicks",
    "columna_origen": "trick_id",
    "tabla_referenciada": "magic_tricks",
    "columna_referenciada": "id",
    "nombre_constraint": "trick_gimmicks_trick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "trick_photos",
    "columna_origen": "trick_id",
    "tabla_referenciada": "magic_tricks",
    "columna_referenciada": "id",
    "nombre_constraint": "trick_photos_trick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "trick_tags",
    "columna_origen": "tag_id",
    "tabla_referenciada": "predefined_tags",
    "columna_referenciada": "id",
    "nombre_constraint": "trick_tags_tag_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "trick_tags",
    "columna_origen": "trick_id",
    "tabla_referenciada": "magic_tricks",
    "columna_referenciada": "id",
    "nombre_constraint": "trick_tags_trick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "trick_techniques",
    "columna_origen": "technique_id",
    "tabla_referenciada": "techniques",
    "columna_referenciada": "id",
    "nombre_constraint": "trick_techniques_technique_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "trick_techniques",
    "columna_origen": "trick_id",
    "tabla_referenciada": "magic_tricks",
    "columna_referenciada": "id",
    "nombre_constraint": "trick_techniques_trick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "user_categories",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "user_categories_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "user_category_order",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "user_category_order_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "user_favorites",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "user_favorites_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "user_relationships",
    "columna_origen": "follower_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "user_relationships_follower_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "user_relationships",
    "columna_origen": "following_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "user_relationships_following_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "user_roles",
    "columna_origen": "role_id",
    "tabla_referenciada": "roles",
    "columna_referenciada": "id",
    "nombre_constraint": "user_roles_role_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "user_roles",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "user_roles_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  },
  {
    "tabla_origen": "user_trick_order",
    "columna_origen": "trick_id",
    "tabla_referenciada": "magic_tricks",
    "columna_referenciada": "id",
    "nombre_constraint": "user_trick_order_trick_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "user_trick_order",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "user_trick_order_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "CASCADE"
  },
  {
    "tabla_origen": "video_processing_queue",
    "columna_origen": "user_id",
    "tabla_referenciada": "profiles",
    "columna_referenciada": "id",
    "nombre_constraint": "video_processing_queue_user_id_fkey",
    "on_update": "NO ACTION",
    "on_delete": "NO ACTION"
  }
]

### 2.2 Primary Keys

[
  {
    "table_name": "ai_conversations",
    "column_name": "id",
    "constraint_name": "ai_conversations_pkey"
  },
  {
    "table_name": "ai_folders",
    "column_name": "id",
    "constraint_name": "ai_folders_pkey"
  },
  {
    "table_name": "ai_messages",
    "column_name": "id",
    "constraint_name": "ai_messages_pkey"
  },
  {
    "table_name": "ai_usage_tracking",
    "column_name": "id",
    "constraint_name": "ai_usage_tracking_pkey"
  },
  {
    "table_name": "bans",
    "column_name": "id",
    "constraint_name": "bans_pkey"
  },
  {
    "table_name": "chat_groups",
    "column_name": "id",
    "constraint_name": "chat_groups_pkey"
  },
  {
    "table_name": "gimmick_categories",
    "column_name": "category_id",
    "constraint_name": "gimmick_categories_pkey"
  },
  {
    "table_name": "gimmick_categories",
    "column_name": "gimmick_id",
    "constraint_name": "gimmick_categories_pkey"
  },
  {
    "table_name": "gimmicks",
    "column_name": "id",
    "constraint_name": "gimmicks_pkey"
  },
  {
    "table_name": "group_members",
    "column_name": "user_id",
    "constraint_name": "group_members_pkey"
  },
  {
    "table_name": "group_members",
    "column_name": "group_id",
    "constraint_name": "group_members_pkey"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "id",
    "constraint_name": "magic_tricks_pkey"
  },
  {
    "table_name": "messages",
    "column_name": "id",
    "constraint_name": "messages_pkey"
  },
  {
    "table_name": "predefined_categories",
    "column_name": "id",
    "constraint_name": "predefined_categories_pkey"
  },
  {
    "table_name": "predefined_tags",
    "column_name": "id",
    "constraint_name": "predefined_tags_pkey"
  },
  {
    "table_name": "profiles",
    "column_name": "id",
    "constraint_name": "profiles_pkey"
  },
  {
    "table_name": "purchases",
    "column_name": "id",
    "constraint_name": "purchases_pkey"
  },
  {
    "table_name": "reports",
    "column_name": "id",
    "constraint_name": "reports_pkey"
  },
  {
    "table_name": "roles",
    "column_name": "id",
    "constraint_name": "roles_pkey"
  },
  {
    "table_name": "scripts",
    "column_name": "id",
    "constraint_name": "scripts_pkey"
  },
  {
    "table_name": "shared_content",
    "column_name": "id",
    "constraint_name": "shared_content_pkey"
  },
  {
    "table_name": "technique_categories",
    "column_name": "category_id",
    "constraint_name": "technique_categories_pkey"
  },
  {
    "table_name": "technique_categories",
    "column_name": "technique_id",
    "constraint_name": "technique_categories_pkey"
  },
  {
    "table_name": "technique_tags",
    "column_name": "tag_id",
    "constraint_name": "technique_tags_pkey"
  },
  {
    "table_name": "technique_tags",
    "column_name": "technique_id",
    "constraint_name": "technique_tags_pkey"
  },
  {
    "table_name": "techniques",
    "column_name": "id",
    "constraint_name": "techniques_pkey"
  },
  {
    "table_name": "trick_categories",
    "column_name": "trick_id",
    "constraint_name": "trick_categories_pkey"
  },
  {
    "table_name": "trick_categories",
    "column_name": "category_id",
    "constraint_name": "trick_categories_pkey"
  },
  {
    "table_name": "trick_gimmicks",
    "column_name": "gimmick_id",
    "constraint_name": "trick_gimmicks_pkey"
  },
  {
    "table_name": "trick_gimmicks",
    "column_name": "trick_id",
    "constraint_name": "trick_gimmicks_pkey"
  },
  {
    "table_name": "trick_photos",
    "column_name": "id",
    "constraint_name": "trick_photos_pkey"
  },
  {
    "table_name": "trick_tags",
    "column_name": "trick_id",
    "constraint_name": "trick_tags_pkey"
  },
  {
    "table_name": "trick_tags",
    "column_name": "tag_id",
    "constraint_name": "trick_tags_pkey"
  },
  {
    "table_name": "trick_techniques",
    "column_name": "technique_id",
    "constraint_name": "trick_techniques_pkey"
  },
  {
    "table_name": "trick_techniques",
    "column_name": "trick_id",
    "constraint_name": "trick_techniques_pkey"
  },
  {
    "table_name": "user_categories",
    "column_name": "id",
    "constraint_name": "user_categories_pkey"
  },
  {
    "table_name": "user_category_order",
    "column_name": "category_id",
    "constraint_name": "user_category_order_pkey"
  },
  {
    "table_name": "user_category_order",
    "column_name": "user_id",
    "constraint_name": "user_category_order_pkey"
  },
  {
    "table_name": "user_favorites",
    "column_name": "id",
    "constraint_name": "user_favorites_pkey"
  },
  {
    "table_name": "user_relationships",
    "column_name": "following_id",
    "constraint_name": "user_relationships_pkey"
  },
  {
    "table_name": "user_relationships",
    "column_name": "follower_id",
    "constraint_name": "user_relationships_pkey"
  },
  {
    "table_name": "user_roles",
    "column_name": "role_id",
    "constraint_name": "user_roles_pkey"
  },
  {
    "table_name": "user_roles",
    "column_name": "user_id",
    "constraint_name": "user_roles_pkey"
  },
  {
    "table_name": "user_trick_order",
    "column_name": "user_id",
    "constraint_name": "user_trick_order_pkey"
  },
  {
    "table_name": "user_trick_order",
    "column_name": "category_id",
    "constraint_name": "user_trick_order_pkey"
  },
  {
    "table_name": "user_trick_order",
    "column_name": "trick_id",
    "constraint_name": "user_trick_order_pkey"
  },
  {
    "table_name": "video_processing_queue",
    "column_name": "id",
    "constraint_name": "video_processing_queue_pkey"
  }
]

### 2.3 Unique Constraints

[
  {
    "table_name": "ai_usage_tracking",
    "column_name": "user_id",
    "constraint_name": "ai_usage_tracking_user_id_date_key"
  },
  {
    "table_name": "ai_usage_tracking",
    "column_name": "date",
    "constraint_name": "ai_usage_tracking_user_id_date_key"
  },
  {
    "table_name": "predefined_tags",
    "column_name": "user_id",
    "constraint_name": "predefined_tags_user_id_name_key"
  },
  {
    "table_name": "predefined_tags",
    "column_name": "name",
    "constraint_name": "predefined_tags_user_id_name_key"
  },
  {
    "table_name": "profiles",
    "column_name": "username",
    "constraint_name": "profiles_username_key"
  },
  {
    "table_name": "profiles",
    "column_name": "email",
    "constraint_name": "profiles_email_key"
  },
  {
    "table_name": "roles",
    "column_name": "name",
    "constraint_name": "roles_name_key"
  },
  {
    "table_name": "shared_content",
    "column_name": "content_id",
    "constraint_name": "shared_content_content_id_content_type_shared_with_key"
  },
  {
    "table_name": "shared_content",
    "column_name": "content_type",
    "constraint_name": "shared_content_content_id_content_type_shared_with_key"
  },
  {
    "table_name": "shared_content",
    "column_name": "shared_with",
    "constraint_name": "shared_content_content_id_content_type_shared_with_key"
  },
  {
    "table_name": "user_favorites",
    "column_name": "content_type",
    "constraint_name": "user_favorites_user_id_content_id_content_type_key"
  },
  {
    "table_name": "user_favorites",
    "column_name": "content_id",
    "constraint_name": "user_favorites_user_id_content_id_content_type_key"
  },
  {
    "table_name": "user_favorites",
    "column_name": "user_id",
    "constraint_name": "user_favorites_user_id_content_id_content_type_key"
  }
]

---

## 3. Índices

### 3.1 Todos los Índices

[
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "ai_conversations_pkey",
    "indexdef": "CREATE UNIQUE INDEX ai_conversations_pkey ON public.ai_conversations USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "idx_ai_conversations_updated_at",
    "indexdef": "CREATE INDEX idx_ai_conversations_updated_at ON public.ai_conversations USING btree (updated_at DESC)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "idx_ai_conversations_user_id",
    "indexdef": "CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_folders",
    "indexname": "ai_folders_pkey",
    "indexdef": "CREATE UNIQUE INDEX ai_folders_pkey ON public.ai_folders USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "ai_messages_pkey",
    "indexdef": "CREATE UNIQUE INDEX ai_messages_pkey ON public.ai_messages USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "idx_ai_messages_conversation_id",
    "indexdef": "CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages USING btree (conversation_id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "idx_ai_messages_created_at",
    "indexdef": "CREATE INDEX idx_ai_messages_created_at ON public.ai_messages USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "indexname": "ai_usage_tracking_pkey",
    "indexdef": "CREATE UNIQUE INDEX ai_usage_tracking_pkey ON public.ai_usage_tracking USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "indexname": "ai_usage_tracking_user_id_date_key",
    "indexdef": "CREATE UNIQUE INDEX ai_usage_tracking_user_id_date_key ON public.ai_usage_tracking USING btree (user_id, date)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "indexname": "idx_ai_usage_tracking_user_date",
    "indexdef": "CREATE INDEX idx_ai_usage_tracking_user_date ON public.ai_usage_tracking USING btree (user_id, date)"
  },
  {
    "schemaname": "public",
    "tablename": "bans",
    "indexname": "bans_pkey",
    "indexdef": "CREATE UNIQUE INDEX bans_pkey ON public.bans USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "chat_groups",
    "indexname": "chat_groups_pkey",
    "indexdef": "CREATE UNIQUE INDEX chat_groups_pkey ON public.chat_groups USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "gimmick_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX gimmick_categories_pkey ON public.gimmick_categories USING btree (gimmick_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_category_id",
    "indexdef": "CREATE INDEX idx_gimmick_categories_category_id ON public.gimmick_categories USING btree (category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_created_at",
    "indexdef": "CREATE INDEX idx_gimmick_categories_created_at ON public.gimmick_categories USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_gimmick_id",
    "indexdef": "CREATE INDEX idx_gimmick_categories_gimmick_id ON public.gimmick_categories USING btree (gimmick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "indexname": "gimmicks_pkey",
    "indexdef": "CREATE UNIQUE INDEX gimmicks_pkey ON public.gimmicks USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "indexname": "idx_gimmicks_user_id",
    "indexdef": "CREATE INDEX idx_gimmicks_user_id ON public.gimmicks USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "indexname": "group_members_pkey",
    "indexdef": "CREATE UNIQUE INDEX group_members_pkey ON public.group_members USING btree (group_id, user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_angles",
    "indexdef": "CREATE INDEX idx_magic_tricks_angles ON public.magic_tricks USING gin (angles jsonb_path_ops) WHERE ((angles IS NOT NULL) AND (angles <> '[]'::jsonb))"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_reset",
    "indexdef": "CREATE INDEX idx_magic_tricks_reset ON public.magic_tricks USING btree (reset) WHERE (reset IS NOT NULL)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_search_vector",
    "indexdef": "CREATE INDEX idx_magic_tricks_search_vector ON public.magic_tricks USING gin (search_vector)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_created",
    "indexdef": "CREATE INDEX idx_magic_tricks_user_created ON public.magic_tricks USING btree (user_id, created_at DESC)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_difficulty",
    "indexdef": "CREATE INDEX idx_magic_tricks_user_difficulty ON public.magic_tricks USING btree (user_id, difficulty) WHERE (difficulty IS NOT NULL)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_duration",
    "indexdef": "CREATE INDEX idx_magic_tricks_user_duration ON public.magic_tricks USING btree (user_id, duration) WHERE (duration IS NOT NULL)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_id",
    "indexdef": "CREATE INDEX idx_magic_tricks_user_id ON public.magic_tricks USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_trick_user_category",
    "indexdef": "CREATE INDEX idx_trick_user_category ON public.magic_tricks USING btree (user_id, id)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "magic_tricks_pkey",
    "indexdef": "CREATE UNIQUE INDEX magic_tricks_pkey ON public.magic_tricks USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "indexname": "idx_messages_group_id",
    "indexdef": "CREATE INDEX idx_messages_group_id ON public.messages USING btree (group_id)"
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "indexname": "messages_pkey",
    "indexdef": "CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_categories",
    "indexname": "predefined_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX predefined_categories_pkey ON public.predefined_categories USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_usage_count",
    "indexdef": "CREATE INDEX idx_predefined_tags_usage_count ON public.predefined_tags USING btree (usage_count DESC)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_user",
    "indexdef": "CREATE INDEX idx_predefined_tags_user ON public.predefined_tags USING btree (user_id, name)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_user_id",
    "indexdef": "CREATE INDEX idx_predefined_tags_user_id ON public.predefined_tags USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "predefined_tags_pkey",
    "indexdef": "CREATE UNIQUE INDEX predefined_tags_pkey ON public.predefined_tags USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "predefined_tags_user_id_name_key",
    "indexdef": "CREATE UNIQUE INDEX predefined_tags_user_id_name_key ON public.predefined_tags USING btree (user_id, name)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_follower_count",
    "indexdef": "CREATE INDEX idx_profiles_follower_count ON public.profiles USING btree (follower_count)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_following_count",
    "indexdef": "CREATE INDEX idx_profiles_following_count ON public.profiles USING btree (following_count)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_username",
    "indexdef": "CREATE INDEX idx_profiles_username ON public.profiles USING btree (username)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_email_key",
    "indexdef": "CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_pkey",
    "indexdef": "CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_username_key",
    "indexdef": "CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username)"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "indexname": "idx_purchases_buyer_id",
    "indexdef": "CREATE INDEX idx_purchases_buyer_id ON public.purchases USING btree (buyer_id)"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "indexname": "idx_purchases_seller_id",
    "indexdef": "CREATE INDEX idx_purchases_seller_id ON public.purchases USING btree (seller_id)"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "indexname": "purchases_pkey",
    "indexdef": "CREATE UNIQUE INDEX purchases_pkey ON public.purchases USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "indexname": "idx_reports_reported_id",
    "indexdef": "CREATE INDEX idx_reports_reported_id ON public.reports USING btree (reported_id)"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "indexname": "idx_reports_reporter_id",
    "indexdef": "CREATE INDEX idx_reports_reporter_id ON public.reports USING btree (reporter_id)"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "indexname": "reports_pkey",
    "indexdef": "CREATE UNIQUE INDEX reports_pkey ON public.reports USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "indexname": "roles_name_key",
    "indexdef": "CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name)"
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "indexname": "roles_pkey",
    "indexdef": "CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "scripts",
    "indexname": "scripts_pkey",
    "indexdef": "CREATE UNIQUE INDEX scripts_pkey ON public.scripts USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "idx_shared_content_content",
    "indexdef": "CREATE INDEX idx_shared_content_content ON public.shared_content USING btree (content_id, content_type)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "idx_shared_content_owner",
    "indexdef": "CREATE INDEX idx_shared_content_owner ON public.shared_content USING btree (owner_id)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "idx_shared_content_shared_with",
    "indexdef": "CREATE INDEX idx_shared_content_shared_with ON public.shared_content USING btree (shared_with)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "shared_content_content_id_content_type_shared_with_key",
    "indexdef": "CREATE UNIQUE INDEX shared_content_content_id_content_type_shared_with_key ON public.shared_content USING btree (content_id, content_type, shared_with)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "shared_content_pkey",
    "indexdef": "CREATE UNIQUE INDEX shared_content_pkey ON public.shared_content USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_category_id",
    "indexdef": "CREATE INDEX idx_technique_categories_category_id ON public.technique_categories USING btree (category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_created_at",
    "indexdef": "CREATE INDEX idx_technique_categories_created_at ON public.technique_categories USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_technique_id",
    "indexdef": "CREATE INDEX idx_technique_categories_technique_id ON public.technique_categories USING btree (technique_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "technique_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX technique_categories_pkey ON public.technique_categories USING btree (technique_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_created_at",
    "indexdef": "CREATE INDEX idx_technique_tags_created_at ON public.technique_tags USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_tag_id",
    "indexdef": "CREATE INDEX idx_technique_tags_tag_id ON public.technique_tags USING btree (tag_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_technique_id",
    "indexdef": "CREATE INDEX idx_technique_tags_technique_id ON public.technique_tags USING btree (technique_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "technique_tags_pkey",
    "indexdef": "CREATE UNIQUE INDEX technique_tags_pkey ON public.technique_tags USING btree (technique_id, tag_id)"
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "indexname": "idx_techniques_user_id",
    "indexdef": "CREATE INDEX idx_techniques_user_id ON public.techniques USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "indexname": "techniques_pkey",
    "indexdef": "CREATE UNIQUE INDEX techniques_pkey ON public.techniques USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "indexname": "idx_trick_categories_composite",
    "indexdef": "CREATE INDEX idx_trick_categories_composite ON public.trick_categories USING btree (category_id, trick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "indexname": "trick_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_categories_pkey ON public.trick_categories USING btree (trick_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_gimmicks",
    "indexname": "trick_gimmicks_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_gimmicks_pkey ON public.trick_gimmicks USING btree (trick_id, gimmick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "indexname": "idx_trick_photos_trick_id",
    "indexdef": "CREATE INDEX idx_trick_photos_trick_id ON public.trick_photos USING btree (trick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "indexname": "trick_photos_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_photos_pkey ON public.trick_photos USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "indexname": "idx_trick_tags_trick_lookup",
    "indexdef": "CREATE INDEX idx_trick_tags_trick_lookup ON public.trick_tags USING btree (trick_id, tag_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "indexname": "trick_tags_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_tags_pkey ON public.trick_tags USING btree (trick_id, tag_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_techniques",
    "indexname": "trick_techniques_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_techniques_pkey ON public.trick_techniques USING btree (trick_id, technique_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_categories",
    "indexname": "user_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_categories_pkey ON public.user_categories USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "idx_user_category_order_position",
    "indexdef": "CREATE INDEX idx_user_category_order_position ON public.user_category_order USING btree (user_id, \"position\")"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "idx_user_category_order_user_id",
    "indexdef": "CREATE INDEX idx_user_category_order_user_id ON public.user_category_order USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "user_category_order_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_category_order_pkey ON public.user_category_order USING btree (user_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_content",
    "indexdef": "CREATE INDEX idx_user_favorites_content ON public.user_favorites USING btree (content_id, content_type)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_trick_lookup",
    "indexdef": "CREATE INDEX idx_user_favorites_trick_lookup ON public.user_favorites USING btree (user_id, content_id) WHERE ((content_type)::text = 'trick'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_user_id",
    "indexdef": "CREATE INDEX idx_user_favorites_user_id ON public.user_favorites USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "user_favorites_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_favorites_pkey ON public.user_favorites USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "user_favorites_user_id_content_id_content_type_key",
    "indexdef": "CREATE UNIQUE INDEX user_favorites_user_id_content_id_content_type_key ON public.user_favorites USING btree (user_id, content_id, content_type)"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_created_at",
    "indexdef": "CREATE INDEX idx_user_library_items_created_at ON public.user_library_items USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_type",
    "indexdef": "CREATE INDEX idx_user_library_items_type ON public.user_library_items USING btree (type)"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_user_id",
    "indexdef": "CREATE INDEX idx_user_library_items_user_id ON public.user_library_items USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "indexname": "idx_user_relationships_follower_id",
    "indexdef": "CREATE INDEX idx_user_relationships_follower_id ON public.user_relationships USING btree (follower_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "indexname": "idx_user_relationships_following_id",
    "indexdef": "CREATE INDEX idx_user_relationships_following_id ON public.user_relationships USING btree (following_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "indexname": "user_relationships_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_relationships_pkey ON public.user_relationships USING btree (follower_id, following_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_roles",
    "indexname": "user_roles_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (user_id, role_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_position",
    "indexdef": "CREATE INDEX idx_user_trick_order_position ON public.user_trick_order USING btree (user_id, category_id, \"position\")"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_trick",
    "indexdef": "CREATE INDEX idx_user_trick_order_trick ON public.user_trick_order USING btree (trick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_user_category",
    "indexdef": "CREATE INDEX idx_user_trick_order_user_category ON public.user_trick_order USING btree (user_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "user_trick_order_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_trick_order_pkey ON public.user_trick_order USING btree (user_id, category_id, trick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "video_processing_queue",
    "indexname": "video_processing_queue_pkey",
    "indexdef": "CREATE UNIQUE INDEX video_processing_queue_pkey ON public.video_processing_queue USING btree (id)"
  }
]

### 3.2 Índices GIN (Full-Text Search y JSONB)

Success. No rows returned


### 3.3 Índices BTREE (Queries Normales)

[
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "ai_conversations_pkey",
    "indexdef": "CREATE UNIQUE INDEX ai_conversations_pkey ON public.ai_conversations USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "idx_ai_conversations_updated_at",
    "indexdef": "CREATE INDEX idx_ai_conversations_updated_at ON public.ai_conversations USING btree (updated_at DESC)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "idx_ai_conversations_user_id",
    "indexdef": "CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_folders",
    "indexname": "ai_folders_pkey",
    "indexdef": "CREATE UNIQUE INDEX ai_folders_pkey ON public.ai_folders USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "ai_messages_pkey",
    "indexdef": "CREATE UNIQUE INDEX ai_messages_pkey ON public.ai_messages USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "idx_ai_messages_conversation_id",
    "indexdef": "CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages USING btree (conversation_id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "idx_ai_messages_created_at",
    "indexdef": "CREATE INDEX idx_ai_messages_created_at ON public.ai_messages USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "indexname": "ai_usage_tracking_pkey",
    "indexdef": "CREATE UNIQUE INDEX ai_usage_tracking_pkey ON public.ai_usage_tracking USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "indexname": "ai_usage_tracking_user_id_date_key",
    "indexdef": "CREATE UNIQUE INDEX ai_usage_tracking_user_id_date_key ON public.ai_usage_tracking USING btree (user_id, date)"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "indexname": "idx_ai_usage_tracking_user_date",
    "indexdef": "CREATE INDEX idx_ai_usage_tracking_user_date ON public.ai_usage_tracking USING btree (user_id, date)"
  },
  {
    "schemaname": "public",
    "tablename": "bans",
    "indexname": "bans_pkey",
    "indexdef": "CREATE UNIQUE INDEX bans_pkey ON public.bans USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "chat_groups",
    "indexname": "chat_groups_pkey",
    "indexdef": "CREATE UNIQUE INDEX chat_groups_pkey ON public.chat_groups USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "gimmick_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX gimmick_categories_pkey ON public.gimmick_categories USING btree (gimmick_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_category_id",
    "indexdef": "CREATE INDEX idx_gimmick_categories_category_id ON public.gimmick_categories USING btree (category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_created_at",
    "indexdef": "CREATE INDEX idx_gimmick_categories_created_at ON public.gimmick_categories USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_gimmick_id",
    "indexdef": "CREATE INDEX idx_gimmick_categories_gimmick_id ON public.gimmick_categories USING btree (gimmick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "indexname": "gimmicks_pkey",
    "indexdef": "CREATE UNIQUE INDEX gimmicks_pkey ON public.gimmicks USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "indexname": "idx_gimmicks_user_id",
    "indexdef": "CREATE INDEX idx_gimmicks_user_id ON public.gimmicks USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "indexname": "group_members_pkey",
    "indexdef": "CREATE UNIQUE INDEX group_members_pkey ON public.group_members USING btree (group_id, user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_reset",
    "indexdef": "CREATE INDEX idx_magic_tricks_reset ON public.magic_tricks USING btree (reset) WHERE (reset IS NOT NULL)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_created",
    "indexdef": "CREATE INDEX idx_magic_tricks_user_created ON public.magic_tricks USING btree (user_id, created_at DESC)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_difficulty",
    "indexdef": "CREATE INDEX idx_magic_tricks_user_difficulty ON public.magic_tricks USING btree (user_id, difficulty) WHERE (difficulty IS NOT NULL)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_duration",
    "indexdef": "CREATE INDEX idx_magic_tricks_user_duration ON public.magic_tricks USING btree (user_id, duration) WHERE (duration IS NOT NULL)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_id",
    "indexdef": "CREATE INDEX idx_magic_tricks_user_id ON public.magic_tricks USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_trick_user_category",
    "indexdef": "CREATE INDEX idx_trick_user_category ON public.magic_tricks USING btree (user_id, id)"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "magic_tricks_pkey",
    "indexdef": "CREATE UNIQUE INDEX magic_tricks_pkey ON public.magic_tricks USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "indexname": "idx_messages_group_id",
    "indexdef": "CREATE INDEX idx_messages_group_id ON public.messages USING btree (group_id)"
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "indexname": "messages_pkey",
    "indexdef": "CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_categories",
    "indexname": "predefined_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX predefined_categories_pkey ON public.predefined_categories USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_usage_count",
    "indexdef": "CREATE INDEX idx_predefined_tags_usage_count ON public.predefined_tags USING btree (usage_count DESC)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_user",
    "indexdef": "CREATE INDEX idx_predefined_tags_user ON public.predefined_tags USING btree (user_id, name)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_user_id",
    "indexdef": "CREATE INDEX idx_predefined_tags_user_id ON public.predefined_tags USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "predefined_tags_pkey",
    "indexdef": "CREATE UNIQUE INDEX predefined_tags_pkey ON public.predefined_tags USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "predefined_tags_user_id_name_key",
    "indexdef": "CREATE UNIQUE INDEX predefined_tags_user_id_name_key ON public.predefined_tags USING btree (user_id, name)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_follower_count",
    "indexdef": "CREATE INDEX idx_profiles_follower_count ON public.profiles USING btree (follower_count)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_following_count",
    "indexdef": "CREATE INDEX idx_profiles_following_count ON public.profiles USING btree (following_count)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_username",
    "indexdef": "CREATE INDEX idx_profiles_username ON public.profiles USING btree (username)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_email_key",
    "indexdef": "CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_pkey",
    "indexdef": "CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_username_key",
    "indexdef": "CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username)"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "indexname": "idx_purchases_buyer_id",
    "indexdef": "CREATE INDEX idx_purchases_buyer_id ON public.purchases USING btree (buyer_id)"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "indexname": "idx_purchases_seller_id",
    "indexdef": "CREATE INDEX idx_purchases_seller_id ON public.purchases USING btree (seller_id)"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "indexname": "purchases_pkey",
    "indexdef": "CREATE UNIQUE INDEX purchases_pkey ON public.purchases USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "indexname": "idx_reports_reported_id",
    "indexdef": "CREATE INDEX idx_reports_reported_id ON public.reports USING btree (reported_id)"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "indexname": "idx_reports_reporter_id",
    "indexdef": "CREATE INDEX idx_reports_reporter_id ON public.reports USING btree (reporter_id)"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "indexname": "reports_pkey",
    "indexdef": "CREATE UNIQUE INDEX reports_pkey ON public.reports USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "indexname": "roles_name_key",
    "indexdef": "CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name)"
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "indexname": "roles_pkey",
    "indexdef": "CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "scripts",
    "indexname": "scripts_pkey",
    "indexdef": "CREATE UNIQUE INDEX scripts_pkey ON public.scripts USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "idx_shared_content_content",
    "indexdef": "CREATE INDEX idx_shared_content_content ON public.shared_content USING btree (content_id, content_type)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "idx_shared_content_owner",
    "indexdef": "CREATE INDEX idx_shared_content_owner ON public.shared_content USING btree (owner_id)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "idx_shared_content_shared_with",
    "indexdef": "CREATE INDEX idx_shared_content_shared_with ON public.shared_content USING btree (shared_with)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "shared_content_content_id_content_type_shared_with_key",
    "indexdef": "CREATE UNIQUE INDEX shared_content_content_id_content_type_shared_with_key ON public.shared_content USING btree (content_id, content_type, shared_with)"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "shared_content_pkey",
    "indexdef": "CREATE UNIQUE INDEX shared_content_pkey ON public.shared_content USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_category_id",
    "indexdef": "CREATE INDEX idx_technique_categories_category_id ON public.technique_categories USING btree (category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_created_at",
    "indexdef": "CREATE INDEX idx_technique_categories_created_at ON public.technique_categories USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_technique_id",
    "indexdef": "CREATE INDEX idx_technique_categories_technique_id ON public.technique_categories USING btree (technique_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "technique_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX technique_categories_pkey ON public.technique_categories USING btree (technique_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_created_at",
    "indexdef": "CREATE INDEX idx_technique_tags_created_at ON public.technique_tags USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_tag_id",
    "indexdef": "CREATE INDEX idx_technique_tags_tag_id ON public.technique_tags USING btree (tag_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_technique_id",
    "indexdef": "CREATE INDEX idx_technique_tags_technique_id ON public.technique_tags USING btree (technique_id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "technique_tags_pkey",
    "indexdef": "CREATE UNIQUE INDEX technique_tags_pkey ON public.technique_tags USING btree (technique_id, tag_id)"
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "indexname": "idx_techniques_user_id",
    "indexdef": "CREATE INDEX idx_techniques_user_id ON public.techniques USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "indexname": "techniques_pkey",
    "indexdef": "CREATE UNIQUE INDEX techniques_pkey ON public.techniques USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "indexname": "idx_trick_categories_composite",
    "indexdef": "CREATE INDEX idx_trick_categories_composite ON public.trick_categories USING btree (category_id, trick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "indexname": "trick_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_categories_pkey ON public.trick_categories USING btree (trick_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_gimmicks",
    "indexname": "trick_gimmicks_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_gimmicks_pkey ON public.trick_gimmicks USING btree (trick_id, gimmick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "indexname": "idx_trick_photos_trick_id",
    "indexdef": "CREATE INDEX idx_trick_photos_trick_id ON public.trick_photos USING btree (trick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "indexname": "trick_photos_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_photos_pkey ON public.trick_photos USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "indexname": "idx_trick_tags_trick_lookup",
    "indexdef": "CREATE INDEX idx_trick_tags_trick_lookup ON public.trick_tags USING btree (trick_id, tag_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "indexname": "trick_tags_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_tags_pkey ON public.trick_tags USING btree (trick_id, tag_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trick_techniques",
    "indexname": "trick_techniques_pkey",
    "indexdef": "CREATE UNIQUE INDEX trick_techniques_pkey ON public.trick_techniques USING btree (trick_id, technique_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_categories",
    "indexname": "user_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_categories_pkey ON public.user_categories USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "idx_user_category_order_position",
    "indexdef": "CREATE INDEX idx_user_category_order_position ON public.user_category_order USING btree (user_id, \"position\")"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "idx_user_category_order_user_id",
    "indexdef": "CREATE INDEX idx_user_category_order_user_id ON public.user_category_order USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "user_category_order_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_category_order_pkey ON public.user_category_order USING btree (user_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_content",
    "indexdef": "CREATE INDEX idx_user_favorites_content ON public.user_favorites USING btree (content_id, content_type)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_trick_lookup",
    "indexdef": "CREATE INDEX idx_user_favorites_trick_lookup ON public.user_favorites USING btree (user_id, content_id) WHERE ((content_type)::text = 'trick'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_user_id",
    "indexdef": "CREATE INDEX idx_user_favorites_user_id ON public.user_favorites USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "user_favorites_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_favorites_pkey ON public.user_favorites USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "user_favorites_user_id_content_id_content_type_key",
    "indexdef": "CREATE UNIQUE INDEX user_favorites_user_id_content_id_content_type_key ON public.user_favorites USING btree (user_id, content_id, content_type)"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_created_at",
    "indexdef": "CREATE INDEX idx_user_library_items_created_at ON public.user_library_items USING btree (created_at)"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_type",
    "indexdef": "CREATE INDEX idx_user_library_items_type ON public.user_library_items USING btree (type)"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_user_id",
    "indexdef": "CREATE INDEX idx_user_library_items_user_id ON public.user_library_items USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "indexname": "idx_user_relationships_follower_id",
    "indexdef": "CREATE INDEX idx_user_relationships_follower_id ON public.user_relationships USING btree (follower_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "indexname": "idx_user_relationships_following_id",
    "indexdef": "CREATE INDEX idx_user_relationships_following_id ON public.user_relationships USING btree (following_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "indexname": "user_relationships_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_relationships_pkey ON public.user_relationships USING btree (follower_id, following_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_roles",
    "indexname": "user_roles_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (user_id, role_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_position",
    "indexdef": "CREATE INDEX idx_user_trick_order_position ON public.user_trick_order USING btree (user_id, category_id, \"position\")"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_trick",
    "indexdef": "CREATE INDEX idx_user_trick_order_trick ON public.user_trick_order USING btree (trick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_user_category",
    "indexdef": "CREATE INDEX idx_user_trick_order_user_category ON public.user_trick_order USING btree (user_id, category_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "user_trick_order_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_trick_order_pkey ON public.user_trick_order USING btree (user_id, category_id, trick_id)"
  },
  {
    "schemaname": "public",
    "tablename": "video_processing_queue",
    "indexname": "video_processing_queue_pkey",
    "indexdef": "CREATE UNIQUE INDEX video_processing_queue_pkey ON public.video_processing_queue USING btree (id)"
  }
]

### 3.4 Estadísticas de Uso de Índices

[
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "indexname": "trick_tags_pkey",
    "veces_usado": 20461,
    "filas_leidas": 20851,
    "filas_retornadas": 7303,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "indexname": "trick_categories_pkey",
    "veces_usado": 13933,
    "filas_leidas": 15822,
    "filas_retornadas": 7637,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "magic_tricks_pkey",
    "veces_usado": 9053,
    "filas_leidas": 9165,
    "filas_retornadas": 8381,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "indexname": "idx_trick_photos_trick_id",
    "veces_usado": 6010,
    "filas_leidas": 2255,
    "filas_retornadas": 2026,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "indexname": "idx_gimmicks_user_id",
    "veces_usado": 2644,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_technique_id",
    "veces_usado": 2186,
    "filas_leidas": 1382,
    "filas_retornadas": 2,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_technique_id",
    "veces_usado": 2138,
    "filas_leidas": 1333,
    "filas_retornadas": 3,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "idx_shared_content_shared_with",
    "veces_usado": 1840,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "user_favorites_user_id_content_id_content_type_key",
    "veces_usado": 1366,
    "filas_leidas": 2020,
    "filas_retornadas": 2016,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "indexname": "idx_techniques_user_id",
    "veces_usado": 878,
    "filas_leidas": 128,
    "filas_retornadas": 128,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "user_category_order_pkey",
    "veces_usado": 655,
    "filas_leidas": 906,
    "filas_retornadas": 651,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "technique_categories_pkey",
    "veces_usado": 609,
    "filas_leidas": 58,
    "filas_retornadas": 57,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_content",
    "veces_usado": 448,
    "filas_leidas": 223,
    "filas_retornadas": 218,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "trick_techniques",
    "indexname": "trick_techniques_pkey",
    "veces_usado": 343,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "trick_gimmicks",
    "indexname": "trick_gimmicks_pkey",
    "veces_usado": 334,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_categories",
    "indexname": "user_categories_pkey",
    "veces_usado": 325,
    "filas_leidas": 737,
    "filas_retornadas": 705,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_id",
    "veces_usado": 318,
    "filas_leidas": 2539,
    "filas_retornadas": 2521,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_pkey",
    "veces_usado": 273,
    "filas_leidas": 271,
    "filas_retornadas": 271,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "idx_user_category_order_position",
    "veces_usado": 208,
    "filas_leidas": 2178,
    "filas_retornadas": 115,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "user_trick_order_pkey",
    "veces_usado": 193,
    "filas_leidas": 211,
    "filas_retornadas": 145,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_trick_user_category",
    "veces_usado": 181,
    "filas_leidas": 266,
    "filas_retornadas": 224,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "ai_conversations_pkey",
    "veces_usado": 120,
    "filas_leidas": 165,
    "filas_retornadas": 120,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "idx_ai_messages_conversation_id",
    "veces_usado": 113,
    "filas_leidas": 895,
    "filas_retornadas": 895,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_created",
    "veces_usado": 111,
    "filas_leidas": 2424,
    "filas_retornadas": 2361,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "indexname": "idx_ai_usage_tracking_user_date",
    "veces_usado": 65,
    "filas_leidas": 44,
    "filas_retornadas": 44,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "idx_shared_content_content",
    "veces_usado": 51,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_position",
    "veces_usado": 45,
    "filas_leidas": 360,
    "filas_retornadas": 296,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "chat_groups",
    "indexname": "chat_groups_pkey",
    "veces_usado": 34,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "indexname": "idx_trick_categories_composite",
    "veces_usado": 33,
    "filas_leidas": 86,
    "filas_retornadas": 82,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "indexname": "group_members_pkey",
    "veces_usado": 33,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_categories",
    "indexname": "predefined_categories_pkey",
    "veces_usado": 33,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "bans",
    "indexname": "bans_pkey",
    "veces_usado": 32,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "indexname": "gimmicks_pkey",
    "veces_usado": 31,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "idx_ai_conversations_user_id",
    "veces_usado": 30,
    "filas_leidas": 82,
    "filas_retornadas": 50,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_tag_id",
    "veces_usado": 26,
    "filas_leidas": 3,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "gimmick_categories_pkey",
    "veces_usado": 24,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "indexname": "messages_pkey",
    "veces_usado": 23,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "indexname": "ai_usage_tracking_user_id_date_key",
    "veces_usado": 21,
    "filas_leidas": 18,
    "filas_retornadas": 18,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "indexname": "purchases_pkey",
    "veces_usado": 20,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "scripts",
    "indexname": "scripts_pkey",
    "veces_usado": 20,
    "filas_leidas": 6,
    "filas_retornadas": 6,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "indexname": "ai_usage_tracking_pkey",
    "veces_usado": 19,
    "filas_leidas": 26,
    "filas_retornadas": 26,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "indexname": "reports_pkey",
    "veces_usado": 17,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "user_favorites_pkey",
    "veces_usado": 16,
    "filas_leidas": 37,
    "filas_retornadas": 30,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_roles",
    "indexname": "user_roles_pkey",
    "veces_usado": 16,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "indexname": "techniques_pkey",
    "veces_usado": 16,
    "filas_leidas": 3,
    "filas_retornadas": 3,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "technique_tags_pkey",
    "veces_usado": 16,
    "filas_leidas": 7,
    "filas_retornadas": 6,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "shared_content_pkey",
    "veces_usado": 15,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "indexname": "roles_pkey",
    "veces_usado": 15,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "indexname": "idx_trick_tags_trick_lookup",
    "veces_usado": 14,
    "filas_leidas": 85,
    "filas_retornadas": 78,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "indexname": "user_relationships_pkey",
    "veces_usado": 14,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_type",
    "veces_usado": 13,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "ai_folders",
    "indexname": "ai_folders_pkey",
    "veces_usado": 12,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "predefined_tags_pkey",
    "veces_usado": 8,
    "filas_leidas": 8,
    "filas_retornadas": 8,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "video_processing_queue",
    "indexname": "video_processing_queue_pkey",
    "veces_usado": 6,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "ai_messages_pkey",
    "veces_usado": 5,
    "filas_leidas": 20,
    "filas_retornadas": 20,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "idx_shared_content_owner",
    "veces_usado": 3,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "indexname": "idx_user_relationships_following_id",
    "veces_usado": 3,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "indexname": "idx_user_relationships_follower_id",
    "veces_usado": 3,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_search_vector",
    "veces_usado": 3,
    "filas_leidas": 10,
    "filas_retornadas": 0,
    "tamaño": "32 kB"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_category_id",
    "veces_usado": 3,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_category_id",
    "veces_usado": 3,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "indexname": "idx_purchases_buyer_id",
    "veces_usado": 2,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "indexname": "idx_reports_reported_id",
    "veces_usado": 2,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "indexname": "idx_reports_reporter_id",
    "veces_usado": 2,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "indexname": "idx_purchases_seller_id",
    "veces_usado": 2,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "indexname": "trick_photos_pkey",
    "veces_usado": 1,
    "filas_leidas": 7,
    "filas_retornadas": 7,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_usage_count",
    "veces_usado": 1,
    "filas_leidas": 41,
    "filas_retornadas": 18,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_email_key",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_reset",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_username_key",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_username",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_follower_count",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_following_count",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_duration",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_difficulty",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_user_id",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_trick_lookup",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_created_at",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_user_id",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_created_at",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "idx_ai_conversations_updated_at",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_gimmick_id",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "indexname": "roles_name_key",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_user",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "idx_ai_messages_created_at",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "predefined_tags_user_id_name_key",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_user_id",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_created_at",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "idx_user_category_order_user_id",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "shared_content_content_id_content_type_shared_with_key",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_user_category",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_created_at",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "indexname": "idx_messages_group_id",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_trick",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_angles",
    "veces_usado": 0,
    "filas_leidas": 0,
    "filas_retornadas": 0,
    "tamaño": "24 kB"
  }
]

### 3.5 Índices No Usados (Candidatos para Eliminar)

[
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_angles",
    "veces_usado": 0,
    "tamaño_desperdiciado": "24 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_trick",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_reset",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_email_key",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_username_key",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_username",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_follower_count",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "idx_profiles_following_count",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "indexname": "idx_ai_conversations_updated_at",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "indexname": "idx_ai_messages_created_at",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "indexname": "idx_user_category_order_user_id",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "indexname": "idx_user_trick_order_user_category",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_user_id",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "predefined_tags_user_id_name_key",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "indexname": "idx_predefined_tags_user",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_user_id",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_difficulty",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "indexname": "idx_magic_tricks_user_duration",
    "veces_usado": 0,
    "tamaño_desperdiciado": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "indexname": "idx_technique_categories_created_at",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "indexname": "idx_technique_tags_created_at",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_user_id",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "indexname": "shared_content_content_id_content_type_shared_with_key",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "indexname": "roles_name_key",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_gimmick_id",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "indexname": "idx_gimmick_categories_created_at",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "indexname": "idx_messages_group_id",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "indexname": "idx_user_favorites_trick_lookup",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "indexname": "idx_user_library_items_created_at",
    "veces_usado": 0,
    "tamaño_desperdiciado": "8192 bytes"
  }
]

---

## 4. Triggers y Funciones

### 4.1 Todos los Triggers

[
  {
    "trigger_schema": "public",
    "trigger_name": "update_conversation_on_new_message",
    "event_manipulation": "INSERT",
    "event_object_table": "ai_messages",
    "action_statement": "EXECUTE FUNCTION update_ai_conversation_timestamp()",
    "action_timing": "AFTER",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "gimmick_categories_validate_category",
    "event_manipulation": "UPDATE",
    "event_object_table": "gimmick_categories",
    "action_statement": "EXECUTE FUNCTION validate_category_reference()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "gimmick_categories_validate_category",
    "event_manipulation": "INSERT",
    "event_object_table": "gimmick_categories",
    "action_statement": "EXECUTE FUNCTION validate_category_reference()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "tsvector_update_trigger",
    "event_manipulation": "UPDATE",
    "event_object_table": "magic_tricks",
    "action_statement": "EXECUTE FUNCTION magic_tricks_search_vector_update()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "tsvector_update_trigger",
    "event_manipulation": "INSERT",
    "event_object_table": "magic_tricks",
    "action_statement": "EXECUTE FUNCTION magic_tricks_search_vector_update()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "update_profiles_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "profiles",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "technique_categories_validate_category",
    "event_manipulation": "UPDATE",
    "event_object_table": "technique_categories",
    "action_statement": "EXECUTE FUNCTION validate_technique_category_reference()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "technique_categories_validate_category",
    "event_manipulation": "INSERT",
    "event_object_table": "technique_categories",
    "action_statement": "EXECUTE FUNCTION validate_technique_category_reference()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "technique_tags_usage_trigger",
    "event_manipulation": "DELETE",
    "event_object_table": "technique_tags",
    "action_statement": "EXECUTE FUNCTION handle_technique_tag_usage()",
    "action_timing": "AFTER",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "technique_tags_usage_trigger",
    "event_manipulation": "INSERT",
    "event_object_table": "technique_tags",
    "action_statement": "EXECUTE FUNCTION handle_technique_tag_usage()",
    "action_timing": "AFTER",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "trick_photos_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "trick_photos",
    "action_statement": "EXECUTE FUNCTION update_trick_photos_updated_at()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "update_user_category_order_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "user_category_order",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "update_follower_counts_trigger",
    "event_manipulation": "DELETE",
    "event_object_table": "user_relationships",
    "action_statement": "EXECUTE FUNCTION update_follower_counts()",
    "action_timing": "AFTER",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "update_follower_counts_trigger",
    "event_manipulation": "INSERT",
    "event_object_table": "user_relationships",
    "action_statement": "EXECUTE FUNCTION update_follower_counts()",
    "action_timing": "AFTER",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "update_follower_counts_trigger",
    "event_manipulation": "UPDATE",
    "event_object_table": "user_relationships",
    "action_statement": "EXECUTE FUNCTION update_follower_counts()",
    "action_timing": "AFTER",
    "action_orientation": "ROW"
  },
  {
    "trigger_schema": "public",
    "trigger_name": "update_user_trick_order_updated_at",
    "event_manipulation": "UPDATE",
    "event_object_table": "user_trick_order",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "action_timing": "BEFORE",
    "action_orientation": "ROW"
  }
]

### 4.2 Funciones Personalizadas

[
  {
    "schema": "public",
    "nombre_funcion": "check_user_ai_limit",
    "argumentos": "p_user_id uuid",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.check_user_ai_limit(p_user_id uuid)\n RETURNS TABLE(can_query boolean, queries_today integer, queries_limit integer, is_plus boolean)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    v_subscription_type user_subscription_type;\r\n    v_queries_today INTEGER;\r\n    v_limit INTEGER;\r\nBEGIN\r\n    -- Obtener tipo de suscripción\r\n    SELECT subscription_type INTO v_subscription_type\r\n    FROM profiles\r\n    WHERE id = p_user_id;\r\n    \r\n    -- Si es desarrollador, retornar valores especiales\r\n    IF v_subscription_type = 'developer' THEN\r\n        RETURN QUERY\r\n        SELECT \r\n            true,  -- can_query: siempre true\r\n            0,     -- queries_today: mostrar 0 para evitar confusión\r\n            999999, -- queries_limit: número muy alto para indicar \"infinito\"\r\n            true;   -- is_plus: true para tener acceso a todas las funciones\r\n        RETURN;\r\n    END IF;\r\n    \r\n    -- Obtener consultas de hoy para usuarios normales\r\n    SELECT COALESCE(queries_count, 0) INTO v_queries_today\r\n    FROM ai_usage_tracking\r\n    WHERE user_id = p_user_id AND date = CURRENT_DATE;\r\n    \r\n    -- Si no hay registro para hoy, es 0\r\n    IF v_queries_today IS NULL THEN\r\n        v_queries_today := 0;\r\n    END IF;\r\n    \r\n    -- Determinar límite según suscripción\r\n    IF v_subscription_type = 'plus' THEN\r\n        v_limit := 30;\r\n    ELSE\r\n        v_limit := 2;\r\n    END IF;\r\n    \r\n    RETURN QUERY\r\n    SELECT \r\n        v_queries_today < v_limit,\r\n        v_queries_today,\r\n        v_limit,\r\n        v_subscription_type = 'plus';\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "clean_orphaned_orders",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.clean_orphaned_orders()\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    -- Eliminar órdenes de categorías que ya no existen\r\n    DELETE FROM user_category_order uco\r\n    WHERE NOT EXISTS (\r\n        SELECT 1 FROM user_categories uc WHERE uc.id = uco.category_id\r\n        UNION\r\n        SELECT 1 FROM predefined_categories pc WHERE pc.id = uco.category_id\r\n    );\r\n    \r\n    -- Eliminar órdenes de trucos en categorías que ya no existen\r\n    DELETE FROM user_trick_order uto\r\n    WHERE NOT EXISTS (\r\n        SELECT 1 FROM user_categories uc WHERE uc.id = uto.category_id\r\n        UNION\r\n        SELECT 1 FROM predefined_categories pc WHERE pc.id = uto.category_id\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "create_magic_trick",
    "argumentos": "p_trick_id uuid, p_user_id uuid, p_title character varying, p_effect text, p_secret text, p_duration integer, p_angles jsonb, p_notes text, p_special_materials text[], p_is_public boolean, p_status content_status, p_price numeric, p_photo_url text, p_effect_video_url text, p_secret_video_url text, p_reset integer, p_difficulty integer",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.create_magic_trick(p_trick_id uuid, p_user_id uuid, p_title character varying, p_effect text, p_secret text, p_duration integer, p_angles jsonb, p_notes text, p_special_materials text[], p_is_public boolean, p_status content_status, p_price numeric, p_photo_url text, p_effect_video_url text, p_secret_video_url text, p_reset integer, p_difficulty integer)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    INSERT INTO magic_tricks (\r\n        id, user_id, title, effect, secret, duration, angles, notes,\r\n        special_materials, is_public, status, price, photo_url,\r\n        effect_video_url, secret_video_url, views_count, likes_count,\r\n        dislikes_count, version, parent_trick_id, reset, difficulty,\r\n        created_at, updated_at\r\n    ) VALUES (\r\n        p_trick_id, p_user_id, p_title, p_effect, p_secret, p_duration,\r\n        p_angles, p_notes, p_special_materials, p_is_public, p_status,\r\n        p_price, p_photo_url, p_effect_video_url, p_secret_video_url,\r\n        0, 0, 0, 1, NULL, p_reset, p_difficulty, NOW(), NOW()\r\n    );\r\n    \r\n    RETURN p_trick_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "create_technique",
    "argumentos": "p_technique_id uuid, p_user_id uuid, p_name character varying, p_description text, p_difficulty integer, p_angles jsonb, p_notes text, p_special_materials text[], p_image_url text, p_video_url text, p_is_public boolean, p_status content_status, p_price numeric",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.create_technique(p_technique_id uuid, p_user_id uuid, p_name character varying, p_description text, p_difficulty integer, p_angles jsonb, p_notes text, p_special_materials text[], p_image_url text, p_video_url text, p_is_public boolean, p_status content_status, p_price numeric)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    INSERT INTO techniques (\r\n        id, user_id, name, description, difficulty, angles, notes,\r\n        special_materials, image_url, video_url, is_public, status,\r\n        price, created_at, updated_at\r\n    ) VALUES (\r\n        p_technique_id, p_user_id, p_name, p_description, p_difficulty,\r\n        p_angles, p_notes, p_special_materials, p_image_url, p_video_url,\r\n        p_is_public, p_status, p_price, NOW(), NOW()\r\n    );\r\n    \r\n    RETURN p_technique_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "get_category_info",
    "argumentos": "category_uuid uuid",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.get_category_info(category_uuid uuid)\n RETURNS TABLE(id uuid, name character varying, description text, category_type character varying, created_at timestamp with time zone, user_id uuid)\n LANGUAGE sql\n STABLE\nAS $function$\r\n    SELECT \r\n        pc.id,\r\n        pc.name::varchar,\r\n        pc.description,\r\n        'predefined'::varchar as category_type,\r\n        pc.created_at,\r\n        NULL::uuid as user_id\r\n    FROM public.predefined_categories pc \r\n    WHERE pc.id = category_uuid\r\n    \r\n    UNION ALL\r\n    \r\n    SELECT \r\n        uc.id,\r\n        uc.name::varchar,\r\n        uc.description,\r\n        'user'::varchar as category_type,\r\n        uc.created_at,\r\n        uc.user_id\r\n    FROM public.user_categories uc \r\n    WHERE uc.id = category_uuid;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "get_user_ai_stats",
    "argumentos": "p_user_id uuid",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.get_user_ai_stats(p_user_id uuid)\n RETURNS TABLE(total_queries integer, total_tokens integer, queries_this_month integer, average_queries_per_day numeric)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT \r\n        COALESCE(SUM(queries_count), 0)::INTEGER as total_queries,\r\n        COALESCE(SUM(tokens_used), 0)::INTEGER as total_tokens,\r\n        COALESCE(SUM(CASE \r\n            WHEN date >= date_trunc('month', CURRENT_DATE) \r\n            THEN queries_count \r\n            ELSE 0 \r\n        END), 0)::INTEGER as queries_this_month,\r\n        COALESCE(AVG(queries_count), 0)::NUMERIC as average_queries_per_day\r\n    FROM ai_usage_tracking\r\n    WHERE user_id = p_user_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "handle_new_user",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.handle_new_user()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  INSERT INTO public.profiles (\r\n    id, \r\n    email, \r\n    username,\r\n    created_at, \r\n    updated_at,\r\n    is_active,\r\n    follower_count,\r\n    following_count\r\n  )\r\n  VALUES (\r\n    new.id,\r\n    new.email,\r\n    new.raw_user_meta_data->>'username',\r\n    now(),\r\n    now(),\r\n    true,\r\n    0,\r\n    0\r\n  )\r\n  ON CONFLICT (id) DO NOTHING; -- Ignora si ya existe\r\n  \r\n  RETURN new;\r\nEXCEPTION\r\n  WHEN others THEN\r\n    -- Log el error pero no falles la creación del usuario\r\n    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;\r\n    RETURN new;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "handle_technique_tag_usage",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.handle_technique_tag_usage()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    IF TG_OP = 'INSERT' THEN\r\n        -- Incrementar contador cuando se añade una etiqueta a una técnica\r\n        UPDATE public.predefined_tags \r\n        SET usage_count = COALESCE(usage_count, 0) + 1\r\n        WHERE id = NEW.tag_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- Decrementar contador cuando se elimina una etiqueta de una técnica\r\n        UPDATE public.predefined_tags \r\n        SET usage_count = GREATEST(COALESCE(usage_count, 1) - 1, 0)\r\n        WHERE id = OLD.tag_id;\r\n        RETURN OLD;\r\n    END IF;\r\n    RETURN NULL;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "increment_ai_usage",
    "argumentos": "p_user_id uuid, p_tokens integer",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id uuid, p_tokens integer)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    v_subscription_type user_subscription_type;\r\nBEGIN\r\n    -- Verificar si es desarrollador\r\n    SELECT subscription_type INTO v_subscription_type\r\n    FROM profiles\r\n    WHERE id = p_user_id;\r\n    \r\n    -- Si es desarrollador, no incrementar contadores\r\n    IF v_subscription_type = 'developer' THEN\r\n        -- Opcionalmente, podrías registrar el uso pero sin límites\r\n        -- Por ahora, simplemente retornamos sin hacer nada\r\n        RETURN;\r\n    END IF;\r\n    \r\n    -- Para usuarios normales, incrementar como siempre\r\n    INSERT INTO ai_usage_tracking (user_id, date, queries_count, tokens_used)\r\n    VALUES (p_user_id, CURRENT_DATE, 1, p_tokens)\r\n    ON CONFLICT (user_id, date) \r\n    DO UPDATE SET \r\n        queries_count = ai_usage_tracking.queries_count + 1,\r\n        tokens_used = ai_usage_tracking.tokens_used + p_tokens;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "increment_tag_usage",
    "argumentos": "tag_id uuid",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.increment_tag_usage(tag_id uuid)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    UPDATE public.predefined_tags \r\n    SET usage_count = COALESCE(usage_count, 0) + 1\r\n    WHERE id = tag_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "magic_tricks_search_vector_update",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.magic_tricks_search_vector_update()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  -- Usar 'simple' para que funcione con todos los idiomas\r\n  NEW.search_vector := to_tsvector('simple',\r\n    COALESCE(NEW.title::text, '') || ' ' ||\r\n    COALESCE(NEW.effect, '') || ' ' ||\r\n    COALESCE(NEW.secret, '')\r\n  );\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "set_user_as_developer",
    "argumentos": "p_user_id uuid",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.set_user_as_developer(p_user_id uuid)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    UPDATE profiles \r\n    SET subscription_type = 'developer'\r\n    WHERE id = p_user_id;\r\n    \r\n    IF NOT FOUND THEN\r\n        RAISE EXCEPTION 'Usuario no encontrado';\r\n    END IF;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "update_ai_conversation_timestamp",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.update_ai_conversation_timestamp()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    UPDATE ai_conversations \r\n    SET updated_at = NOW(), \r\n        last_message_at = NOW(),\r\n        message_count = message_count + 1\r\n    WHERE id = NEW.conversation_id;\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "update_follower_counts",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.update_follower_counts()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN\r\n        -- Incrementar contador de followers del usuario seguido\r\n        UPDATE profiles \r\n        SET follower_count = follower_count + 1 \r\n        WHERE id = NEW.following_id;\r\n        \r\n        -- Incrementar contador de following del usuario que sigue\r\n        UPDATE profiles \r\n        SET following_count = following_count + 1 \r\n        WHERE id = NEW.follower_id;\r\n    ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN\r\n        -- Decrementar contador de followers del usuario que dejó de ser seguido\r\n        UPDATE profiles \r\n        SET follower_count = GREATEST(follower_count - 1, 0) \r\n        WHERE id = OLD.following_id;\r\n        \r\n        -- Decrementar contador de following del usuario que dejó de seguir\r\n        UPDATE profiles \r\n        SET following_count = GREATEST(following_count - 1, 0) \r\n        WHERE id = OLD.follower_id;\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        -- Si el status cambió a accepted\r\n        IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN\r\n            UPDATE profiles \r\n            SET follower_count = follower_count + 1 \r\n            WHERE id = NEW.following_id;\r\n            \r\n            UPDATE profiles \r\n            SET following_count = following_count + 1 \r\n            WHERE id = NEW.follower_id;\r\n        -- Si el status cambió de accepted a otra cosa\r\n        ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN\r\n            UPDATE profiles \r\n            SET follower_count = GREATEST(follower_count - 1, 0) \r\n            WHERE id = OLD.following_id;\r\n            \r\n            UPDATE profiles \r\n            SET following_count = GREATEST(following_count - 1, 0) \r\n            WHERE id = OLD.follower_id;\r\n        END IF;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "update_trick_photos_updated_at",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.update_trick_photos_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  NEW.updated_at = NOW();\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "update_updated_at_column",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    NEW.updated_at = now();\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "validate_category_exists",
    "argumentos": "category_uuid uuid",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.validate_category_exists(category_uuid uuid)\n RETURNS boolean\n LANGUAGE sql\n STABLE\nAS $function$\r\n    SELECT EXISTS (\r\n        SELECT 1 FROM public.predefined_categories WHERE id = category_uuid\r\n        UNION\r\n        SELECT 1 FROM public.user_categories WHERE id = category_uuid\r\n    );\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "validate_category_reference",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.validate_category_reference()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    IF NOT public.validate_category_exists(NEW.category_id) THEN\r\n        RAISE EXCEPTION 'Category with ID % does not exist in predefined_categories or user_categories', NEW.category_id;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "nombre_funcion": "validate_technique_category_reference",
    "argumentos": "",
    "definicion_completa": "CREATE OR REPLACE FUNCTION public.validate_technique_category_reference()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    IF NOT public.validate_category_exists(NEW.category_id) THEN\r\n        RAISE EXCEPTION 'Category with ID % does not exist in predefined_categories or user_categories', NEW.category_id;\r\n    END IF;\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  }
]

### 4.3 Triggers con Funciones Asociadas

[
  {
    "trigger_name": "RI_ConstraintTrigger_a_107260",
    "tabla": "ai_conversations",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107261",
    "tabla": "ai_conversations",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107241",
    "tabla": "ai_conversations",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107242",
    "tabla": "ai_conversations",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107246",
    "tabla": "ai_conversations",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107247",
    "tabla": "ai_conversations",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107244",
    "tabla": "ai_folders",
    "funcion": "RI_FKey_setnull_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107245",
    "tabla": "ai_folders",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107225",
    "tabla": "ai_folders",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107226",
    "tabla": "ai_folders",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107262",
    "tabla": "ai_messages",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107263",
    "tabla": "ai_messages",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107267",
    "tabla": "ai_messages",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107268",
    "tabla": "ai_messages",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "update_conversation_on_new_message",
    "tabla": "ai_messages",
    "funcion": "update_ai_conversation_timestamp",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107284",
    "tabla": "ai_usage_tracking",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_107285",
    "tabla": "ai_usage_tracking",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18175",
    "tabla": "bans",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18176",
    "tabla": "bans",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18180",
    "tabla": "bans",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18181",
    "tabla": "bans",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18193",
    "tabla": "chat_groups",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18194",
    "tabla": "chat_groups",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18213",
    "tabla": "chat_groups",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18214",
    "tabla": "chat_groups",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18185",
    "tabla": "chat_groups",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18186",
    "tabla": "chat_groups",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_35328",
    "tabla": "gimmick_categories",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_35329",
    "tabla": "gimmick_categories",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_35333",
    "tabla": "gimmick_categories",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_35334",
    "tabla": "gimmick_categories",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "gimmick_categories_validate_category",
    "tabla": "gimmick_categories",
    "funcion": "validate_category_reference",
    "nivel": "ROW",
    "momento": "BEFORE",
    "eventos": "INSERT UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18278",
    "tabla": "gimmicks",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18279",
    "tabla": "gimmicks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_35326",
    "tabla": "gimmicks",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_35327",
    "tabla": "gimmicks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_35331",
    "tabla": "gimmicks",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_35332",
    "tabla": "gimmicks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18190",
    "tabla": "gimmicks",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18191",
    "tabla": "gimmicks",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18195",
    "tabla": "group_members",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18196",
    "tabla": "group_members",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18200",
    "tabla": "group_members",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18201",
    "tabla": "group_members",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_123173",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_123174",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18203",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18204",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18253",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18254",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18273",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18274",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18283",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18284",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18293",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18294",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18303",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18304",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_212318",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_212319",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18205",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18206",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18210",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18211",
    "tabla": "magic_tricks",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "tsvector_update_trigger",
    "tabla": "magic_tricks",
    "funcion": "magic_tricks_search_vector_update",
    "nivel": "ROW",
    "momento": "BEFORE",
    "eventos": "INSERT UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18215",
    "tabla": "messages",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18216",
    "tabla": "messages",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18220",
    "tabla": "messages",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_18221",
    "tabla": "messages",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18288",
    "tabla": "predefined_tags",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18289",
    "tabla": "predefined_tags",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_35437",
    "tabla": "predefined_tags",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_35438",
    "tabla": "predefined_tags",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_40985",
    "tabla": "predefined_tags",
    "funcion": "RI_FKey_check_ins",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "INSERT "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_c_40986",
    "tabla": "predefined_tags",
    "funcion": "RI_FKey_check_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107223",
    "tabla": "profiles",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107224",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107239",
    "tabla": "profiles",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107240",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107265",
    "tabla": "profiles",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107266",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107282",
    "tabla": "profiles",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_107283",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_123154",
    "tabla": "profiles",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_123155",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_123168",
    "tabla": "profiles",
    "funcion": "RI_FKey_cascade_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_123169",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18173",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18174",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18178",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18179",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18183",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18184",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18188",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18189",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18198",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18199",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18208",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18209",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_upd",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "UPDATE "
  },
  {
    "trigger_name": "RI_ConstraintTrigger_a_18218",
    "tabla": "profiles",
    "funcion": "RI_FKey_noaction_del",
    "nivel": "ROW",
    "momento": "AFTER",
    "eventos": "DELETE "
  }
]

**Triggers Importantes:**
- `tsvector_update_trigger` → Actualiza `search_vector` automáticamente cuando cambian title/effect/secret
- `update_updated_at_trigger` → Actualiza `updated_at` en cada UPDATE

---

## 5. Row Level Security (RLS)

### 5.1 Estado de RLS por Tabla

[
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "ai_folders",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "bans",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "chat_groups",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "predefined_categories",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "scripts",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "trick_gimmicks",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "trick_techniques",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "user_categories",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "user_roles",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "video_processing_queue",
    "rls_enabled": false
  }
]

### 5.2 Políticas de RLS

[
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "policyname": "Users can only see their own conversations",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "ALL",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "ai_folders",
    "policyname": "Users can only see their own folders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "ALL",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "policyname": "Users can only see their own messages",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "ALL",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "policyname": "Users can only see their own usage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "ALL",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "policyname": "Users can create own tags",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "INSERT",
    "condicion_using": null,
    "condicion_with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "policyname": "Users can delete own tags",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "DELETE",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "policyname": "Users can update own tags",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "UPDATE",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "policyname": "Users can view own tags",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "SELECT",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "Users can update own encrypted keys",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "UPDATE",
    "condicion_using": "(auth.uid() = id)",
    "condicion_with_check": "(auth.uid() = id)"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "policyname": "Public techniques tags are viewable",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "comando": "SELECT",
    "condicion_using": "(technique_id IN ( SELECT techniques.id\n   FROM techniques\n  WHERE (techniques.is_public = true)))",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "policyname": "Users can manage their own technique tags",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "comando": "ALL",
    "condicion_using": "(technique_id IN ( SELECT techniques.id\n   FROM techniques\n  WHERE (techniques.user_id = auth.uid())))",
    "condicion_with_check": "(technique_id IN ( SELECT techniques.id\n   FROM techniques\n  WHERE (techniques.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "policyname": "Users can delete their own trick photos",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "DELETE",
    "condicion_using": "(EXISTS ( SELECT 1\n   FROM magic_tricks\n  WHERE ((magic_tricks.id = trick_photos.trick_id) AND (magic_tricks.user_id = auth.uid()))))",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "policyname": "Users can insert photos in their own tricks",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "INSERT",
    "condicion_using": null,
    "condicion_with_check": "(EXISTS ( SELECT 1\n   FROM magic_tricks\n  WHERE ((magic_tricks.id = trick_photos.trick_id) AND (magic_tricks.user_id = auth.uid()))))"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "policyname": "Users can update their own trick photos",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "UPDATE",
    "condicion_using": "(EXISTS ( SELECT 1\n   FROM magic_tricks\n  WHERE ((magic_tricks.id = trick_photos.trick_id) AND (magic_tricks.user_id = auth.uid()))))",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "policyname": "Users can view their own trick photos",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "SELECT",
    "condicion_using": "(EXISTS ( SELECT 1\n   FROM magic_tricks\n  WHERE ((magic_tricks.id = trick_photos.trick_id) AND (magic_tricks.user_id = auth.uid()))))",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "policyname": "Users can delete their own category order",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "DELETE",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "policyname": "Users can insert their own category order",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "INSERT",
    "condicion_using": null,
    "condicion_with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "policyname": "Users can update their own category order",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "UPDATE",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "policyname": "Users can view their own category order",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "SELECT",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "policyname": "Users can delete their own trick order",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "DELETE",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "policyname": "Users can insert their own trick order",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "INSERT",
    "condicion_using": null,
    "condicion_with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "policyname": "Users can update their own trick order",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "UPDATE",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "policyname": "Users can view their own trick order",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "comando": "SELECT",
    "condicion_using": "(auth.uid() = user_id)",
    "condicion_with_check": null
  }
]

**Interpretación:**
- RLS asegura que los usuarios solo puedan ver/modificar sus propios trucos
- `auth.uid()` es la función de Supabase que retorna el user_id autenticado

---

## 6. Tipos Personalizados y Enums

### 6.1 Tipos ENUM

[
  {
    "schema": "public",
    "nombre_enum": "ban_type",
    "valor": "temporary"
  },
  {
    "schema": "public",
    "nombre_enum": "ban_type",
    "valor": "permanent"
  },
  {
    "schema": "public",
    "nombre_enum": "content_status",
    "valor": "draft"
  },
  {
    "schema": "public",
    "nombre_enum": "content_status",
    "valor": "published"
  },
  {
    "schema": "public",
    "nombre_enum": "content_status",
    "valor": "under_review"
  },
  {
    "schema": "public",
    "nombre_enum": "content_status",
    "valor": "deleted"
  },
  {
    "schema": "public",
    "nombre_enum": "difficulty_level",
    "valor": "beginner"
  },
  {
    "schema": "public",
    "nombre_enum": "difficulty_level",
    "valor": "intermediate"
  },
  {
    "schema": "public",
    "nombre_enum": "difficulty_level",
    "valor": "advanced"
  },
  {
    "schema": "public",
    "nombre_enum": "difficulty_level",
    "valor": "expert"
  },
  {
    "schema": "public",
    "nombre_enum": "difficulty_level",
    "valor": "easy"
  },
  {
    "schema": "public",
    "nombre_enum": "report_category",
    "valor": "inappropriate_content"
  },
  {
    "schema": "public",
    "nombre_enum": "report_category",
    "valor": "copyright_violation"
  },
  {
    "schema": "public",
    "nombre_enum": "report_category",
    "valor": "spam"
  },
  {
    "schema": "public",
    "nombre_enum": "report_category",
    "valor": "harassment"
  },
  {
    "schema": "public",
    "nombre_enum": "report_category",
    "valor": "other"
  },
  {
    "schema": "public",
    "nombre_enum": "user_subscription_type",
    "valor": "free"
  },
  {
    "schema": "public",
    "nombre_enum": "user_subscription_type",
    "valor": "plus"
  },
  {
    "schema": "public",
    "nombre_enum": "user_subscription_type",
    "valor": "pro"
  },
  {
    "schema": "public",
    "nombre_enum": "user_subscription_type",
    "valor": "developer"
  }
]

### 6.2 Todos los Tipos Personalizados

Success. No rows returned

---

## 7. Extensiones PostgreSQL

### 7.1 Extensiones Instaladas

[
  {
    "extension": "pg_graphql",
    "version": "1.5.11",
    "relocatable": false,
    "schema": "graphql"
  },
  {
    "extension": "pg_stat_statements",
    "version": "1.10",
    "relocatable": true,
    "schema": "extensions"
  },
  {
    "extension": "pgcrypto",
    "version": "1.3",
    "relocatable": true,
    "schema": "extensions"
  },
  {
    "extension": "pgjwt",
    "version": "0.2.0",
    "relocatable": false,
    "schema": "extensions"
  },
  {
    "extension": "pgsodium",
    "version": "3.1.8",
    "relocatable": false,
    "schema": "pgsodium"
  },
  {
    "extension": "plpgsql",
    "version": "1.0",
    "relocatable": false,
    "schema": "pg_catalog"
  },
  {
    "extension": "supabase_vault",
    "version": "0.3.1",
    "relocatable": false,
    "schema": "vault"
  },
  {
    "extension": "uuid-ossp",
    "version": "1.1",
    "relocatable": true,
    "schema": "extensions"
  }
]

**Extensiones Críticas:**
- `uuid-ossp` → Generación de UUIDs
- `pg_trgm` → Búsqueda por similitud (si está instalado)

---

## 8. Estadísticas de Tablas

### 8.1 Tamaño de Tablas

[
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "tamaño_total": "288 kB",
    "tamaño_tabla": "40 kB",
    "tamaño_indices": "248 kB"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "tamaño_total": "120 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "112 kB"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "tamaño_total": "112 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "104 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "tamaño_total": "104 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "96 kB"
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "tamaño_total": "104 kB",
    "tamaño_tabla": "24 kB",
    "tamaño_indices": "80 kB"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "tamaño_total": "88 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "80 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "tamaño_total": "88 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "80 kB"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "tamaño_total": "80 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "72 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "tamaño_total": "80 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "72 kB"
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "tamaño_total": "72 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "64 kB"
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "tamaño_total": "72 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "64 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_categories",
    "tamaño_total": "64 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "56 kB"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "tamaño_total": "56 kB",
    "tamaño_tabla": "8192 bytes",
    "tamaño_indices": "48 kB"
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "tamaño_total": "48 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "48 kB"
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "tamaño_total": "32 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "32 kB"
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "tamaño_total": "32 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "32 kB"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "tamaño_total": "32 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "32 kB"
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "tamaño_total": "32 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "32 kB"
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "tamaño_total": "24 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "24 kB"
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "tamaño_total": "24 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "24 kB"
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "tamaño_total": "24 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "24 kB"
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "tamaño_total": "24 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "24 kB"
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "tamaño_total": "24 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "24 kB"
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "tamaño_total": "24 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "24 kB"
  },
  {
    "schemaname": "public",
    "tablename": "chat_groups",
    "tamaño_total": "16 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "bans",
    "tamaño_total": "16 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_categories",
    "tamaño_total": "16 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "video_processing_queue",
    "tamaño_total": "16 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "scripts",
    "tamaño_total": "16 kB",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "16 kB"
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "tamaño_total": "8192 bytes",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "trick_gimmicks",
    "tamaño_total": "8192 bytes",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "user_roles",
    "tamaño_total": "8192 bytes",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "trick_techniques",
    "tamaño_total": "8192 bytes",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "8192 bytes"
  },
  {
    "schemaname": "public",
    "tablename": "ai_folders",
    "tamaño_total": "8192 bytes",
    "tamaño_tabla": "0 bytes",
    "tamaño_indices": "8192 bytes"
  }
]

### 8.2 Número de Filas

[
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "filas_aproximadas": 70,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": "2025-07-14 17:52:33.387479+00"
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "filas_aproximadas": 28,
    "filas_muertas": 49,
    "last_vacuum": null,
    "last_autovacuum": "2025-10-21 08:23:07.829647+00",
    "last_analyze": null,
    "last_autoanalyze": "2025-11-13 09:04:16.788892+00"
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "filas_aproximadas": 21,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": "2025-11-13 11:15:39.223167+00",
    "last_analyze": null,
    "last_autoanalyze": "2025-11-13 08:45:16.545693+00"
  },
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "filas_aproximadas": 21,
    "filas_muertas": 33,
    "last_vacuum": null,
    "last_autovacuum": "2025-11-13 08:15:16.098448+00",
    "last_analyze": null,
    "last_autoanalyze": "2025-11-13 08:43:16.446061+00"
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "filas_aproximadas": 17,
    "filas_muertas": 38,
    "last_vacuum": null,
    "last_autovacuum": "2025-07-10 18:36:19.457611+00",
    "last_analyze": null,
    "last_autoanalyze": "2025-07-10 18:34:19.440861+00"
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "filas_aproximadas": 16,
    "filas_muertas": 43,
    "last_vacuum": null,
    "last_autovacuum": "2025-09-12 15:33:54.852735+00",
    "last_analyze": null,
    "last_autoanalyze": "2025-09-12 15:33:54.86538+00"
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "filas_aproximadas": 16,
    "filas_muertas": 6,
    "last_vacuum": null,
    "last_autovacuum": "2025-08-20 15:40:59.542166+00",
    "last_analyze": null,
    "last_autoanalyze": "2025-08-20 15:40:59.552023+00"
  },
  {
    "schemaname": "public",
    "tablename": "user_categories",
    "filas_aproximadas": 14,
    "filas_muertas": 21,
    "last_vacuum": null,
    "last_autovacuum": "2025-07-09 18:32:54.984288+00",
    "last_analyze": null,
    "last_autoanalyze": "2025-07-09 13:31:10.111554+00"
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "filas_aproximadas": 6,
    "filas_muertas": 18,
    "last_vacuum": null,
    "last_autovacuum": "2025-07-14 17:52:33.371148+00",
    "last_analyze": null,
    "last_autoanalyze": "2025-07-14 17:49:33.324015+00"
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "filas_aproximadas": 4,
    "filas_muertas": 3,
    "last_vacuum": null,
    "last_autovacuum": "2025-11-13 08:46:16.486858+00",
    "last_analyze": null,
    "last_autoanalyze": "2025-11-13 08:45:16.471817+00"
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "filas_aproximadas": 3,
    "filas_muertas": 18,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "filas_aproximadas": 3,
    "filas_muertas": 18,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "bans",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "user_roles",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "video_processing_queue",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "filas_aproximadas": 0,
    "filas_muertas": 10,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "ai_folders",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "trick_techniques",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "chat_groups",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "predefined_categories",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "scripts",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  },
  {
    "schemaname": "public",
    "tablename": "trick_gimmicks",
    "filas_aproximadas": 0,
    "filas_muertas": 0,
    "last_vacuum": null,
    "last_autovacuum": null,
    "last_analyze": null,
    "last_autoanalyze": null
  }
]

### 8.3 Actividad de Lectura/Escritura

[
  {
    "schemaname": "public",
    "tablename": "trick_categories",
    "sequential_scans": 50471,
    "filas_leidas_seq": 1863659,
    "index_scans": 13962,
    "filas_leidas_idx": 15802,
    "inserts": 185,
    "updates": 0,
    "deletes": 165,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "trick_tags",
    "sequential_scans": 37784,
    "filas_leidas_seq": 1607877,
    "index_scans": 20473,
    "filas_leidas_idx": 20852,
    "inserts": 195,
    "updates": 0,
    "deletes": 166,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "magic_tricks",
    "sequential_scans": 5549,
    "filas_leidas_seq": 163902,
    "index_scans": 9658,
    "filas_leidas_idx": 13573,
    "inserts": 152,
    "updates": 201,
    "deletes": 140,
    "hot_updates": 149
  },
  {
    "schemaname": "public",
    "tablename": "user_categories",
    "sequential_scans": 9668,
    "filas_leidas_seq": 114177,
    "index_scans": 325,
    "filas_leidas_idx": 705,
    "inserts": 67,
    "updates": 26,
    "deletes": 55,
    "hot_updates": 26
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "sequential_scans": 6383,
    "filas_leidas_seq": 12851,
    "index_scans": 273,
    "filas_leidas_idx": 271,
    "inserts": 4,
    "updates": 36,
    "deletes": 1,
    "hot_updates": 29
  },
  {
    "schemaname": "public",
    "tablename": "trick_photos",
    "sequential_scans": 121,
    "filas_leidas_seq": 1374,
    "index_scans": 6011,
    "filas_leidas_idx": 2216,
    "inserts": 60,
    "updates": 0,
    "deletes": 56,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "predefined_tags",
    "sequential_scans": 4778,
    "filas_leidas_seq": 73697,
    "index_scans": 9,
    "filas_leidas_idx": 26,
    "inserts": 43,
    "updates": 186,
    "deletes": 26,
    "hot_updates": 36
  },
  {
    "schemaname": "public",
    "tablename": "techniques",
    "sequential_scans": 3887,
    "filas_leidas_seq": 8462,
    "index_scans": 894,
    "filas_leidas_idx": 131,
    "inserts": 7,
    "updates": 0,
    "deletes": 4,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "predefined_categories",
    "sequential_scans": 4022,
    "filas_leidas_seq": 0,
    "index_scans": 33,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "gimmicks",
    "sequential_scans": 822,
    "filas_leidas_seq": 0,
    "index_scans": 2675,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "technique_categories",
    "sequential_scans": 383,
    "filas_leidas_seq": 48,
    "index_scans": 2750,
    "filas_leidas_idx": 1385,
    "inserts": 3,
    "updates": 0,
    "deletes": 3,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "technique_tags",
    "sequential_scans": 383,
    "filas_leidas_seq": 48,
    "index_scans": 2228,
    "filas_leidas_idx": 1386,
    "inserts": 3,
    "updates": 0,
    "deletes": 3,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "user_favorites",
    "sequential_scans": 652,
    "filas_leidas_seq": 1157,
    "index_scans": 1830,
    "filas_leidas_idx": 2264,
    "inserts": 10,
    "updates": 0,
    "deletes": 10,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "shared_content",
    "sequential_scans": 370,
    "filas_leidas_seq": 0,
    "index_scans": 1909,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "user_category_order",
    "sequential_scans": 788,
    "filas_leidas_seq": 8306,
    "index_scans": 863,
    "filas_leidas_idx": 2060,
    "inserts": 16,
    "updates": 637,
    "deletes": 0,
    "hot_updates": 290
  },
  {
    "schemaname": "public",
    "tablename": "user_trick_order",
    "sequential_scans": 1005,
    "filas_leidas_seq": 32240,
    "index_scans": 238,
    "filas_leidas_idx": 441,
    "inserts": 48,
    "updates": 145,
    "deletes": 32,
    "hot_updates": 19
  },
  {
    "schemaname": "public",
    "tablename": "scripts",
    "sequential_scans": 1216,
    "filas_leidas_seq": 1336,
    "index_scans": 20,
    "filas_leidas_idx": 6,
    "inserts": 11,
    "updates": 1,
    "deletes": 3,
    "hot_updates": 1
  },
  {
    "schemaname": "public",
    "tablename": "trick_techniques",
    "sequential_scans": 397,
    "filas_leidas_seq": 0,
    "index_scans": 343,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "trick_gimmicks",
    "sequential_scans": 400,
    "filas_leidas_seq": 0,
    "index_scans": 334,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "ai_conversations",
    "sequential_scans": 349,
    "filas_leidas_seq": 1964,
    "index_scans": 150,
    "filas_leidas_idx": 170,
    "inserts": 6,
    "updates": 70,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "bans",
    "sequential_scans": 392,
    "filas_leidas_seq": 0,
    "index_scans": 32,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "chat_groups",
    "sequential_scans": 388,
    "filas_leidas_seq": 0,
    "index_scans": 34,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "sequential_scans": 386,
    "filas_leidas_seq": 0,
    "index_scans": 33,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "messages",
    "sequential_scans": 393,
    "filas_leidas_seq": 0,
    "index_scans": 23,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "purchases",
    "sequential_scans": 390,
    "filas_leidas_seq": 0,
    "index_scans": 24,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "sequential_scans": 391,
    "filas_leidas_seq": 0,
    "index_scans": 21,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "gimmick_categories",
    "sequential_scans": 383,
    "filas_leidas_seq": 0,
    "index_scans": 27,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "user_relationships",
    "sequential_scans": 388,
    "filas_leidas_seq": 0,
    "index_scans": 20,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "roles",
    "sequential_scans": 387,
    "filas_leidas_seq": 0,
    "index_scans": 15,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "user_roles",
    "sequential_scans": 386,
    "filas_leidas_seq": 0,
    "index_scans": 16,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "video_processing_queue",
    "sequential_scans": 389,
    "filas_leidas_seq": 0,
    "index_scans": 6,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "ai_messages",
    "sequential_scans": 274,
    "filas_leidas_seq": 18002,
    "index_scans": 118,
    "filas_leidas_idx": 915,
    "inserts": 70,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "ai_usage_tracking",
    "sequential_scans": 266,
    "filas_leidas_seq": 544,
    "index_scans": 105,
    "filas_leidas_idx": 88,
    "inserts": 3,
    "updates": 18,
    "deletes": 0,
    "hot_updates": 18
  },
  {
    "schemaname": "public",
    "tablename": "ai_folders",
    "sequential_scans": 260,
    "filas_leidas_seq": 0,
    "index_scans": 12,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  },
  {
    "schemaname": "public",
    "tablename": "user_library_items",
    "sequential_scans": 3,
    "filas_leidas_seq": 0,
    "index_scans": 13,
    "filas_leidas_idx": 0,
    "inserts": 0,
    "updates": 0,
    "deletes": 0,
    "hot_updates": 0
  }
]

**Análisis:**
- `seq_scan` alto → Puede necesitar índice adicional
- `idx_scan` alto → Los índices se están usando correctamente

---

## 9. Datos de Ejemplo

### 9.1 Ejemplo: magic_tricks

[
  {
    "id": "7c4da2e5-9a4b-4a38-9411-4633b7c7bb48",
    "user_id": "a2a39a82-6a48-49ad-92b2-81817de1a6b3",
    "title": "Truco sin stats",
    "effect": "",
    "secret": "",
    "difficulty": null,
    "duration": null,
    "reset": null,
    "angles": [],
    "is_public": false,
    "status": "draft",
    "created_at": "2025-11-13 09:03:29.641614+00",
    "updated_at": "2025-11-13 09:03:29.641614+00"
  },
  {
    "id": "8688f4f3-3d9a-4e4d-ac10-f4f4704e99e9",
    "user_id": "e35c7f33-6ca2-484d-9502-3b3d5225b61e",
    "title": "Polo Neck ",
    "effect": "",
    "secret": "",
    "difficulty": 5,
    "duration": null,
    "reset": null,
    "angles": [],
    "is_public": false,
    "status": "draft",
    "created_at": "2025-07-10 18:32:07.037098+00",
    "updated_at": "2025-10-23 10:10:30.475+00"
  },
  {
    "id": "156e8034-9c31-4d44-b328-99a5f97a6342",
    "user_id": "e35c7f33-6ca2-484d-9502-3b3d5225b61e",
    "title": "WOW ",
    "effect": "Mago saca funda de carta individual. Espectador firma una carta el mago la pierde por el mazo acto seguido el mago coge una carta aleatoria y la introduce en la funda mágica con un chasquido la carta d ELA funda se vuelva la firmada de forma muy visual y sorprendente wow ",
    "secret": "Funda trucada con un estampe de 8 corazones ❤️ doble lift con la carta firmada y 8 corazones y presiona la solapa del wow funda poco a poco para un efecto muy espectacular ",
    "difficulty": 3,
    "duration": 60,
    "reset": 1,
    "angles": [
      "360"
    ],
    "is_public": false,
    "status": "draft",
    "created_at": "2025-07-10 18:43:35.782346+00",
    "updated_at": "2025-07-10 21:50:19.412+00"
  }
]

### 9.2 Ejemplo: user_categories

[
  {
    "id": "92635208-a380-4b93-badc-23ea68d0e837",
    "user_id": "e35c7f33-6ca2-484d-9502-3b3d5225b61e",
    "name": "🪄 Varios",
    "description": null,
    "created_at": "2025-07-10 18:30:05.634654+00",
    "updated_at": "2025-07-10 18:30:05.634654+00"
  },
  {
    "id": "0c8a3bd3-1d3e-494a-8e93-74079c0d3448",
    "user_id": "9984ac86-d86f-4749-8a82-9b8525f4b29a",
    "name": "🪙 Monedas",
    "description": null,
    "created_at": "2025-07-09 13:10:29.257508+00",
    "updated_at": "2025-07-09 13:11:47.355+00"
  },
  {
    "id": "204b9a53-6ac0-42ab-be2d-dd8bba4bb8ae",
    "user_id": "a2a39a82-6a48-49ad-92b2-81817de1a6b3",
    "name": "Prueba Cloudflare",
    "description": null,
    "created_at": "2025-10-15 10:16:21.048221+00",
    "updated_at": "2025-10-15 10:16:21.048221+00"
  },
  {
    "id": "d44db43d-33fe-4f46-a87e-e7d2d29d1cae",
    "user_id": "a2a39a82-6a48-49ad-92b2-81817de1a6b3",
    "name": "Testflight",
    "description": null,
    "created_at": "2025-10-23 06:49:12.578103+00",
    "updated_at": "2025-10-23 06:49:12.578103+00"
  },
  {
    "id": "c9d1983e-98a6-4ac2-847c-e1c3e8bc3ebb",
    "user_id": "e35c7f33-6ca2-484d-9502-3b3d5225b61e",
    "name": "Luis",
    "description": null,
    "created_at": "2025-10-23 10:07:15.909339+00",
    "updated_at": "2025-10-23 10:07:15.909339+00"
  }
]

### 9.3 Ejemplo: trick_categories (Junction Table)

[
  {
    "trick_id": "50f3e0d1-b157-4320-bac4-c1f858cd2c3a",
    "category_id": "204b9a53-6ac0-42ab-be2d-dd8bba4bb8ae",
    "created_at": "2025-11-13 08:49:08.625+00"
  },
  {
    "trick_id": "7c4da2e5-9a4b-4a38-9411-4633b7c7bb48",
    "category_id": "204b9a53-6ac0-42ab-be2d-dd8bba4bb8ae",
    "created_at": "2025-11-13 09:03:29.776+00"
  },
  {
    "trick_id": "52f11de4-c8b8-4da3-8b60-2565c5d27a1b",
    "category_id": "b0b6ed7d-f837-47ef-a85f-e609ca20f102",
    "created_at": "2025-07-09 14:07:35.291+00"
  },
  {
    "trick_id": "aa0b4f17-8acd-4cc9-abe2-28687c6b3141",
    "category_id": "0c8a3bd3-1d3e-494a-8e93-74079c0d3448",
    "created_at": "2025-07-09 14:14:04.843+00"
  },
  {
    "trick_id": "40c93a59-a4a7-4c99-ad38-0bfe14db079e",
    "category_id": "fd1d1d22-7c34-4858-b41b-93b78927edce",
    "created_at": "2025-07-10 18:08:21.377+00"
  },
  {
    "trick_id": "03f60ff8-4442-4d04-a469-9d0c166c7059",
    "category_id": "92635208-a380-4b93-badc-23ea68d0e837",
    "created_at": "2025-07-10 18:30:12.414+00"
  },
  {
    "trick_id": "df9b2b1f-99b1-4e99-9a81-b0f930550625",
    "category_id": "0c8a3bd3-1d3e-494a-8e93-74079c0d3448",
    "created_at": "2025-07-10 18:33:51.105+00"
  },
  {
    "trick_id": "fc65b875-dc4e-484e-a1df-caba517e8fee",
    "category_id": "0c8a3bd3-1d3e-494a-8e93-74079c0d3448",
    "created_at": "2025-07-10 18:34:12.719+00"
  },
  {
    "trick_id": "5c1d05be-0220-4417-a45e-9b16a2380522",
    "category_id": "faefd845-4a00-40f2-9d62-d70d369f6178",
    "created_at": "2025-07-10 18:34:50.513+00"
  },
  {
    "trick_id": "5f924533-64d4-4da0-8bac-8686f9f584d2",
    "category_id": "0c8a3bd3-1d3e-494a-8e93-74079c0d3448",
    "created_at": "2025-07-10 18:35:34.167+00"
  }
]

### 9.4 Ejemplo: user_favorites

Success. No rows returned

### 9.5 Ejemplo: trick_tags

[
  {
    "trick_id": "8688f4f3-3d9a-4e4d-ac10-f4f4704e99e9",
    "tag_id": "fad90962-e7c7-41a0-a880-136d20b0f46c",
    "created_at": "2025-10-23 10:10:32.374+00"
  },
  {
    "trick_id": "52f11de4-c8b8-4da3-8b60-2565c5d27a1b",
    "tag_id": "ec30415a-32b2-4e55-b301-d33bf0291365",
    "created_at": "2025-07-09 14:07:35.506+00"
  },
  {
    "trick_id": "52f11de4-c8b8-4da3-8b60-2565c5d27a1b",
    "tag_id": "fad90962-e7c7-41a0-a880-136d20b0f46c",
    "created_at": "2025-07-09 14:07:35.506+00"
  },
  {
    "trick_id": "aa0b4f17-8acd-4cc9-abe2-28687c6b3141",
    "tag_id": "fad90962-e7c7-41a0-a880-136d20b0f46c",
    "created_at": "2025-07-09 14:14:05.375+00"
  },
  {
    "trick_id": "aa0b4f17-8acd-4cc9-abe2-28687c6b3141",
    "tag_id": "ec30415a-32b2-4e55-b301-d33bf0291365",
    "created_at": "2025-07-09 14:14:05.375+00"
  },
  {
    "trick_id": "df9b2b1f-99b1-4e99-9a81-b0f930550625",
    "tag_id": "ec30415a-32b2-4e55-b301-d33bf0291365",
    "created_at": "2025-07-10 18:33:51.337+00"
  },
  {
    "trick_id": "fc65b875-dc4e-484e-a1df-caba517e8fee",
    "tag_id": "ec30415a-32b2-4e55-b301-d33bf0291365",
    "created_at": "2025-07-10 18:34:12.918+00"
  },
  {
    "trick_id": "5c1d05be-0220-4417-a45e-9b16a2380522",
    "tag_id": "ec30415a-32b2-4e55-b301-d33bf0291365",
    "created_at": "2025-07-10 18:34:50.745+00"
  },
  {
    "trick_id": "5c1d05be-0220-4417-a45e-9b16a2380522",
    "tag_id": "fad90962-e7c7-41a0-a880-136d20b0f46c",
    "created_at": "2025-07-10 18:34:50.745+00"
  },
  {
    "trick_id": "5f924533-64d4-4da0-8bac-8686f9f584d2",
    "tag_id": "ec30415a-32b2-4e55-b301-d33bf0291365",
    "created_at": "2025-07-10 18:35:34.398+00"
  }
]

### 9.6 Ejemplo: trick_photos

[
  {
    "id": "85ced1a0-6385-4f4f-98cc-a9fd510c1bb5",
    "trick_id": "50f3e0d1-b157-4320-bac4-c1f858cd2c3a",
    "photo_url": "https://imagedelivery.net/mkya067_ffU9KWxHM05C-Q/525ef866-29bb-4eeb-436b-d1c965a6e600/public",
    "position": 0,
    "created_at": "2025-11-13 08:49:10.357+00",
    "updated_at": "2025-11-13 08:49:10.490222+00"
  },
  {
    "id": "f39403d5-a607-4400-b3be-504cb9ebe8d6",
    "trick_id": "7cbeb8dd-212a-495b-bc3a-07b45c020ce1",
    "photo_url": "https://glhuyalurzrojveycybw.supabase.co/storage/v1/object/public/magic_trick_media/e35c7f33-6ca2-484d-9502-3b3d5225b61e/photos/1752182681146_jjh1w.jpg",
    "position": 0,
    "created_at": "2025-10-03 11:35:30.595546+00",
    "updated_at": "2025-10-03 11:35:30.595546+00"
  },
  {
    "id": "3a892b58-b4df-4856-97a1-23577dbb5cce",
    "trick_id": "50f3e0d1-b157-4320-bac4-c1f858cd2c3a",
    "photo_url": "https://imagedelivery.net/mkya067_ffU9KWxHM05C-Q/5d6cc56e-c9d6-431d-b649-bef5a3edf200/public",
    "position": 0,
    "created_at": "2025-11-13 08:49:10.357+00",
    "updated_at": "2025-11-13 08:49:10.490222+00"
  },
  {
    "id": "559c92e7-b1f0-4192-b46e-84a26fa8239f",
    "trick_id": "50f3e0d1-b157-4320-bac4-c1f858cd2c3a",
    "photo_url": "https://imagedelivery.net/mkya067_ffU9KWxHM05C-Q/8ba6acce-10a7-4719-9073-6bcc53030a00/public",
    "position": 0,
    "created_at": "2025-11-13 08:49:10.357+00",
    "updated_at": "2025-11-13 08:49:10.490222+00"
  }
]

---

## 10. Relaciones Complejas

### 10.1 Un Truco con Todas sus Relaciones

Success. No rows returned


**Interpretación:**
- Este truco está en 2 categorías
- Tiene 2 tags
- Está marcado como favorito
- Tiene 3 fotos asociadas

### 10.2 Resumen de Trucos por Categoría

[
  {
    "categoria": "🃏 Cartomagia",
    "numero_trucos": 9,
    "dificultad_promedio": "3.5000000000000000",
    "duracion_promedio": "127.5000000000000000"
  },
  {
    "categoria": "🪙 Monedas",
    "numero_trucos": 4,
    "dificultad_promedio": "3.0000000000000000",
    "duracion_promedio": "240.0000000000000000"
  },
  {
    "categoria": "🪄 Varios",
    "numero_trucos": 2,
    "dificultad_promedio": "5.0000000000000000",
    "duracion_promedio": null
  },
  {
    "categoria": "Prueba Cloudflare",
    "numero_trucos": 2,
    "dificultad_promedio": "4.0000000000000000",
    "duracion_promedio": "1500.0000000000000000"
  },
  {
    "categoria": "🧠 Mentalismo",
    "numero_trucos": 2,
    "dificultad_promedio": "5.0000000000000000",
    "duracion_promedio": null
  },
  {
    "categoria": "⚡️ Powerfull",
    "numero_trucos": 2,
    "dificultad_promedio": "5.0000000000000000",
    "duracion_promedio": null
  },
  {
    "categoria": "🎭 Stage Magic",
    "numero_trucos": 0,
    "dificultad_promedio": null,
    "duracion_promedio": null
  },
  {
    "categoria": "Favoritos",
    "numero_trucos": 0,
    "dificultad_promedio": null,
    "duracion_promedio": null
  },
  {
    "categoria": "Favoritos",
    "numero_trucos": 0,
    "dificultad_promedio": null,
    "duracion_promedio": null
  },
  {
    "categoria": "Test",
    "numero_trucos": 0,
    "dificultad_promedio": null,
    "duracion_promedio": null
  },
  {
    "categoria": "Blackpool 2025",
    "numero_trucos": 0,
    "dificultad_promedio": null,
    "duracion_promedio": null
  },
  {
    "categoria": "vacío",
    "numero_trucos": 0,
    "dificultad_promedio": null,
    "duracion_promedio": null
  },
  {
    "categoria": "Luis",
    "numero_trucos": 0,
    "dificultad_promedio": null,
    "duracion_promedio": null
  },
  {
    "categoria": "Testflight",
    "numero_trucos": 0,
    "dificultad_promedio": null,
    "duracion_promedio": null
  }
]

### 10.3 Trucos con Más Fotos

[
  {
    "id": "50f3e0d1-b157-4320-bac4-c1f858cd2c3a",
    "title": "Video largo",
    "numero_fotos": 3
  },
  {
    "id": "7cbeb8dd-212a-495b-bc3a-07b45c020ce1",
    "title": "Carta firmada zapato ",
    "numero_fotos": 1
  }
]

---

## 11. Configuración Full-Text Search

### 11.1 Columnas tsvector

[
  {
    "table_name": "magic_tricks",
    "column_name": "search_vector",
    "data_type": "tsvector"
  }
]

**Estado FTS:**
- ✅ Columna `search_vector` existe
- ✅ Índice GIN `idx_magic_tricks_search_vector` creado
- ✅ Trigger `tsvector_update_trigger` activo

### 11.2 Configuraciones Text Search Disponibles

[
  {
    "configuracion": "english",
    "propietario": "supabase_admin"
  },
  {
    "configuracion": "simple",
    "propietario": "supabase_admin"
  },
  {
    "configuracion": "spanish",
    "propietario": "supabase_admin"
  }
]

**Configuración Actual:** `simple` (multi-idioma)

### 11.3 Ejemplo de search_vector

[
  {
    "title": "Truco sin stats",
    "search_vector": "'sin':2 'stats':3 'truco':1"
  },
  {
    "title": "Polo Neck ",
    "search_vector": "'neck':2 'polo':1"
  },
  {
    "title": "WOW ",
    "search_vector": "'8':59,68 'a':78 'acto':19 'aleatoria':26 'carta':6,11,25,38,65 'chasquido':36 'coge':23 'con':34,55,63 'corazones':60,69 'd':39 'de':5,46,58 'del':74 'doble':61 'efecto':82 'el':12,17,21 'ela':40 'en':30 'espectacular':84 'espectador':8 'estampe':57 'firma':9 'firmada':45,66 'forma':47 'funda':4,32,41,53,76 'individual':7 'introduce':29 'la':14,28,31,37,44,64,72 'lift':62 'mago':2,13,22 'mazo':18 'muy':48,83 'mágica':33 'para':80 'pierde':15 'poco':77,79 'por':16 'presiona':71 'saca':3 'se':42 'seguido':20 'solapa':73 'sorprendente':51 'trucada':54 'un':35,56,81 'una':10,24 'visual':49 'vuelva':43 'wow':1,52,75 'y':27,50,67,70"
  }
]

---

## 12. Storage y Archivos

### 12.1 Columnas con URLs de Archivos

[
  {
    "table_name": "ai_messages",
    "column_name": "audio_url",
    "data_type": "text"
  },
  {
    "table_name": "gimmicks",
    "column_name": "craft_video_url",
    "data_type": "text"
  },
  {
    "table_name": "gimmicks",
    "column_name": "image_url",
    "data_type": "text"
  },
  {
    "table_name": "gimmicks",
    "column_name": "video_url",
    "data_type": "text"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "effect_video_url",
    "data_type": "text"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "photo_url",
    "data_type": "text"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "secret_video_url",
    "data_type": "text"
  },
  {
    "table_name": "profiles",
    "column_name": "avatar_url",
    "data_type": "text"
  },
  {
    "table_name": "profiles",
    "column_name": "external_url",
    "data_type": "text"
  },
  {
    "table_name": "profiles",
    "column_name": "profile_image_url",
    "data_type": "text"
  },
  {
    "table_name": "techniques",
    "column_name": "image_url",
    "data_type": "text"
  },
  {
    "table_name": "techniques",
    "column_name": "video_url",
    "data_type": "text"
  },
  {
    "table_name": "trick_photos",
    "column_name": "photo_url",
    "data_type": "text"
  },
  {
    "table_name": "video_processing_queue",
    "column_name": "original_url",
    "data_type": "text"
  }
]

### 12.2 Análisis de URLs de Archivos

[
  {
    "campo": "effect_video_url",
    "total_trucos": 21,
    "con_video": 2,
    "sin_video": 19
  },
  {
    "campo": "secret_video_url",
    "total_trucos": 21,
    "con_video": 2,
    "sin_video": 19
  },
  {
    "campo": "photo_url",
    "total_trucos": 21,
    "con_video": 2,
    "sin_video": 19
  }
]

**Análisis:**
- 56% de trucos tienen video de efecto
- 42% de trucos tienen video de secreto
- 92% de trucos tienen foto

---

## 13. Auth y Perfiles

### 13.1 Número de Usuarios

[
  {
    "total_usuarios": 3
  }
]

### 13.2 Perfiles de Usuarios
[
  {
    "id": "a2a39a82-6a48-49ad-92b2-81817de1a6b3",
    "username": "luislk1996chs",
    "email": "luislk1996chs@gmail.com",
    "avatar_url": null,
    "created_at": "2025-06-18 17:50:08.605935+00"
  },
  {
    "id": "e35c7f33-6ca2-484d-9502-3b3d5225b61e",
    "username": "luis",
    "email": "luis@displaymedia.io",
    "avatar_url": null,
    "created_at": "2025-05-26 10:18:38.093+00"
  },
  {
    "id": "9984ac86-d86f-4749-8a82-9b8525f4b29a",
    "username": "luisbravomagic",
    "email": "luisbravomagic@gmail.com",
    "avatar_url": null,
    "created_at": "2025-09-12 09:33:33.041944+00"
  }
]

### 13.3 Usuarios con Más Trucos

[
  {
    "username": "luis",
    "email": "luis@displaymedia.io",
    "numero_trucos": 19
  },
  {
    "username": "luislk1996chs",
    "email": "luislk1996chs@gmail.com",
    "numero_trucos": 2
  },
  {
    "username": "luisbravomagic",
    "email": "luisbravomagic@gmail.com",
    "numero_trucos": 0
  }
]

---

## 14. Metadata

### 14.1 Versión de PostgreSQL

[
  {
    "version": "PostgreSQL 15.8 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit"
  }
]

### 14.2 Todas las Schemas

[
  {
    "schema_name": "auth"
  },
  {
    "schema_name": "extensions"
  },
  {
    "schema_name": "graphql"
  },
  {
    "schema_name": "graphql_public"
  },
  {
    "schema_name": "information_schema"
  },
  {
    "schema_name": "pg_catalog"
  },
  {
    "schema_name": "pg_temp_10"
  },
  {
    "schema_name": "pg_temp_11"
  },
  {
    "schema_name": "pg_temp_12"
  },
  {
    "schema_name": "pg_temp_13"
  },
  {
    "schema_name": "pg_temp_14"
  },
  {
    "schema_name": "pg_temp_15"
  },
  {
    "schema_name": "pg_temp_16"
  },
  {
    "schema_name": "pg_temp_17"
  },
  {
    "schema_name": "pg_temp_18"
  },
  {
    "schema_name": "pg_temp_19"
  },
  {
    "schema_name": "pg_temp_20"
  },
  {
    "schema_name": "pg_temp_21"
  },
  {
    "schema_name": "pg_temp_22"
  },
  {
    "schema_name": "pg_temp_23"
  },
  {
    "schema_name": "pg_temp_24"
  },
  {
    "schema_name": "pg_temp_25"
  },
  {
    "schema_name": "pg_temp_26"
  },
  {
    "schema_name": "pg_temp_27"
  },
  {
    "schema_name": "pg_temp_28"
  },
  {
    "schema_name": "pg_temp_29"
  },
  {
    "schema_name": "pg_temp_30"
  },
  {
    "schema_name": "pg_temp_31"
  },
  {
    "schema_name": "pg_temp_32"
  },
  {
    "schema_name": "pg_temp_33"
  },
  {
    "schema_name": "pg_temp_34"
  },
  {
    "schema_name": "pg_temp_35"
  },
  {
    "schema_name": "pg_temp_36"
  },
  {
    "schema_name": "pg_temp_37"
  },
  {
    "schema_name": "pg_temp_38"
  },
  {
    "schema_name": "pg_temp_39"
  },
  {
    "schema_name": "pg_temp_40"
  },
  {
    "schema_name": "pg_temp_41"
  },
  {
    "schema_name": "pg_temp_42"
  },
  {
    "schema_name": "pg_temp_43"
  },
  {
    "schema_name": "pg_temp_44"
  },
  {
    "schema_name": "pg_temp_45"
  },
  {
    "schema_name": "pg_temp_46"
  },
  {
    "schema_name": "pg_temp_47"
  },
  {
    "schema_name": "pg_temp_48"
  },
  {
    "schema_name": "pg_temp_49"
  },
  {
    "schema_name": "pg_temp_50"
  },
  {
    "schema_name": "pg_temp_51"
  },
  {
    "schema_name": "pg_temp_52"
  },
  {
    "schema_name": "pg_temp_53"
  },
  {
    "schema_name": "pg_temp_54"
  },
  {
    "schema_name": "pg_temp_55"
  },
  {
    "schema_name": "pg_temp_56"
  },
  {
    "schema_name": "pg_temp_57"
  },
  {
    "schema_name": "pg_temp_58"
  },
  {
    "schema_name": "pg_temp_59"
  },
  {
    "schema_name": "pg_temp_60"
  },
  {
    "schema_name": "pg_temp_61"
  },
  {
    "schema_name": "pg_temp_8"
  },
  {
    "schema_name": "pg_temp_9"
  },
  {
    "schema_name": "pg_toast"
  },
  {
    "schema_name": "pg_toast_temp_10"
  },
  {
    "schema_name": "pg_toast_temp_11"
  },
  {
    "schema_name": "pg_toast_temp_12"
  },
  {
    "schema_name": "pg_toast_temp_13"
  },
  {
    "schema_name": "pg_toast_temp_14"
  },
  {
    "schema_name": "pg_toast_temp_15"
  },
  {
    "schema_name": "pg_toast_temp_16"
  },
  {
    "schema_name": "pg_toast_temp_17"
  },
  {
    "schema_name": "pg_toast_temp_18"
  },
  {
    "schema_name": "pg_toast_temp_19"
  },
  {
    "schema_name": "pg_toast_temp_20"
  },
  {
    "schema_name": "pg_toast_temp_21"
  },
  {
    "schema_name": "pg_toast_temp_22"
  },
  {
    "schema_name": "pg_toast_temp_23"
  },
  {
    "schema_name": "pg_toast_temp_24"
  },
  {
    "schema_name": "pg_toast_temp_25"
  },
  {
    "schema_name": "pg_toast_temp_26"
  },
  {
    "schema_name": "pg_toast_temp_27"
  },
  {
    "schema_name": "pg_toast_temp_28"
  },
  {
    "schema_name": "pg_toast_temp_29"
  },
  {
    "schema_name": "pg_toast_temp_30"
  },
  {
    "schema_name": "pg_toast_temp_31"
  },
  {
    "schema_name": "pg_toast_temp_32"
  },
  {
    "schema_name": "pg_toast_temp_33"
  },
  {
    "schema_name": "pg_toast_temp_34"
  },
  {
    "schema_name": "pg_toast_temp_35"
  },
  {
    "schema_name": "pg_toast_temp_36"
  },
  {
    "schema_name": "pg_toast_temp_37"
  },
  {
    "schema_name": "pg_toast_temp_38"
  },
  {
    "schema_name": "pg_toast_temp_39"
  },
  {
    "schema_name": "pg_toast_temp_40"
  },
  {
    "schema_name": "pg_toast_temp_41"
  },
  {
    "schema_name": "pg_toast_temp_42"
  },
  {
    "schema_name": "pg_toast_temp_43"
  },
  {
    "schema_name": "pg_toast_temp_44"
  },
  {
    "schema_name": "pg_toast_temp_45"
  },
  {
    "schema_name": "pg_toast_temp_46"
  },
  {
    "schema_name": "pg_toast_temp_47"
  },
  {
    "schema_name": "pg_toast_temp_48"
  }
]

### 14.3 Comentarios en Tablas y Columnas

[
  {
    "table_name": "gimmick_categories",
    "column_name": "gimmick_id",
    "description": "Reference to the gimmick being categorized"
  },
  {
    "table_name": "gimmick_categories",
    "column_name": "category_id",
    "description": "Reference to either predefined_categories.id or user_categories.id"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "effect",
    "description": "Descripcion del efecto"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "secret",
    "description": "Descripcion del secreto"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "reset",
    "description": "Tiempo para volver a hacer el truco desde 0"
  },
  {
    "table_name": "magic_tricks",
    "column_name": "search_vector",
    "description": "Columna tsvector pre-calculada para búsqueda full-text optimizada multi-idioma. Usa configuración \"simple\" que funciona con español, inglés y otros idiomas sin stemming específico."
  },
  {
    "table_name": "predefined_tags",
    "column_name": "usage_count",
    "description": "Contador de veces que esta etiqueta ha sido utilizada en trucos"
  },
  {
    "table_name": "profiles",
    "column_name": "bio",
    "description": "Biografía o descripción del usuario"
  },
  {
    "table_name": "profiles",
    "column_name": "avatar_url",
    "description": "URL de la imagen de perfil del usuario"
  },
  {
    "table_name": "profiles",
    "column_name": "preferences",
    "description": "Almacena preferencias del usuario como: {\"theme\": \"dark\", \"language\": \"es\", \"notifications\": {\"email\": true, \"push\": false}}"
  },
  {
    "table_name": "profiles",
    "column_name": "follower_count",
    "description": "Contador de seguidores (actualizado automáticamente)"
  },
  {
    "table_name": "profiles",
    "column_name": "following_count",
    "description": "Contador de usuarios que sigue (actualizado automáticamente)"
  },
  {
    "table_name": "technique_categories",
    "column_name": "technique_id",
    "description": "Reference to the technique being categorized"
  },
  {
    "table_name": "technique_categories",
    "column_name": "category_id",
    "description": "Reference to either predefined_categories.id or user_categories.id"
  },
  {
    "table_name": "technique_tags",
    "column_name": "technique_id",
    "description": "Reference to the technique being tagged"
  },
  {
    "table_name": "technique_tags",
    "column_name": "tag_id",
    "description": "Reference to predefined_tags.id"
  }
]

---

## 📊 Resumen Ejecutivo

### Tablas Principales
- **magic_tricks** → [X] filas, [X] MB
- **user_categories** → [X] filas, [X] MB
- **trick_photos** → [X] filas, [X] MB

### Índices Críticos
- ✅ `idx_magic_tricks_search_vector` (FTS)
- ✅ `idx_magic_tricks_user_created` (Queries por usuario)
- ✅ `idx_magic_tricks_angles` (JSONB)

### Triggers Activos
- ✅ `tsvector_update_trigger` (Actualiza FTS)
- ✅ `update_updated_at_trigger` (Actualiza timestamps)

### RLS Configurado
- ✅ Todos los usuarios solo ven sus propios datos
- ✅ Políticas por operación (SELECT, INSERT, UPDATE, DELETE)

### Optimizaciones Aplicadas
- ✅ Full-Text Search multi-idioma con índice GIN
- ✅ Índices en columnas frecuentemente consultadas
- ✅ Triggers automáticos para mantener datos sincronizados

---

## 🔄 Instrucciones para Actualizar

1. Ejecuta todas las queries del archivo `SUPABASE_DATABASE_MAP.sql`
2. Copia y pega los resultados en las secciones correspondientes
3. Actualiza la fecha en el encabezado
4. Commit y push al repositorio

**Frecuencia recomendada:** Actualizar después de:
- Agregar/modificar tablas
- Crear/modificar índices
- Cambiar políticas RLS
- Agregar triggers o funciones

---

## 📚 Archivos Relacionados

- `SUPABASE_DATABASE_MAP.sql` → Queries para generar este snapshot
- `FTS_MULTILANGUAGE_MIGRATION.sql` → Migración FTS
- `FTS_MULTILANGUAGE_GUIDE.md` → Guía de Full-Text Search
- `SEARCH_FLOW_DIAGRAM.md` → Flujo de búsqueda en la app

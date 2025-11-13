# 🔍 Análisis de Base de Datos MMENTO - Supabase

> **Generado a partir de:** `SUPABASE_DATABASE_SNAPSHOT.md`
> **Fecha:** 2025-01-XX

---

## 📊 Resumen Ejecutivo

### Total de Tablas: 30+

**Categorías de Tablas:**

1. **Magic Tricks (Core)** - 8 tablas
   - `magic_tricks` - Tabla principal de trucos
   - `trick_categories` - Relación trucos-categorías (junction)
   - `trick_tags` - Tags de trucos
   - `trick_photos` - Múltiples fotos por truco
   - `trick_gimmicks` - Gimmicks asociados a trucos
   - `trick_techniques` - Técnicas asociadas a trucos
   - `user_categories` - Categorías personalizadas del usuario
   - `user_category_order` - Orden personalizado de categorías

2. **Gimmicks & Techniques** - 5 tablas
   - `gimmicks` - Catálogo de gimmicks
   - `gimmick_categories` - Categorías de gimmicks
   - `techniques` - Catálogo de técnicas
   - `technique_categories` - Categorías de técnicas
   - `technique_tags` - Tags de técnicas

3. **Scripts** - 1 tabla
   - `scripts` - Guiones/scripts de presentación

4. **AI (Mmento AI)** - 4 tablas
   - `ai_conversations` - Conversaciones del chat
   - `ai_messages` - Mensajes individuales
   - `ai_folders` - Carpetas para organizar chats
   - `ai_usage_tracking` - Seguimiento de uso de tokens

5. **Social & Sharing** - 3 tablas
   - `shared_content` - Contenido compartido entre usuarios
   - `messages` - Mensajes entre usuarios
   - `chat_groups` - Grupos de chat
   - `group_members` - Miembros de grupos

6. **User Management** - 6 tablas
   - `profiles` - Perfiles de usuarios
   - `user_favorites` - Favoritos del usuario
   - `roles` - Roles y permisos
   - `bans` - Usuarios baneados
   - `reports` - Reportes de contenido
   - `purchases` - Compras/suscripciones

7. **Predefined Content** - 2 tablas
   - `predefined_categories` - Categorías predefinidas del sistema
   - `predefined_tags` - Tags predefinidos del sistema

---

## 🗂️ Arquitectura de Datos

### Modelo de Relaciones: magic_tricks

```
magic_tricks (tabla principal)
    │
    ├── trick_categories ──→ user_categories
    │   (many-to-many: un truco puede tener múltiples categorías)
    │
    ├── trick_tags ──→ predefined_tags (?)
    │   (many-to-many: un truco puede tener múltiples tags)
    │
    ├── trick_photos
    │   (one-to-many: un truco puede tener múltiples fotos)
    │
    ├── trick_gimmicks ──→ gimmicks
    │   (many-to-many: un truco puede usar múltiples gimmicks)
    │
    ├── trick_techniques ──→ techniques
    │   (many-to-many: un truco puede usar múltiples técnicas)
    │
    ├── user_favorites
    │   (many-to-many: usuario puede marcar como favorito)
    │
    └── shared_content
        (un truco puede ser compartido públicamente)
```

### Junction Tables (Tablas Intermedias)

Las siguientes son tablas de relación many-to-many:

1. **trick_categories** - Conecta `magic_tricks` ↔ `user_categories`
2. **trick_tags** - Conecta `magic_tricks` ↔ tags
3. **trick_gimmicks** - Conecta `magic_tricks` ↔ `gimmicks`
4. **trick_techniques** - Conecta `magic_tricks` ↔ `techniques`
5. **technique_tags** - Conecta `techniques` ↔ tags
6. **group_members** - Conecta `chat_groups` ↔ `profiles`

---

## 🔍 Queries "Success" Sin Resultados

Cuando una query retorna "Success" sin datos, significa:

### ✅ **Normal (Tabla Vacía o Sin Coincidencias)**

1. **Query 3.5 - Índices no usados**
   - ✅ Buena señal: Todos tus índices se están usando
   - Significa que no tienes índices innecesarios

2. **Query 5.2 - Políticas RLS específicas**
   - Puede que no tengas políticas con ciertos nombres
   - O todas las políticas son genéricas

3. **Query 6.1 - Tipos ENUM**
   - Puede que uses strings en lugar de ENUMs
   - O que los ENUMs estén en otro schema

4. **Query 9.x - Datos de ejemplo**
   - Las tablas pueden estar vacías
   - Es normal en desarrollo

### ⚠️ **Requiere Atención**

1. **Query 11.1 - Columnas tsvector**
   - ❌ Si retorna vacío: NO tienes la columna `search_vector`
   - 🔧 **Acción:** Ejecutar `FTS_MULTILANGUAGE_MIGRATION.sql`

2. **Query 4.1/4.2 - Triggers/Funciones**
   - ❌ Si retorna vacío: NO tienes triggers automáticos
   - 🔧 **Acción:** Necesitas crear triggers para FTS

---

## 🚀 Acciones Recomendadas

### Prioridad ALTA ⚡

1. **Ejecutar Migración FTS**
   ```bash
   # Si Query 11.1 retornó vacío
   # Ejecutar: FTS_MULTILANGUAGE_MIGRATION.sql
   ```

2. **Verificar Índices en magic_tricks**
   - ✅ Debe tener índice en `user_id`
   - ✅ Debe tener índice en `created_at`
   - ✅ Debe tener índice GIN en `search_vector` (después de migración)
   - ✅ Debe tener índice GIN en `angles` (JSONB)

3. **Verificar RLS en Todas las Tablas**
   - Todas las tablas con `user_id` deben tener RLS
   - Política típica: `WHERE auth.uid() = user_id`

### Prioridad MEDIA 📋

4. **Optimizar Junction Tables**
   - Verificar índices compuestos en:
     - `trick_categories(trick_id, category_id)`
     - `trick_tags(trick_id, tag_id)`
     - `trick_gimmicks(trick_id, gimmick_id)`

5. **Revisar Tablas Sin Uso**
   - Identificar tablas con 0 filas
   - Considerar si son necesarias

6. **Documentar Tablas Nuevas**
   - Hay muchas tablas que no están en CLAUDE.md:
     - `ai_*` (4 tablas)
     - `gimmicks`, `techniques` (5 tablas)
     - `scripts`, `chat_groups`, etc.

### Prioridad BAJA 🔧

7. **Crear Vistas Útiles**
   ```sql
   -- Vista: Trucos con todas sus relaciones
   CREATE VIEW vw_magic_tricks_full AS
   SELECT
       mt.*,
       array_agg(DISTINCT uc.name) AS categories,
       array_agg(DISTINCT g.name) AS gimmicks,
       array_agg(DISTINCT t.name) AS techniques
   FROM magic_tricks mt
   LEFT JOIN trick_categories tc ON mt.id = tc.trick_id
   LEFT JOIN user_categories uc ON tc.category_id = uc.id
   LEFT JOIN trick_gimmicks tg ON mt.id = tg.trick_id
   LEFT JOIN gimmicks g ON tg.gimmick_id = g.id
   LEFT JOIN trick_techniques tt ON mt.id = tt.trick_id
   LEFT JOIN techniques t ON tt.technique_id = t.id
   GROUP BY mt.id;
   ```

---

## 📈 Queries para Actualizar CLAUDE.md

Agrega estas tablas a la documentación:

```markdown
## Extended Architecture

### AI/Chat Features
- `ai_conversations` → Conversaciones del chat con IA
- `ai_messages` → Mensajes individuales
- `ai_folders` → Carpetas para organizar conversaciones
- `ai_usage_tracking` → Tracking de tokens y uso de API

### Gimmicks & Techniques System
- `gimmicks` → Catálogo de gimmicks (ej: Mazo Invisible, Elásticos)
- `gimmick_categories` → Categorías de gimmicks
- `techniques` → Catálogo de técnicas (ej: Double Lift, Palm)
- `technique_categories` → Categorías de técnicas
- `technique_tags` → Tags para técnicas

### Scripts System
- `scripts` → Guiones/scripts de presentación para trucos

### Social Features
- `shared_content` → Trucos compartidos públicamente
- `messages` → Sistema de mensajería entre usuarios
- `chat_groups` → Grupos de chat
- `group_members` → Miembros de grupos (junction table)

### Admin & Moderation
- `bans` → Usuarios baneados
- `reports` → Reportes de contenido inapropiado
- `purchases` → Compras y suscripciones

### Extended Relationships
- `trick_gimmicks` → Junction: trucos ↔ gimmicks
- `trick_techniques` → Junction: trucos ↔ técnicas
- `technique_tags` → Junction: técnicas ↔ tags
```

---

## 🔧 Query 3.5 Corregida

Ejecuta esta versión si la original falló:

```sql
-- FIX_QUERY_3.5.sql
SELECT
    schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan AS veces_usado,
    pg_size_pretty(pg_relation_size(indexrelid)) AS tamaño_desperdiciado
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 📝 Notas Importantes

### Tablas Descubiertas vs Documentadas

**En CLAUDE.md se mencionan:**
- magic_tricks ✅
- user_categories ✅
- user_favorites ✅
- trick_categories ✅
- trick_tags ✅
- trick_photos ✅
- profiles ✅

**NO documentadas (nuevas):**
- ai_conversations, ai_messages, ai_folders, ai_usage_tracking (4 tablas)
- gimmicks, gimmick_categories (2 tablas)
- techniques, technique_categories, technique_tags (3 tablas)
- scripts (1 tabla)
- shared_content (1 tabla)
- messages, chat_groups, group_members (3 tablas)
- bans, reports, purchases, roles (4 tablas)
- predefined_categories, predefined_tags (2 tablas)
- trick_gimmicks, trick_techniques (2 tablas)
- user_category_order (1 tabla)

**Total:** 23 tablas no documentadas en CLAUDE.md

---

## 🎯 Próximos Pasos

1. ✅ **Ejecutar FIX_QUERY_3.5.sql** → Ver índices no usados
2. ✅ **Actualizar CLAUDE.md** → Agregar las 23 tablas nuevas
3. ✅ **Ejecutar FTS_MULTILANGUAGE_MIGRATION.sql** → Si no tienes `search_vector`
4. ✅ **Verificar índices** → Especialmente en junction tables
5. ✅ **Documentar relaciones** → Entre gimmicks, techniques, y tricks

---

## 📚 Archivos Relacionados

- `SUPABASE_DATABASE_SNAPSHOT.md` → Snapshot completo con datos reales
- `SUPABASE_DATABASE_MAP.sql` → Queries originales (170+)
- `SUPABASE_DATABASE_MAP_ESSENTIAL.sql` → Queries simplificadas (19)
- `FIX_QUERY_3.5.sql` → Corrección para query de índices no usados
- `FTS_MULTILANGUAGE_MIGRATION.sql` → Migración Full-Text Search
- `CLAUDE.md` → Documentación del proyecto (necesita actualización)

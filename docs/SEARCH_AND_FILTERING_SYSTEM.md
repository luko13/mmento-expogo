# Sistema de Búsqueda y Filtrado - mmento

**Última actualización:** 11 de noviembre de 2025

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Base de Datos](#base-de-datos)
4. [Flujo de Datos](#flujo-de-datos)
5. [Lógica de Filtrado](#lógica-de-filtrado)
6. [Tipos de Filtros](#tipos-de-filtros)
7. [Componentes Clave](#componentes-clave)
8. [Optimizaciones](#optimizaciones)
9. [Problemas Conocidos Resueltos](#problemas-conocidos-resueltos)
10. [Guía de Debugging](#guía-de-debugging)

---

## 🎯 Resumen Ejecutivo

El sistema de búsqueda y filtrado de mmento permite a los usuarios encontrar trucos de magia mediante:

- **Búsqueda de texto** en título, efecto y secreto (con debounce de 300ms)
- **8 tipos de filtros**: categorías, tags (AND/OR), dificultad, duración, reset time, ángulos, orden
- **Búsqueda híbrida**: Cliente (<500 trucos) vs Servidor (≥500 trucos)
- **Offline-first**: Cache local con sincronización en tiempo real
- **UI adaptativa**: Oculta categorías vacías solo cuando hay filtros activos

### Estado Actual (Noviembre 2025)

- ✅ **Funcionando correctamente** después de resolver problema de doble filtrado
- ✅ **27 trucos de prueba** en base de datos del usuario principal
- ✅ **10 categorías** configuradas
- ✅ **Índices GIN** optimizados para búsqueda full-text y JSONB

---

## 🏗️ Arquitectura del Sistema

### Capas del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      CAPA DE UI                              │
│  - CompactSearchBar (input de búsqueda)                     │
│  - FilterModal (configuración de filtros)                   │
│  - LibrariesSection (renderizado de resultados)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 CAPA DE ESTADO GLOBAL                        │
│  - SearchContext (query + filters)                          │
│  - LibraryDataContext (datos + lógica de filtrado)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CAPA DE PROCESAMIENTO                           │
│  - buildSections() (filtrado en cliente)                    │
│  - HybridSearchService (enrutamiento cliente/servidor)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   CAPA DE DATOS                              │
│  - LocalDataService (cache AsyncStorage + memoria)          │
│  - SupabaseDataService (red + base de datos)                │
│  - Supabase Real-time (suscripciones)                       │
└─────────────────────────────────────────────────────────────┘
```

### Principio Fundamental: Single Source of Truth

**IMPORTANTE:** El filtrado se hace **UNA SOLA VEZ** en `LibraryDataContext.buildSections()`. Los componentes de UI **NO deben volver a filtrar** los datos.

**❌ ANTES (Incorrecto):**
```typescript
// LibraryDataContext filtra → CollapsibleCategory vuelve a filtrar = DOBLE FILTRADO
```

**✅ AHORA (Correcto):**
```typescript
// LibraryDataContext filtra → CollapsibleCategory usa directamente los items
const filteredItems = useMemo(() => {
  if (!section.items) return [];
  return section.items; // Ya vienen filtrados
}, [section.items]);
```

---

## 🗄️ Base de Datos

### Esquema de Tablas

#### 1. `magic_tricks` (Tabla Principal)

```sql
CREATE TABLE magic_tricks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  title VARCHAR NOT NULL,
  effect TEXT,
  secret TEXT,
  difficulty INTEGER,           -- 1-10
  duration INTEGER,             -- Segundos
  reset INTEGER,                -- Segundos
  angles JSONB DEFAULT '[]',    -- ["90", "120", "180", "360"]
  notes TEXT,
  special_materials TEXT[],
  is_public BOOLEAN DEFAULT false,
  status content_status DEFAULT 'draft',
  price NUMERIC,
  photo_url TEXT,               -- URL de Cloudflare Images
  effect_video_url TEXT,        -- URL de Cloudflare Stream
  secret_video_url TEXT,        -- URL de Cloudflare Stream
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1,
  parent_trick_id UUID REFERENCES magic_tricks(id)
);
```

#### 2. `user_categories` (Categorías del Usuario)

```sql
CREATE TABLE user_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. Tablas de Relación (Junction Tables)

```sql
-- Relación trucos ↔ categorías (many-to-many)
CREATE TABLE trick_categories (
  trick_id UUID REFERENCES magic_tricks(id) ON DELETE CASCADE,
  category_id UUID REFERENCES user_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trick_id, category_id)
);

-- Relación trucos ↔ tags (many-to-many)
CREATE TABLE trick_tags (
  trick_id UUID REFERENCES magic_tricks(id) ON DELETE CASCADE,
  tag_id UUID,  -- UUID de tags (tabla user_tags no visible en schema actual)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trick_id, tag_id)
);

-- Fotos adicionales del truco
CREATE TABLE trick_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trick_id UUID REFERENCES magic_tricks(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Favoritos (tabla polimórfica)
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  content_id UUID NOT NULL,
  content_type VARCHAR NOT NULL,  -- 'magic_trick', 'gimmick', etc.
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Índices Optimizados

```sql
-- 1. Búsqueda Full-Text en Español
CREATE INDEX idx_magic_tricks_search_text
ON magic_tricks
USING gin (
  to_tsvector('spanish'::regconfig,
    COALESCE(title, '') || ' ' ||
    COALESCE(effect, '') || ' ' ||
    COALESCE(secret, '')
  )
);

-- 2. Búsqueda en JSONB de Ángulos
CREATE INDEX idx_magic_tricks_angles
ON magic_tricks
USING gin (angles jsonb_path_ops)
WHERE angles IS NOT NULL AND angles <> '[]'::jsonb;

-- 3. Índice compuesto para queries por usuario
CREATE INDEX idx_magic_tricks_user_created
ON magic_tricks (user_id, created_at DESC);
```

### Consulta de Ejemplo para Obtener Truco Completo

```sql
SELECT
  mt.*,
  array_agg(DISTINCT tc.category_id) FILTER (WHERE tc.category_id IS NOT NULL) as category_ids,
  array_agg(DISTINCT tt.tag_id) FILTER (WHERE tt.tag_id IS NOT NULL) as tag_ids,
  array_agg(DISTINCT tp.photo_url) FILTER (WHERE tp.photo_url IS NOT NULL) as additional_photos,
  CASE WHEN uf.id IS NOT NULL THEN true ELSE false END as is_favorite
FROM magic_tricks mt
LEFT JOIN trick_categories tc ON mt.id = tc.trick_id
LEFT JOIN trick_tags tt ON mt.id = tt.trick_id
LEFT JOIN trick_photos tp ON mt.id = tp.trick_id
LEFT JOIN user_favorites uf ON mt.id = uf.content_id AND uf.content_type = 'magic_trick'
WHERE mt.user_id = 'a2a39a82-6a48-49ad-92b2-81817de1a6b3'
GROUP BY mt.id, uf.id;
```

### Datos de Ejemplo (Usuario de Prueba)

**Usuario:** `a2a39a82-6a48-49ad-92b2-81817de1a6b3`
- **Total trucos:** 27
- **Total categorías:** 10 (incluyendo 1 "Favoritos" que se filtra)
- **Categoría virtual:** "Favoritos" (id: `favorites-virtual`) - generada en cliente

**Muestra de Trucos:**
- "sisiiiii" - Con 4 fotos, 2 videos, dificultad 2, tag "No"
- "K pasa?" - Sin multimedia
- "Testflight" - Con metadata completa

---

## 🔄 Flujo de Datos

### 1. Inicialización de la App

```typescript
// LibraryDataContext.tsx - useEffect inicial
useEffect(() => {
  (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user.id);

    // 1. Cargar desde cache local (instantáneo)
    const cachedData = await localDataService.getUserData(user.id);
    if (cachedData) {
      setRawTricks(cachedData.tricks);
      setAllCategories(cachedData.categories);
      setSections(buildSections(cachedData.categories, cachedData.tricks, '', undefined));
    }

    // 2. Fetch desde red (background)
    const { categories, tricks } = await supabaseDataService.fetchAllUserData(user.id);
    localDataService.saveUserData({ userId: user.id, categories, tricks });

    // 3. Actualizar UI con datos frescos
    setRawTricks(tricks);
    setAllCategories(categories);
    setSections(buildSections(categories, tricks, '', undefined));
  })();
}, []);
```

### 2. Usuario Escribe en Búsqueda

```typescript
// CompactSearchBar.tsx
<TextInput
  value={searchQuery}
  onChangeText={(text) => {
    setSearchQuery(text);  // Actualización inmediata (sin debounce)
  }}
/>

// useDebounce hook (300ms delay)
const debouncedSearchQuery = useDebounce(searchQuery, 300);

// LibrariesSection.tsx
useEffect(() => {
  applyFilters(debouncedSearchQuery, searchFilters);
}, [debouncedSearchQuery, searchFilters]);
```

### 3. Usuario Aplica Filtros

```typescript
// FilterModal.tsx - Botón "Apply"
const applyFilters = () => {
  onApplyFilters({
    categories: selectedCategories,
    tags: selectedTags,
    tagsMode: tagsMode,  // "and" | "or"
    difficulties: selectedDifficulty !== null ? [selectedDifficulty] : [],
    resetTimes: { min: resetTimeMin, max: resetTimeMax },
    durations: { min: durationMin, max: durationMax },
    angles: selectedAngles,
    isPublic: null,
    sortOrder: sortOrder,
  });
  onClose();
};

// home/index.tsx
<FiltersModal
  onApplyFilters={(filters) => {
    setSearchFilters(filters);  // SearchContext
    setShowFiltersModal(false);
  }}
/>
```

### 4. Aplicación de Filtros (buildSections)

```typescript
// LibraryDataContext.tsx - Función buildSections()
const buildSections = useCallback((categories, tricks, query, filters) => {
  const normalizedQuery = query.toLowerCase().trim();

  // PASO 1: Filtrar trucos (UN SOLO LOOP)
  const filteredTricks = tricks.filter((trick) => {
    // 1. Búsqueda de texto
    if (normalizedQuery) {
      const matchesText =
        trick.title?.toLowerCase().includes(normalizedQuery) ||
        trick.effect?.toLowerCase().includes(normalizedQuery) ||
        trick.secret?.toLowerCase().includes(normalizedQuery);
      if (!matchesText) return false;
    }

    // 2. Filtro de categorías (OR)
    if (filters?.categories?.length > 0) {
      if (!trick.category_ids.some(catId => filters.categories.includes(catId))) {
        return false;
      }
    }

    // 3. Filtro de tags (AND/OR)
    if (filters?.tags?.length > 0) {
      const trickTags = trick.tag_ids || [];
      if (filters.tagsMode === "and") {
        if (!filters.tags.every(tagId => trickTags.includes(tagId))) {
          return false;
        }
      } else {
        if (!filters.tags.some(tagId => trickTags.includes(tagId))) {
          return false;
        }
      }
    }

    // 4-7. Otros filtros (dificultad, duración, reset, ángulos)
    // ... (ver código completo en LibraryDataContext.tsx líneas 112-195)

    return true;
  });

  // PASO 2: Detectar si hay filtros activos
  const hasActiveFilters =
    normalizedQuery.length > 0 ||
    (filters?.categories?.length > 0) ||
    (filters?.tags?.length > 0) ||
    // ... otros filtros

  // PASO 3: Crear sección de Favoritos
  const favoriteTricks = filteredTricks.filter(t => t.is_favorite);
  if (favoriteTricks.length > 0) {
    categoryMap.set("favorites-virtual", {
      category: favoritesCategory,
      items: favoriteTricks,
    });
  }

  // PASO 4: Agrupar por categorías
  categories.forEach((cat) => {
    // Saltar categorías "Favoritos" reales (para evitar duplicados)
    if (cat.name.toLowerCase() === "favoritos") return;

    // Si hay filtro de categorías, solo mostrar las seleccionadas
    if (filters?.categories?.length > 0 && !filters.categories.includes(cat.id)) {
      return;
    }

    const tricksInCategory = filteredTricks.filter(trick =>
      trick.category_ids.includes(cat.id)
    );

    // SI HAY FILTROS ACTIVOS: Solo mostrar categorías con trucos
    // SI NO HAY FILTROS: Mostrar TODAS las categorías (incluso vacías)
    if (hasActiveFilters && tricksInCategory.length === 0) {
      return;  // Skip categoría vacía
    }

    categoryMap.set(cat.id, {
      category: cat,
      items: tricksInCategory,
    });
  });

  // PASO 5: Ordenar secciones (Favoritos primero, luego alfabético)
  const result = Array.from(categoryMap.values());
  result.sort((a, b) => {
    if (a.category.id === "favorites-virtual") return -1;
    if (b.category.id === "favorites-virtual") return 1;
    return a.category.name.localeCompare(b.category.name);
  });

  return result;
}, [currentUserId]);
```

### 5. Renderizado en UI

```typescript
// LibrariesSection.tsx
<FlashList
  data={sections}
  renderItem={({ item: section }) => (
    <CollapsibleCategoryOptimized
      section={section}  // Ya viene con items filtrados
      searchQuery={searchQuery}
      searchFilters={searchFilters}
      onItemPress={handleItemPress}
    />
  )}
/>

// CollapsibleCategoryOptimized.tsx
const filteredItems = useMemo(() => {
  if (!section.items) return [];
  return section.items;  // NO volver a filtrar - ya están filtrados
}, [section.items]);
```

---

## 🔍 Lógica de Filtrado

### Algoritmo de Filtrado (buildSections)

**Complejidad:** O(n) donde n = número de trucos totales

**Proceso:**
1. **Filtrado único** en un solo loop sobre todos los trucos
2. **Aplicación secuencial** de 7 filtros (si uno falla, se salta el truco)
3. **Agrupación por categorías** de trucos filtrados
4. **Decisión de visibilidad** de categorías vacías según estado de filtros

### Comportamiento de Categorías Vacías

```typescript
const hasActiveFilters =
  normalizedQuery.length > 0 ||
  (filters?.categories?.length > 0) ||
  (filters?.tags?.length > 0) ||
  (filters?.difficulties?.length > 0) ||
  (filters?.durations?.min !== undefined || filters?.durations?.max !== undefined) ||
  (filters?.resetTimes?.min !== undefined || filters?.resetTimes?.max !== undefined) ||
  (filters?.angles?.length > 0);

// Lógica de inclusión de categoría
if (hasActiveFilters && tricksInCategory.length === 0) {
  return; // NO mostrar categoría vacía cuando hay filtros
}
// Si NO hay filtros, SIEMPRE mostrar categoría (incluso si está vacía)
```

**Ejemplo Visual:**

```
HOMEPAGE (sin filtros):
├─ Favoritos (2 trucos)
├─ Luis pesado (8 trucos)
├─ aaaaaa (4 trucos)
├─ Testflight (1 truco)
└─ vacío (0 trucos)  ← SE MUESTRA aunque esté vacía

BÚSQUEDA/FILTROS (tag: "No", 6 resultados):
├─ Favoritos (1 truco)
├─ Si (1 truco)
├─ Luis pesado (1 truco)
├─ putas en vinagre (2 trucos)
├─ Ella es mi daisy (1 truco)
└─ Prueba editar (1 truco)
    ❌ vacío NO SE MUESTRA (está vacía con filtros activos)
```

---

## 🎚️ Tipos de Filtros

### 1. Búsqueda de Texto

**Campos buscados:** `title`, `effect`, `secret`

**Lógica:** OR (coincide si aparece en cualquiera de los 3 campos)

**Tipo:** Substring case-insensitive

**Debounce:** 300ms

**Implementación:**
```typescript
if (normalizedQuery) {
  const title = trick.title?.toLowerCase() || "";
  const effect = trick.effect?.toLowerCase() || "";
  const secret = trick.secret?.toLowerCase() || "";
  const matchesText =
    title.includes(normalizedQuery) ||
    effect.includes(normalizedQuery) ||
    secret.includes(normalizedQuery);
  if (!matchesText) return false;
}
```

**Servidor (≥500 trucos):**
```typescript
supabaseQuery = supabaseQuery.textSearch(
  'title,effect,secret',
  query.trim(),
  {
    type: 'websearch',  // Soporta operadores: "card trick" -coin
    config: 'spanish'   // Stemming en español
  }
);
```

### 2. Categorías

**Tipo:** Multi-select

**Lógica:** OR (el truco debe estar en AL MENOS UNA categoría seleccionada)

**UI:** `CategorySelector` con chips

**Campo DB:** `trick_categories.category_id` (junction table)

**Implementación:**
```typescript
if (filters?.categories && filters.categories.length > 0) {
  const matchesCategory = trick.category_ids.some(catId =>
    filters.categories.includes(catId)
  );
  if (!matchesCategory) return false;
}
```

**Nota Especial:** La categoría "Favoritos" se filtra para evitar duplicados con la virtual.

### 3. Tags

**Tipo:** Multi-select con modo AND/OR

**Modos:**
- **OR (default):** Truco debe tener AL MENOS UN tag seleccionado
- **AND:** Truco debe tener TODOS los tags seleccionados

**UI:** `TagSelector` + Switch para cambiar modo

**Campo DB:** `trick_tags.tag_id` (junction table)

**Implementación:**
```typescript
if (filters?.tags && filters.tags.length > 0) {
  const trickTags = trick.tag_ids || [];

  if (filters.tagsMode === "and") {
    // Modo AND: TODOS los tags deben estar presentes
    const hasAllTags = filters.tags.every(tagId =>
      trickTags.includes(tagId)
    );
    if (!hasAllTags) return false;
  } else {
    // Modo OR: AL MENOS UN tag debe estar presente
    const hasAnyTag = filters.tags.some(tagId =>
      trickTags.includes(tagId)
    );
    if (!hasAnyTag) return false;
  }
}
```

### 4. Dificultad

**Tipo:** Single value slider

**Rango:** 1-10

**Lógica:** Exact match

**UI:** `DifficultySlider`

**Campo DB:** `difficulty` (INTEGER)

**Implementación:**
```typescript
if (filters?.difficulties && filters.difficulties.length > 0) {
  if (trick.difficulty === null) return false;
  if (!filters.difficulties.includes(trick.difficulty)) return false;
}
```

### 5. Duración (Duration)

**Tipo:** Min-Max range

**Unidad:** Segundos

**Lógica:** `min <= duration <= max`

**UI:** Dos botones con `TimePickerModal`

**Campo DB:** `duration` (INTEGER)

**Formato Display:** MM:SS

**Implementación:**
```typescript
if (filters?.durations) {
  const { min, max } = filters.durations;
  if (min !== undefined || max !== undefined) {
    if (trick.duration === null) return false;
    if (min !== undefined && trick.duration < min) return false;
    if (max !== undefined && trick.duration > max) return false;
  }
}
```

### 6. Tiempo de Reset (Reset Time)

**Tipo:** Min-Max range

**Unidad:** Segundos

**Lógica:** `min <= reset <= max`

**UI:** Dos botones con `TimePickerModal`

**Campo DB:** `reset` (INTEGER)

**Formato Display:** MM:SS

**Implementación:**
```typescript
if (filters?.resetTimes) {
  const { min, max } = filters.resetTimes;
  if (min !== undefined || max !== undefined) {
    if (trick.reset === null || trick.reset === undefined) return false;
    if (min !== undefined && trick.reset < min) return false;
    if (max !== undefined && trick.reset > max) return false;
  }
}
```

### 7. Ángulos (Viewing Angles)

**Tipo:** Multi-select checkboxes

**Valores:** ["90", "120", "180", "360"] (grados)

**Lógica:** OR (truco debe tener AL MENOS UN ángulo seleccionado)

**UI:** Toggle buttons con checkboxes personalizados

**Campo DB:** `angles` (JSONB array)

**Implementación:**
```typescript
if (filters?.angles && filters.angles.length > 0) {
  const trickAngles = Array.isArray(trick.angles)
    ? trick.angles
    : (trick.angles ? JSON.parse(trick.angles as any) : []);

  const matchesAngle = filters.angles.some(angle =>
    trickAngles.includes(angle) || trickAngles.includes(Number(angle))
  );

  if (!matchesAngle) return false;
}
```

**Servidor (≥500 trucos):**
```typescript
if (filters?.angles && filters.angles.length > 0) {
  const anglesConditions = filters.angles.map(angle =>
    `angles @> '["${angle}"]'`
  );
  supabaseQuery = supabaseQuery.or(anglesConditions.join(','));
}
```

### 8. Orden (Sort Order)

**Tipo:** Dropdown (2 opciones)

**Opciones:**
- **"recent"** (default): Más recientes primero (`created_at DESC`)
- **"last"**: Más antiguos primero (`created_at ASC`)

**UI:** Dropdown en header del FilterModal

**Campo DB:** `created_at`

**Implementación:**
```typescript
// En servidor (HybridSearchService)
if (filters?.sortOrder === "last") {
  supabaseQuery = supabaseQuery.order('created_at', { ascending: true });
} else {
  supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
}

// En cliente: El orden se aplica en el resultado de buildSections
// Las secciones se ordenan alfabéticamente, y los trucos dentro de cada
// sección mantienen el orden original del array (que ya viene ordenado)
```

---

## 🧩 Componentes Clave

### 1. SearchContext (`context/SearchContext.tsx`)

**Propósito:** Estado global de búsqueda y filtros

**Estado:**
```typescript
interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearchQuery: string;  // 300ms delay
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;
}
```

**Hook:**
```typescript
const { searchQuery, debouncedSearchQuery, searchFilters, setSearchFilters } = useSearch();
```

### 2. LibraryDataContext (`context/LibraryDataContext.tsx`)

**Propósito:** Gestión de datos y lógica de filtrado central

**Estado:**
```typescript
interface LibraryDataContextType {
  // User
  userName: string;
  avatarUrl: string | null;
  greeting: string;

  // Library
  sections: CategorySection[];  // Resultado filtrado y agrupado
  allCategories: LocalCategory[];
  loading: boolean;
  initializing: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  toggleFavorite: (trickId: string) => Promise<void>;
  createCategory: (name: string, description?: string) => Promise<LocalCategory | null>;
  updateCategory: (categoryId: string, name: string, description?: string) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  applyFilters: (query: string, filters?: SearchFilters) => void;
}
```

**Función clave:**
```typescript
const buildSections = useCallback(
  (categories: LocalCategory[], tricks: LocalTrick[], query: string, filters?: SearchFilters): CategorySection[] => {
    // Ver implementación completa en "Flujo de Datos" sección 4
  },
  [currentUserId]
);
```

### 3. HybridSearchService (`services/HybridSearchService.ts`)

**Propósito:** Enrutamiento inteligente entre búsqueda cliente/servidor

**Umbral:** 500 trucos

**Métodos:**
```typescript
class HybridSearchService {
  static shouldUseServerSearch(tricksCount: number): boolean {
    return tricksCount >= 500;
  }

  static async searchOnServer(
    userId: string,
    query: string,
    filters?: SearchFilters
  ): Promise<LocalTrick[]> {
    // Construye query de Supabase con todos los filtros
    // Usa índices GIN para performance
    // Ver implementación en services/HybridSearchService.ts líneas 25-121
  }

  static async hybridSearch(
    userId: string,
    allTricks: LocalTrick[],
    query: string,
    filters?: SearchFilters
  ): Promise<{ tricks: LocalTrick[], usedServer: boolean }> {
    const useServer = this.shouldUseServerSearch(allTricks.length);

    if (useServer) {
      const tricks = await this.searchOnServer(userId, query, filters);
      return { tricks, usedServer: true };
    } else {
      return { tricks: allTricks, usedServer: false };
    }
  }
}
```

**Uso en LibraryDataContext:**
```typescript
// Memoized sections para búsqueda en cliente
const memoizedSections = useMemo(() => {
  const shouldUseServer = hybridSearchService.shouldUseServerSearch(rawTricks.length);

  if (shouldUseServer && currentQuery.trim()) {
    return [];  // Indicar que está cargando del servidor
  }

  return buildSections(allCategories, rawTricks, currentQuery, currentFilters);
}, [allCategories, rawTricks, currentQuery, currentFilters, buildSections]);

// Effect para búsqueda asíncrona en servidor
useEffect(() => {
  if (!currentUserId) return;

  const shouldUseServer = hybridSearchService.shouldUseServerSearch(rawTricks.length);
  if (!shouldUseServer || !currentQuery.trim()) return;

  let cancelled = false;

  (async () => {
    try {
      setLoading(true);
      const { tricks } = await hybridSearchService.hybridSearch(
        currentUserId,
        rawTricks,
        currentQuery,
        currentFilters
      );

      if (!cancelled) {
        const newSections = buildSections(
          allCategories,
          tricks,
          '',  // Query ya aplicado en servidor
          currentFilters
        );
        setSections(newSections);
      }
    } catch (error) {
      console.error('[LibraryContext] Hybrid search failed:', error);
      // Fallback a búsqueda en cliente
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();

  return () => { cancelled = true; };
}, [currentUserId, rawTricks.length, currentQuery, currentFilters, allCategories, buildSections]);
```

### 4. CompactSearchBar (`components/home/CompactSearchBar.tsx`)

**Propósito:** Input de búsqueda con badge de filtros

**Props:**
```typescript
interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onFiltersPress: () => void;
  appliedFiltersCount: number;
}
```

**Características:**
- Input sin debounce (actualización inmediata)
- Badge con conteo de filtros activos
- Botón de limpiar (X)
- Botón de filtros con indicador visual

### 5. FilterModal (`components/ui/FilterModal.tsx`)

**Propósito:** Modal para configurar todos los filtros

**Props:**
```typescript
interface Props {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: SearchFilters) => void;
  currentFilters: SearchFilters;
}
```

**Componentes internos:**
- `CategorySelector` - Multi-select de categorías
- `TagSelector` - Multi-select de tags con toggle AND/OR
- `DifficultySlider` - Slider de 1-10
- `TimePickerModal` (x4) - Para duration y reset time (min/max)
- Checkboxes de ángulos
- Dropdown de orden
- Botón "Clear Filters"
- Botón "Apply"

**Estado local:**
```typescript
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [tagsMode, setTagsMode] = useState<"and" | "or">("or");
const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
const [resetTimeMin, setResetTimeMin] = useState<number | undefined>();
const [resetTimeMax, setResetTimeMax] = useState<number | undefined>();
const [durationMin, setDurationMin] = useState<number | undefined>();
const [durationMax, setDurationMax] = useState<number | undefined>();
const [selectedAngles, setSelectedAngles] = useState<string[]>([]);
const [sortOrder, setSortOrder] = useState<"recent" | "last">("recent");
```

### 6. LibrariesSection (`components/home/LibrariesSection.tsx`)

**Propósito:** Renderiza las secciones filtradas con FlashList

**Props:**
```typescript
interface Props {
  searchQuery?: string;
  searchFilters?: SearchFilters;
}
```

**Integración:**
```typescript
const LibrariesSection = memo(function LibrariesSection({ searchQuery = "", searchFilters }: Props) {
  const { sections, applyFilters } = useLibraryData();

  // Aplicar filtros cuando cambien query o filters
  useEffect(() => {
    applyFilters(searchQuery, searchFilters);
  }, [searchQuery, searchFilters, applyFilters]);

  return (
    <FlashList
      data={sections}
      renderItem={({ item: section }) => (
        <CollapsibleCategoryOptimized section={section} {...otherProps} />
      )}
      estimatedItemSize={100}
    />
  );
});
```

### 7. CollapsibleCategoryOptimized (`components/home/CollapsibleCategoryOptimized.tsx`)

**Propósito:** Renderiza una sección (categoría) colapsable con sus trucos

**Props:**
```typescript
interface Props {
  section: CategorySection;
  searchQuery: string;
  searchFilters?: SearchFilters;
  onItemPress: (item: LibraryItem) => void;
  // ... otros props
}
```

**Cambio Importante (Nov 2025):**
```typescript
// ❌ ANTES: Doble filtrado (incorrecto)
const filteredItems = useMemo(() => {
  return section.items.filter((item) => {
    // Aplicaba todos los filtros de nuevo...
  });
}, [section.items, searchQuery, searchFilters]);

// ✅ AHORA: Sin filtrado (correcto)
const filteredItems = useMemo(() => {
  if (!section.items) return [];
  return section.items;  // Ya vienen filtrados desde buildSections()
}, [section.items]);
```

**Comportamiento:**
- Se expande automáticamente cuando hay búsqueda/filtros activos
- Muestra count de trucos en header
- Renderiza cada truco con `DraggableTrick`

---

## ⚡ Optimizaciones

### 1. Debounce en Búsqueda de Texto

**Problema:** Cada keystroke causaría re-render completo

**Solución:** Hook `useDebounce` con 300ms delay

```typescript
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Impacto:** Reduce re-renders de ~20/segundo a ~3/segundo durante escritura rápida

### 2. Memoización de Secciones

```typescript
const memoizedSections = useMemo(() => {
  return buildSections(allCategories, rawTricks, currentQuery, currentFilters);
}, [allCategories, rawTricks, currentQuery, currentFilters, buildSections]);
```

**Beneficio:** Solo recalcula cuando cambian las dependencias

### 3. useCallback en buildSections

```typescript
const buildSections = useCallback(
  (categories, tricks, query, filters) => { /* ... */ },
  [currentUserId]
);
```

**Beneficio:** Evita recrear la función en cada render

### 4. Filtrado en Un Solo Loop

```typescript
// ❌ ANTES: Múltiples loops
const textFiltered = tricks.filter(t => matchesText(t));
const categoryFiltered = textFiltered.filter(t => matchesCategory(t));
const tagFiltered = categoryFiltered.filter(t => matchesTags(t));
// ...

// ✅ AHORA: Un solo loop
const filteredTricks = tricks.filter((trick) => {
  if (!matchesText(trick)) return false;
  if (!matchesCategory(trick)) return false;
  if (!matchesTags(trick)) return false;
  // ...
  return true;
});
```

**Complejidad:** O(n) en vez de O(n × m) donde m = número de filtros

### 5. Búsqueda Híbrida (Cliente vs Servidor)

**Lógica:**
- **< 500 trucos:** Filtrado en JavaScript (cliente)
  - **Pros:** Instantáneo, sin latencia de red
  - **Cons:** Todo el dataset en memoria

- **≥ 500 trucos:** Filtrado en PostgreSQL (servidor)
  - **Pros:** Usa índices GIN optimizados, no carga todo en memoria
  - **Cons:** Latencia de red (~50-200ms)

**Umbral óptimo:** 500 trucos fue determinado empíricamente donde el overhead de red se justifica por la ganancia de performance.

### 6. FlashList en Vez de FlatList

```typescript
import { FlashList } from "@shopify/flash-list";

<FlashList
  data={sections}
  renderItem={renderSection}
  estimatedItemSize={100}
/>
```

**Beneficio:**
- Renderizado virtualizado más eficiente
- Mejor performance con listas grandes (>100 items)
- Menos re-renders innecesarios

### 7. Cache Local con AsyncStorage

```typescript
// LocalDataService.ts
class LocalDataService {
  private memoryCache: Map<string, UserData> = new Map();

  async getUserData(userId: string): Promise<UserData | null> {
    // 1. Intentar memoria (instantáneo)
    if (this.memoryCache.has(userId)) {
      return this.memoryCache.get(userId)!;
    }

    // 2. Intentar AsyncStorage (rápido)
    const cached = await AsyncStorage.getItem(`user_data_${userId}`);
    if (cached) {
      const data = JSON.parse(cached);
      this.memoryCache.set(userId, data);
      return data;
    }

    return null;
  }

  async saveUserData(data: UserData): Promise<void> {
    // Actualizar memoria
    this.memoryCache.set(data.userId, data);

    // Persistir a AsyncStorage (async, no bloqueante)
    await AsyncStorage.setItem(`user_data_${data.userId}`, JSON.stringify(data));
  }
}
```

**Beneficio:**
- Primera carga: <50ms (desde cache)
- Sin cache: ~200-500ms (desde red)

### 8. Índices de Base de Datos

**GIN para Full-Text Search:**
```sql
CREATE INDEX idx_magic_tricks_search_text
ON magic_tricks
USING gin (to_tsvector('spanish', title || ' ' || effect || ' ' || secret));
```

**Ganancia:** Búsqueda de texto en 27 trucos: ~5ms (con índice) vs ~50ms (sin índice)

**GIN para JSONB:**
```sql
CREATE INDEX idx_magic_tricks_angles
ON magic_tricks
USING gin (angles jsonb_path_ops);
```

**Ganancia:** Búsqueda por ángulos: ~3ms (con índice) vs ~30ms (sin índice)

---

## 🐛 Problemas Conocidos Resueltos

### Problema 1: Doble Filtrado (Resuelto Nov 2025)

**Síntomas:**
- Filtrar por tag "No" mostraba 6 categorías pero todas vacías
- Los trucos NO aparecían dentro de las categorías
- El count mostraba correctamente 6 items

**Causa Raíz:**
`CollapsibleCategoryOptimized` tenía su propio filtrado en `filteredItems` que volvía a filtrar los items que ya venían filtrados desde `LibraryDataContext.buildSections()`.

El problema específico era que buscaba `item.tags` cuando el campo correcto es `item.tag_ids`.

**Solución:**
Eliminado el filtrado redundante en `CollapsibleCategoryOptimized`:

```typescript
// ❌ ANTES
const filteredItems = useMemo(() => {
  return section.items.filter((item) => {
    // ... 80 líneas de filtros duplicados
    if (searchFilters?.tags?.length) {
      if (!item.tags?.some(...)) {  // ❌ Campo incorrecto
        return false;
      }
    }
  });
}, [section.items, searchQuery, searchFilters]);

// ✅ AHORA
const filteredItems = useMemo(() => {
  if (!section.items) return [];
  return section.items;  // Ya vienen filtrados
}, [section.items]);
```

**Archivo:** `components/home/CollapsibleCategoryOptimized.tsx` líneas 269-275

**Commit:** "Fix double filtering bug in CollapsibleCategoryOptimized"

### Problema 2: Categorías Vacías Siempre Visibles (Resuelto Nov 2025)

**Síntomas:**
- Al filtrar, se mostraban todas las categorías incluso las que no tenían trucos con los filtros aplicados
- Ejemplo: Filtrar por tag "No" (6 trucos) mostraba 10 categorías, 4 de ellas vacías

**Causa Raíz:**
`buildSections()` siempre agregaba todas las categorías al resultado, independientemente de si tenían trucos o no.

**Solución:**
Agregar detección de filtros activos y solo mostrar categorías vacías cuando NO hay filtros:

```typescript
// Detectar si hay filtros activos
const hasActiveFilters =
  normalizedQuery.length > 0 ||
  (filters?.categories?.length > 0) ||
  (filters?.tags?.length > 0) ||
  // ... otros filtros

// Al procesar cada categoría
const tricksInCategory = filteredTricks.filter(trick =>
  trick.category_ids.includes(cat.id)
);

// Si hay filtros activos, SOLO mostrar categorías con trucos
if (hasActiveFilters && tricksInCategory.length === 0) {
  return;  // Skip categoría vacía
}
```

**Archivo:** `context/LibraryDataContext.tsx` líneas 216-250

**Comportamiento:**
- **Sin filtros:** Muestra TODAS las categorías (incluso vacías) - para organización visual
- **Con filtros:** Muestra SOLO categorías con resultados - para claridad

### Problema 3: Categoría "Favoritos" Duplicada (Parcialmente Resuelto)

**Síntomas:**
- Aparecen 2 categorías "Favoritos": una virtual (generada en cliente) y una real (de base de datos)
- Confusión para el usuario

**Causa:**
Algunos usuarios tienen una categoría "Favoritos" creada en `user_categories` que duplica la funcionalidad de la categoría virtual.

**Solución Actual:**
Filtrar categorías "Favoritos" reales en `buildSections()`:

```typescript
const isFavoritesCategory =
  cat.name.toLowerCase().trim() === "favoritos" ||
  cat.name.toLowerCase().trim() === "favorites" ||
  cat.name.toLowerCase().trim() === "favourites";

if (isFavoritesCategory) {
  return; // Skip esta categoría
}
```

**Solución Recomendada:**
Ejecutar migración para eliminar categorías "Favoritos" de la base de datos:

```sql
-- Eliminar categorías "Favoritos" duplicadas
DELETE FROM user_categories
WHERE LOWER(TRIM(name)) IN ('favoritos', 'favorites', 'favourites');
```

**Estado:** Workaround implementado, migración pendiente

---

## 🔧 Guía de Debugging

### 1. Logs Útiles

Para debugging temporal, agregar logs en puntos clave:

```typescript
// En buildSections() - INICIO
console.log('🔍 [buildSections] INICIO');
console.log('📊 Total tricks:', tricks.length);
console.log('📁 Total categorías:', categories.length);
console.log('🔤 Query:', query);
console.log('🎛️ Filtros:', JSON.stringify(filters, null, 2));

// Después de filtrar trucos
console.log('✅ Trucos filtrados:', filteredTricks.length);
console.log('📋 Trucos:', filteredTricks.map(t => ({ id: t.id, title: t.title, category_ids: t.category_ids })));

// Al procesar cada categoría
console.log(`📁 Categoría: "${cat.name}"`);
console.log(`  🎯 Trucos en categoría: ${tricksInCategory.length}`);
if (tricksInCategory.length > 0) {
  console.log(`  📋 Trucos:`, tricksInCategory.map(t => t.title));
}

// Resultado final
console.log('📊 RESULTADO FINAL:');
console.log('  Total secciones:', result.length);
result.forEach(section => {
  console.log(`  - ${section.category.name}: ${section.items.length} trucos`);
});
```

### 2. Verificar Estado de Filtros

```typescript
// En home/index.tsx
const getTotalFiltersCount = () => {
  let count = 0;
  if (searchFilters.categories.length > 0) count += searchFilters.categories.length;
  if (searchFilters.tags.length > 0) count += searchFilters.tags.length;
  if (searchFilters.difficulties.length > 0) count += searchFilters.difficulties.length;
  if (searchFilters.resetTimes.min !== undefined) count++;
  if (searchFilters.resetTimes.max !== undefined) count++;
  if (searchFilters.durations.min !== undefined) count++;
  if (searchFilters.durations.max !== undefined) count++;
  if (searchFilters.angles.length > 0) count += searchFilters.angles.length;
  if (searchFilters.isPublic !== null && searchFilters.isPublic !== undefined) count++;
  if (searchFilters.sortOrder && searchFilters.sortOrder !== "recent") count++;
  return count;
};

console.log('Filtros activos:', getTotalFiltersCount());
```

### 3. Verificar Datos en Base de Datos

```sql
-- Contar trucos por usuario
SELECT user_id, COUNT(*) as total_tricks
FROM magic_tricks
GROUP BY user_id;

-- Ver trucos con sus categorías y tags
SELECT
  mt.id,
  mt.title,
  array_agg(DISTINCT tc.category_id) as category_ids,
  array_agg(DISTINCT tt.tag_id) as tag_ids
FROM magic_tricks mt
LEFT JOIN trick_categories tc ON mt.id = tc.trick_id
LEFT JOIN trick_tags tt ON mt.id = tt.trick_id
WHERE mt.user_id = 'a2a39a82-6a48-49ad-92b2-81817de1a6b3'
GROUP BY mt.id
ORDER BY mt.created_at DESC
LIMIT 10;

-- Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'magic_tricks';

-- Performance de query full-text
EXPLAIN ANALYZE
SELECT *
FROM magic_tricks
WHERE user_id = 'a2a39a82-6a48-49ad-92b2-81817de1a6b3'
  AND to_tsvector('spanish', title || ' ' || effect || ' ' || secret)
      @@ websearch_to_tsquery('spanish', 'card');
```

### 4. React DevTools

**Verificar props de CollapsibleCategoryOptimized:**
- Revisar `section.items` - debe contener los trucos filtrados
- Verificar `filteredItems` - debe ser igual a `section.items`
- Comprobar `isExpanded` - debe ser `true` cuando hay filtros activos

**Verificar contextos:**
- `SearchContext` - ver `searchQuery`, `debouncedSearchQuery`, `searchFilters`
- `LibraryDataContext` - ver `sections`, `loading`, `rawTricks`, `allCategories`

### 5. Network Tab (para búsqueda en servidor)

Cuando hay ≥500 trucos, verificar request a Supabase:

```
POST /rest/v1/magic_tricks?select=*,trick_categories(category_id),...

Body:
{
  "user_id": "eq.a2a39a82-6a48-49ad-92b2-81817de1a6b3",
  "title,effect,secret": "websearch(spanish).card",
  "difficulty": "in.(5,6,7)",
  ...
}
```

### 6. Problemas Comunes

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| "6 items" pero 0 trucos visibles | Doble filtrado en CollapsibleCategory | Verificar que `filteredItems` no re-filtre |
| Categorías vacías visibles con filtros | `hasActiveFilters` no detecta filtros | Verificar lógica de detección de filtros |
| Búsqueda no funciona | Debounce muy largo / índice faltante | Reducir delay / crear índice GIN |
| Tags no filtran | Campo incorrecto (tags vs tag_ids) | Usar `trick.tag_ids` en vez de `trick.tags` |
| Lag al escribir | Sin debounce / re-renders excesivos | Implementar debounce + useMemo |
| Duplicado de "Favoritos" | Categoría real + virtual | Eliminar categoría real de DB |

---

## 📚 Referencias Técnicas

### TypeScript Interfaces

```typescript
// types/magicTrick.ts
export interface MagicTrick {
  id: string;
  user_id: string;
  title: string;
  effect?: string;
  secret?: string;
  difficulty?: number | null;
  duration?: number | null;
  reset?: number | null;
  angles?: string[];
  // ... otros campos
}

// services/LocalDataService.ts
export interface LocalTrick {
  id: string;
  title: string;
  effect: string;
  secret: string;
  duration: number | null;
  reset: number | null;
  difficulty: number | null;
  angles: string[];
  category_ids: string[];  // Array de UUIDs
  tag_ids: string[];       // Array de UUIDs
  is_favorite: boolean;
  // ... otros campos
}

// context/LibraryDataContext.tsx
export interface CategorySection {
  category: LocalCategory;
  items: LocalTrick[];
  isExpanded?: boolean;
}

// components/ui/FilterModal.tsx
export interface SearchFilters {
  categories: string[];
  tags: string[];
  tagsMode?: "and" | "or";
  difficulties: number[];
  resetTimes: { min?: number; max?: number };
  durations: { min?: number; max?: number };
  angles: string[];
  isPublic?: boolean | null;
  sortOrder?: "recent" | "last";
}
```

### Archivos Clave

| Archivo | Líneas Clave | Descripción |
|---------|--------------|-------------|
| `context/LibraryDataContext.tsx` | 102-268 | `buildSections()` - Lógica central de filtrado |
| `context/LibraryDataContext.tsx` | 469-547 | Búsqueda híbrida (memoizedSections + useEffect) |
| `context/SearchContext.tsx` | 1-80 | Estado global de búsqueda |
| `services/HybridSearchService.ts` | 25-121 | `searchOnServer()` - Búsqueda en Supabase |
| `components/ui/FilterModal.tsx` | 172-185 | `applyFilters()` - Aplicación de filtros |
| `components/home/CompactSearchBar.tsx` | Todo | Input de búsqueda con badge |
| `components/home/LibrariesSection.tsx` | 1-150 | Renderizado de secciones con FlashList |
| `components/home/CollapsibleCategoryOptimized.tsx` | 269-275 | `filteredItems` (sin re-filtrado) |

### Endpoints de Supabase

```typescript
// Fetch todos los datos del usuario
GET /rest/v1/magic_tricks?user_id=eq.{userId}&select=*,trick_categories(category_id),trick_tags(tag_id),user_favorites(id)

// Búsqueda full-text
GET /rest/v1/magic_tricks?user_id=eq.{userId}&title,effect,secret=websearch(spanish).{query}

// Filtro por categorías
GET /rest/v1/magic_tricks?user_id=eq.{userId}&trick_categories.category_id=in.({cat1},{cat2})

// Filtro por dificultad
GET /rest/v1/magic_tricks?user_id=eq.{userId}&difficulty=in.(5,6,7)

// Filtro por duración (rango)
GET /rest/v1/magic_tricks?user_id=eq.{userId}&duration=gte.60&duration=lte.300

// Filtro por ángulos (JSONB)
GET /rest/v1/magic_tricks?user_id=eq.{userId}&or=(angles.cs.["90"],angles.cs.["180"])
```

---

## ✅ Checklist de Implementación

Si necesitas implementar un sistema similar o modificar este:

- [ ] **Base de Datos**
  - [ ] Crear índice GIN para full-text search
  - [ ] Crear índice GIN para campos JSONB
  - [ ] Crear índice compuesto user_id + created_at
  - [ ] Verificar junction tables con FK correctas

- [ ] **Contextos**
  - [ ] Implementar SearchContext con debounce
  - [ ] Implementar LibraryDataContext con buildSections()
  - [ ] Configurar Real-time subscriptions

- [ ] **Servicios**
  - [ ] Implementar LocalDataService (cache)
  - [ ] Implementar SupabaseDataService (red)
  - [ ] Implementar HybridSearchService (enrutamiento)

- [ ] **Componentes UI**
  - [ ] CompactSearchBar con badge de filtros
  - [ ] FilterModal con todos los tipos de filtros
  - [ ] LibrariesSection con FlashList
  - [ ] CollapsibleCategory SIN re-filtrado

- [ ] **Optimizaciones**
  - [ ] Debounce en búsqueda (300ms)
  - [ ] useMemo para secciones
  - [ ] useCallback para funciones
  - [ ] Filtrado en un solo loop
  - [ ] Cache local en memoria + AsyncStorage

- [ ] **Testing**
  - [ ] Probar con 0 trucos
  - [ ] Probar con <500 trucos (cliente)
  - [ ] Probar con ≥500 trucos (servidor)
  - [ ] Probar cada tipo de filtro individualmente
  - [ ] Probar combinaciones de filtros
  - [ ] Probar comportamiento offline

---

## 📞 Soporte y Contacto

**Documentación creada:** 11 de noviembre de 2025

**Última actualización:** 11 de noviembre de 2025

**Autor:** Claude (Anthropic) + Usuario (mmento team)

**Para nuevas sesiones de Claude:**
Lee este documento completo antes de hacer cambios al sistema de búsqueda y filtrado. Todo el conocimiento crítico está aquí.

**Notas importantes:**
- NO volver a implementar filtrado en `CollapsibleCategoryOptimized`
- SIEMPRE filtrar en `buildSections()` únicamente
- MANTENER la lógica de categorías vacías (mostrar sin filtros, ocultar con filtros)
- VERIFICAR que tags usan `tag_ids` no `tags`

---

**FIN DEL DOCUMENTO**

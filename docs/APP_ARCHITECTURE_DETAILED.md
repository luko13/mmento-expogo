# 🏗️ Arquitectura Detallada de MMENTO - Mapa Mental Completo

> **Propósito:** Este documento es una guía exhaustiva para entender EXACTAMENTE cómo funciona cada parte de la aplicación, cómo se conectan los componentes, qué hace cada archivo, y dónde buscar cuando necesites modificar algo. Pensado para Claude AI como referencia rápida sin necesidad de leer código.

---

## 📑 ÍNDICE CON NÚMEROS DE LÍNEA

> **Navegación rápida:** Usa Ctrl+G (VSCode/IDEs) para saltar a cualquier línea

### ✅ PANTALLAS/SCREENS

| Sección | Línea |
|---------|-------|
| 📱 Home Page - Pantalla Principal | [L77](#L77) |
| 👤 UserProfile Component | [L304](#L304) |
| 🔍 CompactSearchBar Component | [L376](#L376) |
| 📚 LibrariesSection Component | [L449](#L449) |
| 📂 CollapsibleCategoryOptimized Component | [L745](#L745) |
| 🎯 InlineProgressBar Component | [L1028](#L1028) |
| 🎬 TrickViewScreen - Vista Detallada | [L1116](#L1116) |
| 🧩 StatsPanel Sub-Component | [L1952](#L1952) |
| 🎩 AddMagicWizard - Creación de Trucos | [L2100](#L2100) |
| ✏️ EditMagicWizard - Edición de Trucos | [L2162](#L2162) |
| 🤖 MMENTO AI - Chat con IA | [L2220](#L2220) |
| 👤 Profile - Pantalla de Perfil | [L2342](#L2342) |
| 🏷️ Tags - Gestión de Tags | [L2383](#L2383) |
| ⚙️ Pantallas Adicionales | [L2462](#L2462) |

### ✅ CONTEXTS (Gestión Global de Estado)

| Context | Línea |
|---------|-------|
| 🧠 Introducción a Contexts | [L2496](#L2496) |
| 📚 LibraryDataContext - Contexto Principal | [L2502](#L2502) |
| 🔍 SearchContext - Contexto de Búsqueda | [L2995](#L2995) |
| 🗑️ TrickDeletionContext - Contexto de Eliminación | [L3119](#L3119) |
| 🔗 Relación Entre Contexts | [L3213](#L3213) |

### ✅ SERVICES - Data Layer

| Service | Línea |
|---------|-------|
| ⚙️ Introducción a Services | [L3271](#L3271) |
| 💾 LocalDataService - Cache Local | [L3277](#L3277) |
| 🌐 SupabaseDataService - API Database | [L3822](#L3822) |
| 🔍 HybridSearchService - Búsqueda Inteligente | [L4228](#L4228) |
| 🎯 TrickService - CRUD con Offline-First | [L4376](#L4376) |

### ✅ SERVICES - Media Layer

| Service | Línea |
|---------|-------|
| 📹 CloudflareStreamService - Video Streaming | [L3984](#L3984) |
| 🎞️ VideoService - Compresión de Video | [L4096](#L4096) |
| 📹 VideoAnalysisService - Análisis Inteligente | [L5519](#L5519) |
| 📤 FileUploadService - Upload Genérico | [L4158](#L4158) |

### ✅ SERVICES - Offline System

| Service | Línea |
|---------|-------|
| 🔄 OfflineSyncContext - Gestión de Sincronización | [L4530](#L4530) |
| 📋 OfflineQueue - Sistema de Cola Persistente | [L4647](#L4647) |
| 📡 NetworkMonitorService - Detección de Conectividad | [L5304](#L5304) |

### ✅ SERVICES - AI/Network

| Service | Línea |
|---------|-------|
| 💬 ChatService - Asistente de IA (MMENTO AI) | [L4919](#L4919) |
| 🤖 openAIService - Integración OpenAI | [L5978](#L5978) |

### ✅ SERVICES - Auth & Core

| Service | Línea |
|---------|-------|
| 🔐 authService - Autenticación con Supabase | [L5762](#L5762) |
| 🎙️ audioService - Audio (Preparado para futuro) | [L5896](#L5896) |
| 📑 orderService - Ordenamiento con Debouncing | [L6179](#L6179) |

### ✅ UTILS (Utilidades)

| Util | Línea |
|------|-------|
| 📦 compressionService - Compresión Automática | [L6383](#L6383) |
| 🔒 security - Rate Limiting & Validación | [L6451](#L6451) |
| 🔑 auth - Wrappers de authService | [L6537](#L6537) |
| 🎨 colorUtils - Paleta de Colores | [L6615](#L6615) |
| ⚡ performanceOptimizer - Métricas Adaptativas | [L6733](#L6733) |

### ✅ FEATURES ESPECIALES

| Feature | Línea |
|---------|-------|
| 🌐 Offline-First Architecture (5 componentes) | [L6854](#L6854) |
| 🔄 Real-time Subscriptions (Supabase) | [L6976](#L6976) |
| 🎬 Video Compression Strategy | [L7100](#L7100) |
| 🔍 Search System (FTS + Híbrido) | [L7233](#L7233) |

### 📊 ESTADÍSTICAS DEL DOCUMENTO

- **Total de secciones principales:** 50+
- **Servicios documentados:** 16
- **Contexts documentados:** 4
- **Features especiales:** 4
- **Utils documentados:** 5
- **Pantallas/Components:** 14+
- **Líneas totales:** ~7300+

---

## 📱 HOME PAGE - Pantalla Principal

**Archivo:** `app/(app)/home/index.tsx`

### 🎯 Propósito
Pantalla principal de la aplicación donde el usuario ve su biblioteca de trucos organizada por categorías, puede buscar, filtrar y acceder a todas las funcionalidades principales.

### 🧩 Estructura Visual

```
┌─────────────────────────────────────────┐
│  [UserProfile Component]                │  ← Avatar, nombre, notificaciones
│  • Avatar                               │
│  • Greeting (Buenos días/Good morning)  │
│  • Notification bell                    │
├─────────────────────────────────────────┤
│  [CompactSearchBar Component]           │  ← Búsqueda y filtros
│  • Search input                         │
│  • Filter button (con badge count)      │
├─────────────────────────────────────────┤
│  [LibrariesSection Component]           │  ← Lista de categorías y trucos
│  ┌───────────────────────────────────┐  │
│  │ 📚 15 Magic Items      [+]        │  │
│  ├───────────────────────────────────┤  │
│  │ ⭐ Favoritos            5         │  │  ← Categoría virtual
│  │   ↓ [Trick 1]                    │  │
│  │   ↓ [Trick 2]                    │  │
│  ├───────────────────────────────────┤  │
│  │ 🎴 Cartas              12        │  │  ← Categoría user
│  │   ↓ [Trick 3]                    │  │
│  │   ...                            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 🔌 Imports y Dependencias

**Componentes Propios:**
```typescript
import UserProfile from "../../../components/home/UserProfile"
import LibrariesSection from "../../../components/home/LibrariesSection"
import CompactSearchBar from "../../../components/home/CompactSearchBar"
import SuccessCreationModal from "../../../components/ui/SuccessCreationModal"
import FiltersModal from "../../../components/ui/FilterModal"
```

**Contexts (Estado Global):**
```typescript
import { useSearch } from "../../../context/SearchContext"
import { useTrickDeletion } from "../../../context/TrickDeletionContext"
import { useLibraryData } from "../../../context/LibraryDataContext"
```

**Librerías Externas:**
- `react-i18next` → Traducciones
- `expo-router` → Navegación y params
- `react-native-safe-area-context` → SafeArea para notch/home indicator

### 📊 Estado Local

```typescript
// Modal de éxito al crear truco
const [showSuccessModal, setShowSuccessModal] = useState(false)
const [createdTrickData, setCreatedTrickData] = useState<{id, title} | null>

// Modal de filtros
const [showFiltersModal, setShowFiltersModal] = useState(false)

// Control de loading screen
const [showContent, setShowContent] = useState(false)
```

### 🎬 Flujo de Inicialización

1. **Carga Inicial:**
   - `contextInitializing` viene de `LibraryDataContext`
   - Mientras `contextInitializing === true` → Muestra loading screen (fondo + spinner)
   - Al terminar → Espera 100ms adicionales → Muestra contenido (`setShowContent(true)`)
   - **Propósito del delay:** Evitar "salto" visual, transición suave

2. **Success Modal:**
   - Detecta params de URL: `showSuccessModal`, `trickId`, `trickTitle`
   - Si existen → Muestra modal de éxito después de crear truco
   - Limpia params de URL después de mostrar

### 🎨 Componentes Hijos Renderizados

#### 1. **UserProfile** (línea 160)
```typescript
<UserProfile
  onProfilePress={() => router.push("/(app)/profile-options")}
  isSearchVisible={false}
  onCloseSearch={() => {}}
  onNotificationsPress={handleNotificationsPress}
/>
```
**Propósito:** Mostrar info del usuario, acceso a perfil y notificaciones
**Archivo:** `components/home/UserProfile.tsx`

#### 2. **CompactSearchBar** (línea 169)
```typescript
<CompactSearchBar
  value={searchQuery}                           // Query actual
  onChangeText={handleSearchQueryChange}        // Actualiza searchQuery
  onFiltersPress={handleOpenFiltersModal}       // Abre modal filtros
  appliedFiltersCount={getTotalFiltersCount()}  // Badge con número de filtros
/>
```
**Propósito:** Input de búsqueda + botón de filtros
**Archivo:** `components/home/CompactSearchBar.tsx`

#### 3. **LibrariesSection** (línea 186)
```typescript
<LibrariesSection
  searchQuery={debouncedSearchQuery}   // Query con debounce 300ms
  searchFilters={searchFilters}        // Filtros activos
/>
```
**Propósito:** Lista de categorías con trucos (componente más complejo)
**Archivo:** `components/home/LibrariesSection.tsx`

#### 4. **SuccessCreationModal** (línea 195)
**Propósito:** Modal que aparece al crear un truco exitosamente
**Acciones:**
- Ver truco recién creado
- Crear otro truco
- Cerrar modal

#### 5. **FiltersModal** (línea 205)
**Propósito:** Modal con todos los filtros disponibles
**Filtros:**
- Categorías (multi-select)
- Tags (multi-select con modo AND/OR)
- Dificultad (slider 0-5)
- Duración (min-max)
- Tiempo de reset (min-max)
- Ángulos (multi-select)
- Visibilidad pública
- Orden (recent/last)

### 🔄 Flujo de Búsqueda y Filtros

```
Usuario escribe en CompactSearchBar
         ↓
setSearchQuery(query)  ← Estado local
         ↓
SearchContext actualiza searchQuery
         ↓
useDebounce(searchQuery, 300ms)
         ↓
debouncedSearchQuery se actualiza
         ↓
LibrariesSection recibe debouncedSearchQuery
         ↓
LibrariesSection pasa query a LibraryDataContext
         ↓
LibraryDataContext.applyFilters()
         ↓
buildSections() filtra trucos
         ↓
sections actualizado
         ↓
LibrariesSection re-renderiza con resultados filtrados
```

### 🧮 Lógica de Conteo de Filtros

**Función:** `getTotalFiltersCount()` (línea 106)

Cuenta cuántos filtros están activos sumando:
- Cantidad de categorías seleccionadas
- Cantidad de tags seleccionados
- Cantidad de dificultades seleccionadas
- 1 por cada rango (min/max de duration, reset time)
- Cantidad de ángulos seleccionados
- 1 si isPublic está definido
- 1 si sortOrder no es "recent"

**Usado en:** Badge del botón de filtros en CompactSearchBar

### 🎯 Funciones Handlers

```typescript
handleViewItem()          → Navega a vista de truco recién creado
handleAddAnother()        → Navega a wizard de creación
handleCloseModal()        → Cierra modal de éxito
handleSearchQueryChange() → Actualiza query de búsqueda
dismissKeyboard()         → Cierra teclado al tocar fuera
handleOpenFiltersModal()  → Abre modal de filtros
handleNotificationsPress()→ Navega a /notifications
```

### 📍 Navegación Posible Desde Home

```
Home
  ├─→ /(app)/profile-options      (tap en UserProfile)
  ├─→ /(app)/notifications        (tap en bell icon)
  ├─→ /(app)/trick/[id]           (tap en truco)
  ├─→ /(app)/add-magic            (tap en "Crear otro" en modal)
  └─→ /(app)/edit-trick?id=...    (desde TrickActionsModal en truco)
```

### 🎨 Estilos y Layout

- **Container:** SafeAreaView con edge:'top' (respeta notch)
- **TouchableWithoutFeedback:** Cierra teclado al tocar fuera
- **Padding horizontal:** 24px
- **Background:** Imagen `assets/Background.png`
- **Loading spinner:** Centered, color emerald (#10b981)

### ⚡ Performance

- **Debounce de búsqueda:** 300ms (evita búsquedas excesivas)
- **LibrariesSection usa FlashList:** Virtualización para listas grandes
- **Delay de 100ms:** Transición suave desde loading

### 🐛 Edge Cases Manejados

1. **contextInitializing true:** Muestra loading screen
2. **Params de success modal:** Limpia después de mostrar
3. **Keyboard dismiss:** Touch outside cierra teclado
4. **Zero filtros:** Badge no se muestra (count = 0)

---

## 👤 COMPONENTE: UserProfile

**Archivo:** `components/home/UserProfile.tsx`

### 🎯 Propósito
Header de la home page que muestra avatar, saludo personalizado y acceso a notificaciones.

### 🔌 Props Interface
```typescript
interface UserProfileProps {
  onProfilePress: () => void;        // Handler al tocar avatar/nombre
  isSearchVisible: boolean;          // (No usado en home, legacy)
  onCloseSearch: () => void;         // (No usado en home, legacy)
  onNotificationsPress: () => void;  // Handler para notificaciones
}
```

### 📊 Datos que Consume

**Desde LibraryDataContext:**
```typescript
const { userName, avatarUrl, greeting } = useLibraryData();
```
- `userName`: Nombre del usuario (ej: "John Doe")
- `avatarUrl`: URL de avatar de Supabase Storage
- `greeting`: Saludo calculado según hora del día (i18n)
  - "Buenos días" / "Good morning" (5am-12pm)
  - "Buenas tardes" / "Good afternoon" (12pm-8pm)
  - "Buenas noches" / "Good evening" (8pm-5am)

### 🎨 Estructura Visual

```
┌────────────────────────────────────────────────┐
│  [Avatar]  John Doe          🔔               │
│            Buenos días                         │
└────────────────────────────────────────────────┘
```

**Detalles:**
- **Avatar:** 50x50, circular, borde emerald
- **Nombre:** Font Outfit-SemiBold, 18px, blanco
- **Saludo:** Font Outfit-Light, 14px, blanco/80% opacity
- **Bell Icon:** Ionicons, 26px, blanco

### 🔄 Comportamiento

1. **Tap en Avatar/Nombre:**
   - Ejecuta `onProfilePress()`
   - En home → Navega a `/(app)/profile-options`

2. **Tap en Bell:**
   - Ejecuta `onNotificationsPress()`
   - En home → Navega a `/(app)/notifications`

### 💾 Cache de Avatar

**Si avatarUrl existe:**
- Carga desde Supabase Storage
- Cache: `cache: "default"` (usa cache del navegador)

**Si NO existe avatarUrl:**
- Muestra placeholder con iniciales del nombre
- Background: emerald-600
- Iniciales en blanco, centradas

### ⚡ Performance
- Avatar usa Image component con cache
- No re-renders innecesarios (props memorizadas)

---

## 🔍 COMPONENTE: CompactSearchBar

**Archivo:** `components/home/CompactSearchBar.tsx`

### 🎯 Propósito
Barra de búsqueda compacta con input de texto y botón de filtros.

### 🔌 Props Interface
```typescript
interface CompactSearchBarProps {
  value: string;                    // Query actual
  onChangeText: (text: string) => void;  // Handler de cambio
  onFiltersPress: () => void;       // Abrir modal de filtros
  appliedFiltersCount: number;      // Número de filtros activos
}
```

### 🎨 Estructura Visual

```
┌──────────────────────────────────────┐
│  🔍  [Search input...]      🎛️ 3   │
└──────────────────────────────────────┘
```

**Elementos:**
- **Search Icon:** Feather "search", 20px, white/60%
- **TextInput:**
  - Placeholder: "Buscar trucos..." (i18n)
  - Color: blanco
  - Font: Outfit-Light
  - Background: transparent
- **Filter Button:**
  - Icon: Ionicons "filter", 24px
  - Badge: Número rojo si appliedFiltersCount > 0
  - Background: emerald-600/20 con border

### 🎨 Estilos

- **Container:** Flex row, bg-white/10, rounded-lg
- **Padding:** 12px horizontal, 10px vertical
- **Badge de filtros:**
  - Background: red-500
  - Border: white 2px
  - Position: absolute top-right del botón
  - Size: 18x18, circular

### 🔄 Comportamiento

1. **onChangeText:**
   - Ejecuta `onChangeText(text)` en cada keystroke
   - Sin debounce local (el debounce está en SearchContext)

2. **onFiltersPress:**
   - Abre FiltersModal
   - Badge muestra cantidad de filtros activos

### 🧩 Integración con Home

```
CompactSearchBar (value, onChange)
         ↓
SearchContext (searchQuery)
         ↓
useDebounce(300ms)
         ↓
debouncedSearchQuery
         ↓
LibrariesSection
```

---

## 📚 COMPONENTE: LibrariesSection

**Archivo:** `components/home/LibrariesSection.tsx`

### 🎯 Propósito
Componente MÁS COMPLEJO de la home. Renderiza la lista de categorías con trucos, maneja creación/edición/eliminación de categorías, y gestiona drag & drop (preparado para futuro).

### 🔌 Props Interface
```typescript
interface LibrariesSectionProps {
  searchQuery?: string;        // Query de búsqueda
  searchFilters?: SearchFilters;  // Filtros activos
}
```

### 📊 Datos que Consume

**Desde LibraryDataContext:**
```typescript
const {
  sections,           // CategorySection[] con trucos filtrados
  allCategories,      // Todas las categorías del usuario
  loading,            // Cargando datos
  initializing,       // Inicializando contexto
  error,              // Error si existe
  refresh,            // Función para refrescar datos
  toggleFavorite,     // Toggle favorito de truco
  createCategory,     // Crear categoría
  updateCategory,     // Editar categoría
  deleteCategory,     // Eliminar categoría
  applyFilters,       // Aplicar búsqueda/filtros
} = useLibraryData();
```

**Desde TrickDeletionContext:**
```typescript
const { deletedTrickId } = useTrickDeletion();
```

### 🎨 Estructura Visual

```
┌─────────────────────────────────────────┐
│  📚 15 Magic Items            [+]       │  ← Header
├─────────────────────────────────────────┤
│  [CollapsibleCategory - Favoritos]      │
│  [CollapsibleCategory - Cartas]         │
│  [CollapsibleCategory - Close-up]       │
│  [CollapsibleCategory - Mentalismo]     │
│  ...                                    │
│                                         │
│  (FlashList con virtualización)         │
└─────────────────────────────────────────┘
```

### 🧩 Componentes Hijos

#### 1. **ListHeader** (Custom component inline)
```typescript
<ListHeader />
  ├─ Feather "book" icon
  ├─ "{totalTricksCount} Magic Items" (i18n)
  └─ "+" button → Abre CategoryModal
```

**Cálculo de totalTricksCount:**
- Suma items de todas las secciones
- EXCLUYE la categoría "Favoritos" (virtual)

#### 2. **CollapsibleCategoryOptimized** (Por cada categoría)

**Archivo:** `components/home/CollapsibleCategoryOptimized.tsx`

**Props pasadas:**
```typescript
<CollapsibleCategoryOptimized
  section={item}                      // CategorySection con {category, items}
  searchQuery={searchQuery}
  searchFilters={searchFilters}
  onItemPress={handleItemPress}       // Navegar a truco
  onEditCategory={openEditCategoryModal}  // Editar categoría
  onDeleteCategory={handleDeleteCategory} // Eliminar categoría
  onMoreOptions={handleMoreOptions}   // Abrir CategoryActionsModal
  isDragEnabled={false}               // (Drag preparado, no activo)
  onExpandChange={(isExpanded) =>
    handleExpandChange(item.category.id, isExpanded)
  }
/>
```

#### 3. **ListEmpty** (Custom component inline)
Mostrado cuando `sections.length === 0`

**Dos variantes:**
1. **Con filtros/búsqueda activos:**
   - "No results found"
   - Sin botón de crear categoría

2. **Sin filtros (categorías realmente vacías):**
   - "No categories found"
   - Botón "Add Category"

### 🗂️ Estado Local

```typescript
// Modales
const [isAddCategoryModalVisible, setAddCategoryModalVisible] = useState(false)
const [isEditCategoryModalVisible, setEditCategoryModalVisible] = useState(false)
const [showDeleteModal, setShowDeleteModal] = useState(false)
const [showCantDeleteModal, setShowCantDeleteModal] = useState(false)
const [showActionsModal, setShowActionsModal] = useState(false)

// Datos temporales
const [editingCategory, setEditingCategory] = useState<Category | null>
const [categoryToDelete, setCategoryToDelete] = useState<{id, name} | null>
const [categoryItemCount, setCategoryItemCount] = useState(0)
const [selectedCategoryForActions, setSelectedCategoryForActions] = useState<Category | null>

// Truco seleccionado (legacy, no usado)
const [selectedTrickData, setSelectedTrickData] = useState<any>(null)

// Categorías expandidas/colapsadas
const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
```

### 🔄 Flujo: Aplicar Filtros

```
LibrariesSection recibe searchQuery/searchFilters
         ↓
useEffect detecta cambio (línea 71-73)
         ↓
applyFilters(searchQuery, searchFilters)
         ↓
LibraryDataContext.applyFilters()
         ↓
buildSections() ejecuta filtrado completo
         ↓
sections actualizado
         ↓
FlashList re-renderiza con nuevos datos
```

### 🔄 Flujo: Crear Categoría

```
Usuario tap [+] en header
         ↓
setAddCategoryModalVisible(true)
         ↓
CategoryModal se muestra
         ↓
Usuario escribe nombre → Tap "Crear"
         ↓
handleAddCategory(name)
         ↓
createCategory(name) → LocalDataService + Supabase
         ↓
Real-time subscription detecta cambio
         ↓
allCategories actualizado
         ↓
sections reconstruido
         ↓
Nueva categoría aparece en lista
```

### 🔄 Flujo: Eliminar Categoría

```
Usuario tap [...] en categoría
         ↓
CategoryActionsModal se muestra
         ↓
Usuario tap "Eliminar"
         ↓
handleDeleteCategory(categoryId)
         ↓
Verifica si categoría tiene trucos:
  ├─ SÍ tiene trucos → CantDeleteModal
  └─ NO tiene trucos → DeleteModal (confirmación)
         ↓
Usuario confirma en DeleteModal
         ↓
deleteCategory(categoryId)
         ↓
Elimina en LocalDataService + Supabase
         ↓
Real-time subscription detecta cambio
         ↓
Categoría desaparece de lista
```

### 🔄 Flujo: Tap en Truco

```
Usuario tap en truco dentro de categoría
         ↓
handleItemPress(item)
         ↓
Construye itemData con:
  - Datos del truco
  - Nombre de categoría (busca en allCategories)
  - Photos del cache
         ↓
router.push({
  pathname: "/(app)/trick/[id]",
  params: { id, trick: JSON.stringify(itemData) }
})
         ↓
TrickViewScreen se abre
```

### 📊 Ordenamiento de Categorías

**Función:** `orderedSections` (useMemo, línea 114)

**Orden:**
1. **Favoritos SIEMPRE primero** (ID: "favorites-virtual")
2. Resto de categorías alfabéticamente por nombre
3. Categorías expandidas/colapsadas mantienen estado

**Código:**
```typescript
const orderedSections = useMemo(() => {
  const sorted = [...sections].sort((a, b) => {
    const aFav = a.category.name?.toLowerCase?.().includes("favorit");
    const bFav = b.category.name?.toLowerCase?.().includes("favorit");
    if (aFav && !bFav) return -1;  // Favoritos primero
    if (!aFav && bFav) return 1;
    return 0;
  });
  return sorted.map(sec => ({
    ...sec,
    isExpanded: expandedCategories.has(sec.category.id)
  }));
}, [sections, expandedCategories]);
```

### ⚡ Optimizaciones

1. **FlashList en lugar de FlatList:**
   - Virtualización ultra-optimizada
   - `estimatedItemSize={100}`
   - `getItemType={() => "category"}` (todas las categorías mismo tipo)
   - `estimatedListSize={{height: 600, width: SCREEN_WIDTH}}`

2. **useCallback para handlers:**
   - `handleAddCategory`, `handleEditCategory`, `handleDeleteCategory`
   - Evita re-renders innecesarios de modales

3. **useMemo para contadores:**
   - `totalTricksCount` solo recalcula si `sections` cambia

4. **RefreshControl:**
   - Pull-to-refresh nativo
   - Color: white/60% opacity
   - Ejecuta `refresh()` del contexto

### 🎨 Estilos

- **contentContainerStyle:** `paddingBottom: NAVBAR_HEIGHT + BOTTOM_SPACING`
  - Asegura que último item sea visible sobre navbar
- **drawDistance:** 200 (pre-renderiza items cercanos)
- **removeClippedSubviews:** true (optimización Android)

### 📍 Modales Renderizados

1. **CategoryModal** (crear/editar)
2. **TrickViewScreen Modal** (legacy, no usado - se navega con router)
3. **CategoryActionsModal** (editar/eliminar)
4. **DeleteModal** (confirmación)
5. **CantDeleteModal** (no se puede eliminar si tiene trucos)

### 🐛 Edge Cases

1. **Categoría con trucos:** No se puede eliminar → CantDeleteModal
2. **Sin categorías:** ListEmpty con botón crear
3. **Sin resultados de búsqueda:** ListEmpty sin botón
4. **Error de carga:** Muestra error + botón "Retry"
5. **initializing o loading:** Muestra MagicLoader spinner

### 🔄 Real-time Updates

**Detecta cambios de:**
- `deletedTrickId` (TrickDeletionContext)
  - Cuando se elimina truco → `refresh()` para actualizar contadores

**Subscripciones en LibraryDataContext:**
- `magic_tricks` table
- `user_categories` table
- `trick_categories` table (junction)
- `user_favorites` table

---

## 📂 COMPONENTE: CollapsibleCategoryOptimized

**Archivo:** `components/home/CollapsibleCategoryOptimized.tsx`

### 🎯 Propósito
Categoría individual expandible/colapsable con lista de trucos. Incluye header con contador, ícono de expand, y opciones.

### 🔌 Props Interface
```typescript
interface Props {
  section: CategorySection;           // {category, items}
  searchQuery: string;
  searchFilters?: SearchFilters;
  onItemPress: (item: LibraryItem) => void;
  onEditCategory: (category: any) => void;
  onDeleteCategory: (categoryId: string) => void;
  onMoreOptions: (category: any) => void;
  onToggleFavorite?: (itemId: string, contentType: string) => void;
  isDragEnabled?: boolean;            // (Preparado para drag & drop)
  onExpandChange?: (isExpanded: boolean) => void;
  onTrickDragStart?: (...) => void;   // (Drag handlers preparados)
  onTrickDragMove?: (...) => void;
  onTrickDragEnd?: (...) => void;
  isDraggingTrick?: boolean;
  draggedTrickId?: string | null;
  isDropTarget?: boolean;
}
```

### 🎨 Estructura Visual

```
┌─────────────────────────────────────────┐
│  ▶  Cartas              12        [...]│  ← Header (colapsado)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ▼  Cartas              12        [...]│  ← Header (expandido)
├─────────────────────────────────────────┤
│    📸 Carta Ambiciosa            ●●●○○ │  ← Truco 1
│    📸 Four Aces                  ●●●●○ │  ← Truco 2
│    📸 Triumph                    ●●●●● │  ← Truco 3
│    ...                                 │
└─────────────────────────────────────────┘
```

### 📊 Estado Local

```typescript
const [isExpanded, setIsExpanded] = useState(section.isExpanded || hasActiveSearch)
const animatedHeight = useRef(new RNAnimated.Value(isExpanded ? 1 : 0)).current
const animatedRotation = useRef(new RNAnimated.Value(isExpanded ? 1 : 0)).current
```

**Animaciones:**
- `animatedHeight`: 0 → 1 (colapsado → expandido)
- `animatedRotation`: 0deg → 90deg (chevron rota)

### 🎨 Header Component

**Elementos:**
1. **Chevron Icon:**
   - MaterialIcons "chevron-right"
   - Rotación animada: 0deg (colapsado) → 90deg (expandido)
   - Color: white

2. **Category Name:**
   - Font: Outfit-Light, 16px
   - Color: white
   - marginLeft: 8px

3. **Item Count:**
   - Font: Outfit-Light, 16px
   - Color: white
   - Muestra: `filteredItems.length`

4. **Action Button:**
   - **Si es Favoritos:** Ícono estrella (sin acción)
   - **Si es categoría normal:** "..." → Abre CategoryActionsModal

**Estilos:**
- Background: white/10
- Border: white/40
- Si `isDropTarget`: bg-emerald-900/30, border-emerald-500/60 (drag & drop)
- Height: 36px
- Padding: 12px horizontal
- Border radius: 8px

### 🎨 Expanded Content

**Animación:**
```typescript
<RNAnimated.View
  style={{
    maxHeight: animatedHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 500],  // Altura máxima 500px
    }),
    opacity: animatedHeight,
    overflow: "hidden",
  }}
>
```

**Contenido:**
- Si `filteredItems.length > 0`:
  - Map de `filteredItems` → `<DraggableTrick />`
- Si `filteredItems.length === 0`:
  - Mensaje: "No favorites yet" (si Favoritos) o "No items in this category"

### 🧩 Componente Hijo: DraggableTrick

**Archivo:** `components/DraggableTrick.tsx`

**Props:**
```typescript
<DraggableTrick
  key={`${item.type}-${item.id}`}
  item={item}                    // LibraryItem
  categoryId={section.category.id}
  index={index}
  onPress={() => handleItemPress(item)}
  searchQuery={searchQuery}
/>
```

**Renderiza:** LibraryItemRow (inline component)

### 🎨 LibraryItemRow (Sub-componente)

**Estructura:**
```
┌────────────────────────────────────────┐
│  Carta Ambiciosa           ●●●○○      │
│  In: Secret                            │  ← Si match en secret/effect/notes
└────────────────────────────────────────┘
```

**Elementos:**
1. **Title:** item.title
2. **Match Location:** (si búsqueda activa)
   - "In: Notes" / "In: Secret" / "In: Effect"
   - Muestra dónde se encontró el match de búsqueda
3. **InlineProgressBar:** Indicador de completitud (círculos)

**Función:** `getSearchMatchLocation()`
```typescript
if (item.title.toLowerCase().includes(query)) return null;  // Match en título (obvio)
if (item.notes?.toLowerCase().includes(query)) return "Notes";
if (item.secret?.toLowerCase().includes(query)) return "Secret";
if (item.effect?.toLowerCase().includes(query)) return "Effect";
return null;
```

### 🔄 Comportamiento: Toggle Expand/Collapse

```
Usuario tap en header
         ↓
toggleExpanded()
         ↓
RNAnimated.parallel([
  animatedHeight → toValue (0 o 1),
  animatedRotation → toValue (0 o 1)
]).start()
         ↓
setIsExpanded(!isExpanded)
         ↓
onExpandChange?.(newExpandedState)  // Notifica a padre
         ↓
Padre actualiza expandedCategories Set
```

**Duración animación:** 250ms

### 🔄 Auto-Expand con Búsqueda

```typescript
useEffect(() => {
  const toValue = hasActiveSearch ? 1 : isExpanded ? 1 : 0;
  // Si hay búsqueda activa, forzar expansión
  RNAnimated.parallel([...]).start();

  if (hasActiveSearch && !isExpanded) {
    setIsExpanded(true);
    onExpandChange?.(true);
  }
}, [hasActiveSearch, isExpanded, ...]);
```

**Propósito:** Al buscar, todas las categorías se expanden automáticamente para mostrar resultados.

### 🎯 Detección de Filtros Activos

```typescript
const hasActiveSearch = useMemo(() => {
  if (searchQuery && searchQuery.trim() !== "") return true;

  if (searchFilters) {
    if (searchFilters.categories?.length > 0) return true;
    if (searchFilters.tags?.length > 0) return true;
    if (searchFilters.difficulties?.length > 0) return true;
    if (searchFilters.angles?.length > 0) return true;
    if (searchFilters.resetTimes?.min !== undefined) return true;
    if (searchFilters.durations?.min !== undefined) return true;
    if (searchFilters.isPublic !== undefined && searchFilters.isPublic !== null) return true;
  }

  return false;
}, [searchQuery, searchFilters]);
```

### 🔄 Auto-Expand con Drag Over (Preparado)

```typescript
useEffect(() => {
  if (isDropTarget && !isExpanded) {
    const timer = setTimeout(() => {
      setIsExpanded(true);
      onExpandChange?.(true);
    }, 500);  // Delay 500ms antes de expandir
    return () => clearTimeout(timer);
  }
}, [isDropTarget, isExpanded, onExpandChange]);
```

**Propósito:** Si arrastras un truco sobre una categoría colapsada, se expande automáticamente.

### 🎨 Drop Target Indicator

```typescript
{isDropTarget && (
  <Animated.View
    style={{
      position: "absolute",
      top: 0, left: 16, right: 16, bottom: 0,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: "rgba(16, 185, 129, 0.7)",  // emerald
      backgroundColor: SHOW_DROP_TARGET_FILL
        ? "rgba(16, 185, 129, 0.12)"
        : "transparent",
      pointerEvents: "none",
      zIndex: 20,
    }}
  />
)}
```

**Estado:** `SHOW_DROP_TARGET_FILL = false` (const al inicio del archivo)

### ⚡ Optimizations

1. **React.memo con comparación custom:**
```typescript
(prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.title === next.item.title &&
  prev.searchQuery === next.searchQuery
```

2. **useMemo para filteredItems:**
```typescript
const filteredItems = useMemo(() => {
  if (!section.items) return [];
  return section.items;  // Ya vienen filtrados desde LibraryDataContext
}, [section.items]);
```

**Importante:** NO se re-filtran aquí, ya vienen filtrados.

3. **useCallback para handlers:**
   - `toggleExpanded`, `handleItemPress`, `handleMoreOptions`

### 🐛 Edge Cases

1. **Categoría vacía + sin búsqueda:** Muestra "No items in this category"
2. **Favoritos vacíos:** Muestra "No favorites yet"
3. **Búsqueda activa:** Todas las categorías se expanden automáticamente
4. **Drag over categoría:** Se expande después de 500ms

---

## 🎯 COMPONENTE: InlineProgressBar (TrickCompletionProgress)

**Archivo:** `components/home/TrickCompletionProgress.tsx`

### 🎯 Propósito
Indicador visual de completitud de un truco (qué campos tiene rellenados).

### 🔌 Props Interface
```typescript
interface InlineProgressBarProps {
  item: LibraryItem;  // Truco con todos sus campos
}
```

### 🎨 Estructura Visual

```
●●●○○  (3 de 5 campos completos)
```

**Círculos:**
- Filled: emerald-500 (#10b981)
- Empty: white/20% opacity
- Size: 8x8px
- Gap: 4px entre círculos

### 📊 Cálculo de Completitud

**Campos evaluados (5 total):**
1. **effect** - Descripción del efecto
2. **secret** - Descripción del secreto
3. **effect_video_url** - Video del efecto
4. **secret_video_url** - Video del secreto
5. **photo_url** - Foto principal

**Lógica:**
```typescript
const getCompletionData = (item: LibraryItem) => {
  const fields = [
    item.effect && item.effect.trim() !== "",
    item.secret && item.secret.trim() !== "",
    item.effect_video_url && item.effect_video_url.trim() !== "",
    item.secret_video_url && item.secret_video_url.trim() !== "",
    item.photo_url && item.photo_url.trim() !== "",
  ];

  const completedCount = fields.filter(Boolean).length;
  const totalFields = 5;

  return { completedCount, totalFields };
};
```

### 🎨 Renderizado

```typescript
<View style={{ flexDirection: 'row', gap: 4 }}>
  {Array.from({ length: totalFields }).map((_, index) => (
    <View
      key={index}
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: index < completedCount
          ? '#10b981'      // emerald-500
          : 'rgba(255, 255, 255, 0.2)'  // white/20%
      }}
    />
  ))}
</View>
```

### 💡 Uso

Se muestra a la derecha de cada truco en la lista:
```
📸 Carta Ambiciosa           ●●●○○
```

### 🔄 Performance

- **Cálculo simple:** Solo cuenta booleans
- **No re-renders innecesarios:** Props no cambian frecuentemente
- **Lightweight:** Solo círculos simples, sin imágenes

---

## 🎬 TRICK VIEW SCREEN - Pantalla de Vista Detallada de Truco

**Archivo:** `components/TrickViewScreen.tsx`

### 🎯 Propósito
Pantalla completa para ver un truco en detalle. Permite reproducir videos de efecto/secreto, ver fotos, y acceder a todas las funcionalidades de edición, eliminación y favoritos. Es una de las pantallas más complejas (1400+ líneas).

### 🧩 Estructura Visual

```
┌─────────────────────────────────────────┐
│  [← TopNavigationBar ⭐ ⋮]              │  ← Fixed top (z-index 10)
│                                         │
│                                         │
│         [VIDEO PLAYER]                  │  ← ScrollView (3 páginas)
│         Effect / Secret / Photos        │     - Página 1: Effect video
│                                         │     - Página 2: Secret video
│                                         │     - Página 3: Photo gallery
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  [VideoProgressBar]                     │  ← Fixed bottom (z-index 9999)
│  ▶ |████████░░░░░░░░| 01:23 / 03:45    │     Solo visible en videos
├─────────────────────────────────────────┤
│  [Tags] [Category] [Description]   📊  │  ← TrickViewerBottomSection
│  Effect • Card tricks • Magic...        │     Tags + Stage Info + Stats
│  [Description expandible...]            │
└─────────────────────────────────────────┘
```

### 🔌 Props Interface

```typescript
interface TrickViewScreenProps {
  trick: {
    id: string;
    title: string;
    category: string;
    effect: string;                    // Descripción del efecto
    secret: string;                    // Descripción del secreto
    effect_video_url: string;          // URL video efecto
    secret_video_url: string;          // URL video secreto
    photo_url: string | null;          // URL foto principal
    script: string | null;             // Script de presentación
    angles: string[];                  // Ángulos posibles
    duration: number | null;           // Duración en segundos
    reset: number | null;              // Tiempo de reset en segundos
    difficulty: number | null;         // Dificultad 0-10
    notes?: string;                    // Notas adicionales
    photos?: string[];                 // Array de URLs de fotos
    user_id?: string;
    is_public?: boolean;
  };
  userId?: string;
  onClose?: () => void;                // Callback para cerrar modal
}
```

### 📊 Estado Local (Extensivo)

**Estados Básicos:**
```typescript
const [currentSection, setCurrentSection] = useState<StageType>("effect")
// StageType = "effect" | "secret" | "extra"
// Determina qué página del ScrollView está activa

const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
// Índice de foto actual en galería
```

**Estados de Reproducción:**
```typescript
const [isEffectPlaying, setIsEffectPlaying] = useState(true)   // Auto-play al iniciar
const [isSecretPlaying, setIsSecretPlaying] = useState(true)   // Pero empieza pausado
const [wasEffectPlaying, setWasEffectPlaying] = useState(true)
const [wasSecretPlaying, setWasSecretPlaying] = useState(true)
// Para recordar estado antes de expandir descripción
```

**Estados de Overlay:**
```typescript
const [isStageExpanded, setIsStageExpanded] = useState(false)  // Descripción expandida
const blurOpacity = useRef(new Animated.Value(0)).current      // Blur del fondo
```

**Estados de Carga:**
```typescript
const [isUploading, setIsUploading] = useState(false)
const [isProcessingSelection, setIsProcessingSelection] = useState(false)
const [isLoadingVideos, setIsLoadingVideos] = useState(true)
const [isLoadingPhotos, setIsLoadingPhotos] = useState(true)
const [videoLoadError, setVideoLoadError] = useState<string | null>(null)
const [photoLoadError, setPhotoLoadError] = useState<string | null>(null)
```

**Estados de Modales:**
```typescript
const [showActionsModal, setShowActionsModal] = useState(false)       // TrickActionsModal
const [showPrivacyModal, setShowPrivacyModal] = useState(false)       // MakePublicModal
const [showDeleteModal, setShowDeleteModal] = useState(false)         // DeleteModal
const [showSourceModal, setShowSourceModal] = useState(false)         // MediaSourceModal
const [showCamera, setShowCamera] = useState(false)                   // CameraView
const [trickIsPublic, setTrickIsPublic] = useState(trick.is_public || false)
```

**Estados de UI:**
```typescript
const [isUIVisible, setIsUIVisible] = useState(true)          // Toggle UI con tap
const [isSeekingVideo, setIsSeekingVideo] = useState(false)  // Durante scrubbing
```

**Estados de Videos:**
```typescript
const [effectVideoUrl, setEffectVideoUrl] = useState<string | null>(null)
const [secretVideoUrl, setSecretVideoUrl] = useState<string | null>(null)
// URLs locales (se actualizan al subir nuevo video)
```

**Estados de Fotos:**
```typescript
const [decryptedPhotos, setDecryptedPhotos] = useState<string[]>([])
// URLs públicas de fotos (desde Supabase)
```

**Estados de Tags:**
```typescript
const [localTagIds, setLocalTagIds] = useState<string[]>([])
// IDs de tags asociados al truco
```

**Estados de Tiempo:**
```typescript
const [effectDuration, setEffectDuration] = useState(0)       // Duración total
const [secretDuration, setSecretDuration] = useState(0)
const [effectTime, setEffectTime] = useState(0)               // Tiempo actual
const [secretTime, setSecretTime] = useState(0)
```

### 🎬 Flujo de Inicialización

```
Usuario tap en truco desde LibrariesSection
         ↓
router.push("/(app)/trick/[id]")
         ↓
TrickViewScreen monta
         ↓
1. Inicializar video players (expo-video)
   - effectPlayer con effect_video_url (auto-play)
   - secretPlayer con secret_video_url (pausado)
         ↓
2. Cargar usuario actual (supabase.auth.getUser())
         ↓
3. Configurar URLs de videos
   - Si URLs son rutas → Construir URL pública con getPublicUrl()
   - Si URLs son http → Usar directamente
         ↓
4. Cargar fotos
   - Mapear trick.photos a URLs públicas
   - Guardar en decryptedPhotos
         ↓
5. Obtener duraciones de videos
   - Polling cada 200ms hasta que player.duration > 0
   - Timeout a los 5000ms
         ↓
6. Tracking de tiempo actual
   - Interval cada 100ms actualizando effectTime/secretTime
   - Solo si está reproduciendo y no está buscando (isSeekingVideo)
         ↓
7. Cargar tags del truco
   - Query a "trick_tags" table
   - Guardar tag_ids en localTagIds
         ↓
8. Suscribirse a cambios de estado
   - currentSection → Cambiar entre effect/secret/extra al scrollear
   - isStageExpanded → Pausar videos cuando se expande descripción
```

### 📹 Sistema de Video Players (expo-video)

**Arquitectura:**
```typescript
// 1. Crear URLs memoizadas (estables para evitar re-crear players)
const effectVideoUrlMemo = useMemo(() => {
  const url = effectVideoUrl || trick.effect_video_url;
  return url.startsWith("http") ? url : getPublicUrl(url);
}, [effectVideoUrl, trick.effect_video_url, getPublicUrl]);

// 2. Crear players con useVideoPlayer hook
const effectPlayer = useVideoPlayer(
  effectVideoUrlMemo,
  useCallback((player: any) => {
    player.loop = true;
    player.play(); // Auto-reproducir
  }, [])
);

// 3. Guardar referencias para acceso directo
const effectPlayerRef = useRef(effectPlayer);
useEffect(() => {
  effectPlayerRef.current = effectPlayer;
}, [effectPlayer]);

// 4. Renderizar con VideoView
<VideoView
  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
  player={effectPlayer}
  contentFit="cover"
  allowsFullscreen={false}
  nativeControls={false}    // Controles custom
/>
```

**Propósito de Referencias:**
- `effectPlayerRef` y `secretPlayerRef` se usan para acceder a los players en handlers sin causar re-renders
- Los players NO deben cambiar a menos que la URL cambie (optimización)

### 🎮 Control de Reproducción

**Play/Pause Manual:**
```typescript
handlePlayPause = () => {
  const player = currentSection === "effect"
    ? effectPlayerRef.current
    : secretPlayerRef.current;

  const isPlaying = currentSection === "effect"
    ? isEffectPlaying
    : isSecretPlaying;

  if (isPlaying) {
    player.pause();
    setIsEffectPlaying(false); // o setIsSecretPlaying
  } else {
    player.play();
    setIsEffectPlaying(true);
  }
}
```

**Auto-control al Cambiar Sección:**
```typescript
useEffect(() => {
  // Si descripción expandida → Pausar todo
  if (isStageExpanded) {
    effectPlayerRef.current?.pause();
    secretPlayerRef.current?.pause();
    return;
  }

  // Reproducir/pausar según sección activa
  if (currentSection === "effect") {
    if (isEffectPlaying) effectPlayerRef.current?.play();
    else effectPlayerRef.current?.pause();
    secretPlayerRef.current?.pause();   // Pausar el otro
  } else if (currentSection === "secret") {
    if (isSecretPlaying) secretPlayerRef.current?.play();
    else secretPlayerRef.current?.pause();
    effectPlayerRef.current?.pause();
  } else {
    // extra (fotos) → Pausar ambos
    effectPlayerRef.current?.pause();
    secretPlayerRef.current?.pause();
  }
}, [currentSection, isEffectPlaying, isSecretPlaying, isStageExpanded]);
```

### ⏱️ Tracking de Tiempo (Performance Optimizado)

**Problema:** Actualizar tiempo actual sin saturar re-renders

**Solución:** Throttling con refs

```typescript
const lastEffectTimeRef = useRef(0);
const lastSeekTimeRef = useRef(0);
const MIN_SEEK_INTERVAL = 100; // 100ms entre seeks

useEffect(() => {
  if (!effectPlayerRef.current || currentSection !== "effect" || isSeekingVideo || !isEffectPlaying)
    return;

  const interval = setInterval(() => {
    const player = effectPlayerRef.current;
    if (!player) return;

    const time = player.currentTime;
    if (typeof time === "number" && !isNaN(time)) {
      // Solo actualizar si cambió >= 0.05s (50ms)
      const delta = Math.abs(time - lastEffectTimeRef.current);
      if (delta >= 0.05) {
        lastEffectTimeRef.current = time;
        setEffectTime(time);  // Re-render solo si cambio significativo
      }
    }
  }, 100); // Polling cada 100ms

  return () => clearInterval(interval);
}, [currentSection, isSeekingVideo, isEffectPlaying]);
```

**Propósito:**
- Polling cada 100ms (10 FPS) para UI fluida
- Re-render solo si cambio >= 50ms (evita renders excesivos)
- Desactivar durante isSeekingVideo (evita conflicto con scrubbing)

### 🎯 Scrubbing de Video (Seek Optimizado)

**Problema:** Arrastrar progress bar genera seeks excesivos que saturan el decoder

**Solución:** Throttling de seeks reales

```typescript
onSeek={(seekTime) => {
  // 1. Actualizar UI state siempre (sin throttle) → Barra fluida
  if (currentSection === "effect") {
    setEffectTime(seekTime);
    lastEffectTimeRef.current = seekTime;
  } else {
    setSecretTime(seekTime);
    lastSecretTimeRef.current = seekTime;
  }

  // 2. Throttle para seeks al video (evitar saturar decoder)
  const now = Date.now();
  if (now - lastSeekTimeRef.current < MIN_SEEK_INTERVAL) {
    return; // Skip este seek, demasiado pronto
  }
  lastSeekTimeRef.current = now;

  // 3. Seek real al video
  const player = currentSection === "effect"
    ? effectPlayerRef.current
    : secretPlayerRef.current;

  if (player) {
    player.currentTime = seekTime;  // Asignación directa
  }
}
```

**Resultado:**
- Barra de progreso se mueve fluidamente (60 FPS)
- Seeks reales al video cada 100ms (10 seeks/s máximo)
- Video decoder no se satura

### 📸 Sistema de Fotos

**Renderizado:**
```typescript
renderPhotoGallery = () => {
  if (isLoadingPhotos) return <ActivityIndicator />;

  const photosToDisplay = decryptedPhotos.length > 0 ? decryptedPhotos : photos;

  if (photosToDisplay.length === 0) {
    return (
      <View>
        <Text>No Photos</Text>
        {canEdit && (
          <TouchableOpacity onPress={handleUploadPress}>
            <Text>Upload Photos</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={photosToDisplay}
      horizontal
      pagingEnabled                              // Snap a cada foto
      showsHorizontalScrollIndicator={false}
      keyExtractor={(_, index) => `photo-${index}`}
      onScroll={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentPhotoIndex(index);
      }}
      renderItem={({ item }) => (
        <Image
          source={{ uri: item }}
          style={{ width, height }}
          resizeMode="contain"
        />
      )}
    />
  );
}
```

**Indicadores de Página:**
```typescript
{photosToDisplay.length > 1 && (
  <View style={{ position: "absolute", bottom: 20, flexDirection: "row" }}>
    {photosToDisplay.map((_, index) => (
      <View
        key={`dot-${index}`}
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: index === currentPhotoIndex
            ? "white"
            : "rgba(255,255,255,0.3)"
        }}
      />
    ))}
  </View>
)}
```

### 📤 Sistema de Subida de Media

**Flujo Completo:**
```
Usuario tap en "Upload video/photo"
         ↓
handleUploadPress() → Navega a edit-trick con initialStep=1
         ↓
O alternativamente (legacy):
         ↓
setShowSourceModal(true) → MediaSourceModal
         ↓
Usuario elige: Cámara o Galería
         ↓
handleSelectGallery() o handleSelectCamera()
         ↓
ImagePicker.launchImageLibraryAsync() o CameraView.takePictureAsync()
         ↓
handleMediaUpload(assets, currentSection)
         ↓
Según sección:
  ├─ "effect" → Subir video del efecto
  ├─ "secret" → Subir video del secreto
  └─ "extra" → Subir fotos
         ↓
Para videos:
  1. compressionService.compressFile(uri, "video/mp4")
  2. uploadFileToStorage(compressedUri, userId, path, mimeType)
     → Sube a Cloudflare Stream
  3. Actualizar URL en Supabase:
     supabase.from("magic_tricks")
       .update({ effect_video_url: cloudflareUrl })
       .eq("id", trick.id)
  4. refreshLibrary() → Invalida cache
  5. setEffectVideoUrl(cloudflareUrl) → Actualiza estado local
  6. Alert: "Video subido, procesando... recargando en 8s"
  7. setTimeout(8000) → router.replace() para forzar recarga
         ↓
Para fotos:
  1. compressionService.compressFile(uri, "image/jpeg")
  2. uploadFileToStorage(compressedUri, userId, path, mimeType)
  3. supabase.from("trick_photos").insert({ trick_id, photo_url })
  4. setDecryptedPhotos([...decryptedPhotos, newPhotoUrl])
  5. Alert: "Fotos subidas exitosamente"
```

**Importante:** Cloudflare Stream necesita ~5-10 segundos para procesar video después de subir. Por eso se espera 8s antes de recargar.

### 🎨 Componentes Hijos Renderizados

#### 1. **TopNavigationBar** (línea 1227)

**Archivo:** `components/trick-viewer/TopNavigationBar.tsx`

**Props:**
```typescript
<TopNavigationBar
  title={trick.title}
  onBackPress={handleClose}           // Navega a home
  onLikePress={handleLikePress}       // Toggle favorito
  onMorePress={handleMorePress}       // Abre TrickActionsModal
  isLiked={isFavorite}                // Estado de favorito
/>
```

**Estructura:**
```
┌──────────────────────────────────────┐
│  ←  Carta Ambiciosa       ⭐  ⋮     │
└──────────────────────────────────────┘
```

**Estilos:**
- **BlurView:** intensity=50, tint="dark"
- **LinearGradient:** Sutil gradiente horizontal
- **Border:** white/50% opacity, circular (9999px radius)
- **Height:** 48px
- **Icons:**
  - Back: Ionicons "chevron-back", 20px
  - Like: FontAwesome "star" / "star-o", 20px, color=#fadc91
  - More: Entypo "dots-three-horizontal", 16px

**Comportamiento:**
- **Back:** Ejecuta `onClose()` si existe, sino `router.push("/(app)/home")`
- **Like:** Toggle favorito con animación
- **More:** Pausa videos, abre TrickActionsModal

#### 2. **VideoProgressBar** (línea 1131)

**Archivo:** `components/trick-viewer/videoProgressBar.tsx`

**Props:**
```typescript
<VideoProgressBar
  duration={currentSection === "effect" ? effectDuration : secretDuration}
  currentTime={currentSection === "effect" ? effectTime : secretTime}
  isPlaying={currentSection === "effect" ? isEffectPlaying : isSecretPlaying}
  isUIVisible={isUIVisible}
  onPlayPause={handlePlayPause}
  onToggleUI={handleToggleUI}
  onSeekStart={() => setIsSeekingVideo(true)}
  onSeek={(seekTime) => { /* Throttled seek logic */ }}
  onSeekEnd={(seekTime) => { /* Final precise seek */ }}
/>
```

**Condición de Renderizado:**
- Solo visible si `currentSection === "effect" || "secret"`
- Y si existe video para esa sección

**Posición:**
- `position: "absolute"`
- `bottom: 0, left: 0, right: 0`
- `zIndex: 9999` (siempre encima de todo)

**Funcionalidad:**
- Barra de progreso con scrubbing
- Botón play/pause
- Tiempo actual / duración
- Toggle UI visibility

#### 3. **TrickViewerBottomSection** (línea 1249)

**Archivo:** `components/trick-viewer/TrickViewerBottomSection.tsx`

**Props:**
```typescript
<TrickViewerBottomSection
  tagIds={localTagIds}
  userId={userIdForTags}
  stage={currentSection}              // "effect" | "secret" | "extra"
  category={trick.category}
  description={getCurrentDescription()} // Cambia según stage
  angle={trick.angles?.[0]}
  resetTime={trick.reset}
  duration={trick.duration}
  difficulty={trick.difficulty}
  stageExpanded={isStageExpanded}
  onStageExpandedChange={handleStageExpandedChange}
/>
```

**Componentes Internos:**
- **TagPillsSection** (tags del truco)
- **StageInfoSection** (categoría + descripción expandible)
- **StatsPanel** (ángulo, reset, duración, dificultad)

**Estructura:**
```
┌──────────────────────────────────────┐
│  [Tag1] [Tag2] [Tag3]          📊   │  ← Tags + Stats button
├──────────────────────────────────────┤
│  Effect • Card tricks                │  ← Stage + Category
│  ▼ Description expandible...         │
│  Lorem ipsum dolor sit amet...       │
└──────────────────────────────────────┘
```

**Función `getCurrentDescription()`:**
```typescript
switch (currentSection) {
  case "effect": return trick.effect;
  case "secret": return trick.secret;
  case "extra": return trick.notes;
  default: return "";
}
```

### 📋 Modales Renderizados

#### 1. **TrickActionsModal** (línea 1265)
```typescript
<TrickActionsModal
  visible={showActionsModal}
  onClose={() => setShowActionsModal(false)}
  onEdit={() => router.push({ pathname: "/(app)/edit-trick", params: { trickId: trick.id } })}
  onPrivacy={() => setShowPrivacyModal(true)}
  onDelete={() => setShowDeleteModal(true)}
  isPublic={trickIsPublic}
  isOwner={currentUserId === trick.user_id}
/>
```

**Opciones:**
- ✏️ **Edit trick** (si es owner)
- 🔒 **Make public/private**
- 🗑️ **Delete trick** (si es owner)

#### 2. **MakePublicModal** (línea 1280)
```typescript
<MakePublicModal
  visible={showPrivacyModal}
  onClose={() => setShowPrivacyModal(false)}
  trickId={trick.id}
  initialIsPublic={trickIsPublic}
  onSuccess={(isPublic) => setTrickIsPublic(isPublic)}
/>
```

**Funcionalidad:**
- Toggle `is_public` field en base de datos
- Callback `onSuccess` actualiza estado local

#### 3. **DeleteModal** (línea 1288)
```typescript
<DeleteModal
  visible={showDeleteModal}
  onClose={() => setShowDeleteModal(false)}
  onConfirm={async () => {
    const success = await trickService.deleteTrick(trick.id);
    if (success) {
      setShowDeleteModal(false);
      notifyTrickDeleted(trick.id);    // TrickDeletionContext
      router.push("/(app)/home");
    } else {
      Alert.alert(t("error"), t("errorDeletingTrick"));
    }
  }}
  itemName={trick.title}
  itemType={t("trick")}
/>
```

**Funcionalidad:**
- Confirmación de eliminación
- Elimina en Supabase + cache local
- Notifica a TrickDeletionContext
- Navega a home

#### 4. **MediaSourceModal** (línea 1317)
```typescript
<MediaSourceModal
  visible={showSourceModal}
  onClose={() => setShowSourceModal(false)}
  onSelectGallery={handleSelectGallery}
  onSelectCamera={handleSelectCamera}
  type={currentSection === "effect" || "secret" ? "video" : "photo"}
/>
```

**Opciones:**
- 📷 Camera
- 🖼️ Gallery

#### 5. **CameraView Modal** (línea 1330)
```typescript
<Modal visible={showCamera} animationType="slide">
  <CameraView
    ref={cameraRef}
    style={{ flex: 1 }}
    facing="back"
    mode={currentSection === "effect" || "secret" ? "video" : "picture"}
  >
    {/* Header con X para cerrar */}
    {/* Botón de captura circular */}
  </CameraView>
</Modal>
```

**Funcionalidad:**
- Captura video (modo "video") o foto (modo "picture")
- Al capturar → `handleCameraCapture(uri)` → `handleMediaUpload()`

### 🎨 UI Features

**Toggle UI Visibility:**
```typescript
const [isUIVisible, setIsUIVisible] = useState(true);

const handleToggleUI = useCallback(() => {
  setIsUIVisible(prev => !prev);
}, []);

// TopNavigationBar solo visible si isUIVisible === true
{isUIVisible && <TopNavigationBar ... />}

// TrickViewerBottomSection solo visible si isUIVisible === true
{isUIVisible && <TrickViewerBottomSection ... />}
```

**Propósito:** Tap en video para ocultar UI y ver video a pantalla completa

**Blur Overlay al Expandir Descripción:**
```typescript
const blurOpacity = useRef(new Animated.Value(0)).current;

<Animated.View
  style={{
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: blurOpacity,
    pointerEvents: isStageExpanded ? "auto" : "none",
  }}
>
  <TouchableOpacity
    activeOpacity={1}
    onPress={() => handleStageExpandedChange(false)}
    style={{ flex: 1 }}
  >
    <BlurView
      intensity={40}
      tint="dark"
      style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
    />
  </TouchableOpacity>
</Animated.View>
```

**Propósito:**
- Al expandir descripción → Blur del fondo
- Tap en blur → Cierra descripción

### 🔄 Navegación Posible

```
TrickViewScreen
  ├─→ /(app)/home                    (onClose o back button)
  ├─→ /(app)/edit-trick?trickId=...  (Edit button)
  ├─→ /(app)/notifications           (Futuro: desde notificaciones)
  └─→ /(app)/trick/[id]              (Reload después de subir video)
```

### ⚡ Optimizaciones

1. **useMemo para URLs:**
   - `effectVideoUrlMemo` y `secretVideoUrlMemo` solo recalculan si URLs cambian
   - Evita re-crear video players

2. **useCallback para handlers:**
   - `handlePlayPause`, `handleToggleUI`, `getPublicUrl`
   - Evita re-renders innecesarios

3. **useRef para players:**
   - Acceso directo sin causar re-renders
   - `effectPlayerRef.current?.play()`

4. **Throttling de seeks:**
   - Máximo 10 seeks/s al video
   - UI actualiza a 60 FPS

5. **Throttling de time tracking:**
   - Solo re-render si delta >= 50ms
   - Polling cada 100ms

6. **Desactivar tracking durante seeking:**
   - `if (isSeekingVideo) return` en useEffect de tracking
   - Evita conflictos entre player updates y manual seeks

### 🐛 Edge Cases Manejados

1. **Sin video:** Muestra "No Video" + botón "Upload video"
2. **Sin fotos:** Muestra "No Photos" + botón "Upload Photos"
3. **Video sin duración:** Polling con timeout a 5s
4. **URL ya es http:** No construir con getPublicUrl()
5. **Usuario no es owner:** Deshabilitar botones de edición/eliminación
6. **Cloudflare Stream procesando:** Esperar 8s antes de recargar
7. **Error al subir:** Alert + mantener estado previo
8. **Descripción expandida:** Pausar videos automáticamente
9. **Cambio de sección:** Pausar video anterior, reproducir nuevo
10. **Delete falló:** Mostrar error, no cerrar modal prematuramente

### 🔌 Integraciones con Contextos

**LibraryDataContext:**
```typescript
const { refresh: refreshLibrary } = useLibraryData();

// Después de subir video:
await refreshLibrary();  // Invalida cache local
```

**TrickDeletionContext:**
```typescript
const { notifyTrickDeleted } = useTrickDeletion();

// Después de eliminar:
notifyTrickDeleted(trick.id);  // Notifica a otros componentes
```

**Favoritos Hook:**
```typescript
const { isFavorite, toggleFavorite } = useFavorites(trick.id, "magic");

// En TopNavigationBar:
<FontAwesome
  name={isFavorite ? "star" : "star-o"}
  color={isFavorite ? "#fadc91" : "#fadc91"}
/>
```

### 📊 Flujo de Datos Completo

```
TrickViewScreen (Props: trick data)
         ↓
1. Load user, videos, photos, tags, duration
         ↓
2. Render 3-page ScrollView (effect, secret, photos)
         ↓
3. Track currentSection based on scroll position
         ↓
4. Play/pause videos based on currentSection
         ↓
5. Update currentTime via polling (throttled)
         ↓
6. User interactions:
   ├─ Tap video → Play/pause
   ├─ Tap UI → Toggle visibility
   ├─ Scrub progress bar → Seek video
   ├─ Tap star → Toggle favorite
   ├─ Tap "..." → Open actions modal
   ├─ Tap "Upload" → Navigate to edit-trick
   ├─ Tap stage → Expand description
   └─ Tap stats button → Show stats panel
         ↓
7. Real-time updates:
   ├─ Video duration ready → Update state
   ├─ Video time changes → Update progress bar
   ├─ Expand description → Pause videos, blur background
   └─ Upload new media → Update URL, refresh library, reload
```

---

## 🧩 SUB-COMPONENTE: StatsPanel

**Archivo:** `components/trick-viewer/StatsPanel.tsx`

### 🎯 Propósito
Panel lateral animado que muestra estadísticas del truco: ángulo, reset time, duración y dificultad.

### 🔌 Props Interface
```typescript
interface StatsPanelProps {
  visible: boolean;          // Toggle del panel
  onToggle: () => void;      // Handler para toggle
  angle?: number;            // Ángulo en grados
  resetTime?: number;        // Tiempo de reset en segundos
  duration?: number;         // Duración en segundos
  difficulty?: number | null; // Dificultad 0-10
}
```

### 🎨 Estructura Visual

**Colapsado:**
```
┌────┐
│ 📊 │  ← Toggle button (60x60)
└────┘
```

**Expandido:**
```
┌────┐
│ 45°│  ← Angle
├────┤
│ 2:30│ ← Reset time
├────┤
│ 5:00│ ← Duration
├────┤
│  7 │  ← Difficulty (con barra de progreso)
├────┤
│ 📊 │  ← Toggle button
└────┘
```

### 🎭 Animaciones

**Slide Animation:**
```typescript
const slideAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.spring(slideAnim, {
    toValue: visible ? 1 : 0,
    tension: 65,
    friction: 11,
    useNativeDriver: true,
  }).start();
}, [visible]);
```

**Transform:**
- `translateY`: 20 → 0 (desde abajo)
- `scale`: 0.8 → 1 (efecto zoom)
- `opacity`: 0 → 1

**Staggered Animation:**
Cada stat tiene delay diferente en translateY:
- Angle: 40 → 0
- Reset: 30 → 0
- Duration: 20 → 0
- Difficulty: -10 → 0

### 🎨 Estilos

**Toggle Button:**
- Size: 60x60
- Border: white/50%, radius=16
- BlurView: intensity varía según estado
  - Visible: 80
  - Pressed: 40
  - Normal: 25
- Icon: MaterialIcons "signal-cellular-alt", 32px

**Stat Items:**
- Size: 60x120
- Border: white/20%, radius=16
- BlurView: intensity=50
- LinearGradient: Sutil gradiente vertical
- Background: rgba(80, 80, 80, 0.3)

**Inner Container:**
- Size: 50x80
- Border: white/15%, radius=12
- Background: rgba(161, 161, 161, 0.596)

### 📊 Formato de Datos

**Angle:**
```typescript
{angle ? `${angle}°` : "-"}
```

**Reset Time & Duration:**
```typescript
{resetTime < 60
  ? `00:${String(resetTime).padStart(2, "0")}`  // 00:45
  : `${Math.floor(resetTime / 60).toString().padStart(2, "0")}:${String(resetTime % 60).padStart(2, "0")}`  // 02:30
}
```

**Difficulty:**
- Valor numérico: 0-10
- Barra de progreso vertical (height: `${(difficulty / 10) * 100}%`)
- Color: white/47% opacity (getDifficultyColor siempre retorna este valor)

### 🐛 Debug Flags

```typescript
const DEBUG_GUARD = false;   // Detecta loops infinitos
const DEBUG_WDYR = false;    // Why Did You Update tracking
```

**Hooks de Debug:**
- `useInfiniteLoopGuard()`: Detecta si componente re-renderiza > 60 veces
- `useWhyDidYouUpdate()`: Logea qué props cambiaron causando re-render

### ⚡ Optimizaciones

1. **NO incluir slideAnim en dependencies:**
   ```typescript
   useEffect(() => {
     Animated.spring(slideAnim, {...}).start();
   }, [visible]); // <- Solo visible, NO slideAnim
   ```
   **Razón:** slideAnim es un Animated.Value, incluirlo causa loops infinitos

2. **pointerEvents condicional:**
   ```typescript
   <Animated.View
     pointerEvents={visible ? "auto" : "none"}
   >
   ```
   **Razón:** Desactiva interacción cuando colapsado

3. **useNativeDriver: true:**
   **Razón:** Animaciones en thread nativo, 60 FPS garantizado

---

## 🎩 ADD MAGIC WIZARD - Creación de Trucos

**Archivo:** `components/add-magic/AddMagicWizard.tsx`

### 🎯 Propósito
Wizard multi-step (3 pasos) para crear nuevos trucos. Maneja upload paralelo de media con progress tracking avanzado, validación en tiempo real, y compresión inteligente de videos.

### 📋 Flujo de 3 Pasos

**Step 1: TitleCategoryStep** → Título (3-40 chars) + Categoría (obligatoria) + Tags
**Step 2: EffectStep** → Effect/Secret text + Videos + Fotos
**Step 3: ExtrasStep** → Dificultad + Ángulos + Duration/Reset + Notas

### 📤 Sistema de Upload Avanzado

**uploadFilesInParallel():** Upload paralelo con métricas agregadas
- Progress % global (promedio de todos los archivos)
- Speed MB/s (suavizada con últimas 5 muestras)
- ETA segundos (máximo de todos los archivos)
- Files procesados / total

**uploadFileWithCompression():** Upload individual con tracking
- Calcula velocidad instantánea cada callback
- Suaviza velocidad (buffer de 5 muestras)
- Calcula ETA basado en bytes restantes

**LargeFileWarningModal:** Modal para archivos >200MB
- Estima tiempo de compresión + upload
- Usuario confirma antes de proceder

### 🎬 handleSubmit() - Creación Final

```
1. Obtener usuario autenticado
         ↓
2. Verificar/crear perfil
         ↓
3. Preparar archivos para upload
         ↓
4. uploadFilesInParallel() con UploadProgressModal
         ↓
5. INSERT magic_tricks
         ↓
6. INSERT trick_categories (junction)
         ↓
7. INSERT trick_tags (junction)
         ↓
8. Incrementar usage_count de tags
         ↓
9. router.push("/(app)/trick/[id]")
```

### 🔑 Features Clave

**Copy Inmediato:** Al seleccionar archivo → Copiar a `permanent_uploads/` (prevenir pérdida)
**Validación Progresiva:** Cada step valida solo sus campos
**Métricas en Tiempo Real:** Speed, ETA, Progress suavizados
**Upload Paralelo:** Promise.all para múltiples archivos simultáneos
**Rechazo >500MB:** Alert y return null (límite de tamaño)

---

## ✏️ EDIT MAGIC WIZARD - Edición de Trucos

**Archivo:** `components/edit-magic/EditMagicWizard.tsx`

### 🎯 Propósito
Mismo wizard que AddMagic pero en modo edición. Carga datos existentes del truco, permite modificar cualquier campo, y actualiza en Supabase.

### 🔄 Diferencias vs AddMagic

**Modo Edición (`isEditMode: true`):**
- Carga datos existentes del truco con `fetchTrickData(trickId)`
- Videos/fotos existentes se muestran en MediaSelector
- `initialStep` permite saltar a paso específico (ej: desde TrickView para upload)
- handleSubmit hace UPDATE en lugar de INSERT
- Mantiene `created_at` original, actualiza `updated_at`

**Flujo de Carga:**
```
EditMagicWizard monta con trickId
         ↓
fetchTrickData(trickId)
  ├─ SELECT * FROM magic_tricks WHERE id = trickId
  ├─ SELECT category_ids FROM trick_categories
  ├─ SELECT tag_ids FROM trick_tags
  └─ SELECT photo_urls FROM trick_photos
         ↓
Poblar trickData con valores existentes
         ↓
Renderizar wizard en initialStep (default: 0)
         ↓
Usuario modifica campos
         ↓
handleSubmit() → UPDATE en Supabase
         ↓
router.back() o router.push("/(app)/trick/[id]")
```

**handleSubmit() en Modo Edición:**
```
1. Upload nuevos archivos (si existen en localFiles)
         ↓
2. UPDATE magic_tricks SET ... WHERE id = trickId
         ↓
3. DELETE FROM trick_categories WHERE trick_id = trickId
4. INSERT nuevas categorías
         ↓
5. DELETE FROM trick_tags WHERE trick_id = trickId
6. INSERT nuevos tags
         ↓
7. Si hay nuevas fotos:
   DELETE FROM trick_photos WHERE trick_id = trickId
   INSERT nuevas fotos
         ↓
8. router.back()
```

---

## 🤖 MMENTO AI - Chat con IA

**Archivo:** `app/(app)/mmento-ai/index.tsx`

### 🎯 Propósito
Chat conversacional con IA (OpenAI GPT) para consultas sobre magia. Soporta texto y audio, organiza conversaciones, y trackea límites de uso según plan.

### 🏗️ Arquitectura

**ChatService** (`services/chatService.ts`):
- Singleton para gestionar conversaciones
- CRUD de conversaciones y mensajes
- Integración con OpenAI API
- Tracking de tokens usados (`ai_usage_tracking`)

**Componentes:**
- **MessageBubble:** Burbuja de chat (user/assistant)
- **ConversationList:** Sidebar con lista de conversaciones
- **AudioRecorder:** Grabación de audio con transcripción

### 📊 Estado Global

```typescript
const [conversations, setConversations] = useState<any[]>([]);  // Todas las conversaciones
const [currentConversation, setCurrentConversation] = useState<any>(null);
const [messages, setMessages] = useState<any[]>([]);  // Mensajes de conversación actual
const [inputText, setInputText] = useState("");
const [isSending, setIsSending] = useState(false);
const [userLimits, setUserLimits] = useState<any>(null);  // Límites según plan
const [showConversations, setShowConversations] = useState(false);  // Sidebar toggle
```

### 🎬 Flujo de Chat

```
initializeChat()
  ├─ Verificar auth
  ├─ Cargar límites: checkUserLimit(userId)
  ├─ Cargar conversaciones: getConversations(userId)
  └─ Si no hay conversaciones → createNewConversation()
     Else → selectConversation(conversations[0])
         ↓
Usuario escribe mensaje
         ↓
sendMessage(content)
  ├─ Validar límites (tokens restantes)
  ├─ Agregar mensaje a UI (optimistic)
  ├─ INSERT INTO ai_messages (role: "user")
  ├─ Llamar OpenAI API con historial completo
  │  └─ messages: [system, ...previousMessages, userMessage]
  ├─ Streaming de respuesta (chunks)
  ├─ Agregar respuesta a UI (role: "assistant")
  ├─ INSERT INTO ai_messages (role: "assistant")
  └─ UPDATE ai_usage_tracking (increment tokens_used)
         ↓
Scroll automático al final (flatListRef.scrollToEnd)
```

### 🎙️ Audio Features

**AudioRecorder Component:**
- Grabación con expo-av
- Transcripción con OpenAI Whisper API
- Botón hold-to-record
- Envío automático después de transcribir

**Flujo:**
```
Usuario presiona botón micrófono
         ↓
Solicitar permisos (Audio.requestPermissionsAsync)
         ↓
Iniciar grabación (recording.startAsync)
         ↓
Usuario suelta botón
         ↓
Detener grabación (recording.stopAndUnloadAsync)
         ↓
Upload audio a Cloudflare/Supabase
         ↓
Transcribir con OpenAI Whisper API
         ↓
sendMessage(transcribedText, audioUrl)
```

### 💬 Conversaciones

**createNewConversation():**
- Título: "Chat {fecha}"
- INSERT INTO ai_conversations
- Agregar a lista local
- Seleccionar automáticamente

**selectConversation():**
- Cargar mensajes: getMessages(conversationId)
- Actualizar estado `messages`
- Scroll al final

**deleteConversation():**
- DELETE FROM ai_messages WHERE conversation_id
- DELETE FROM ai_conversations WHERE id
- Actualizar lista local

### 🔒 Límites de Uso

```typescript
interface UserLimits {
  subscription_type: "free" | "premium" | "pro";
  tokens_used: number;
  tokens_limit: number;  // free: 100k, premium: 500k, pro: ilimitado
  can_send: boolean;
}

// Validar antes de enviar
if (!userLimits.can_send) {
  Alert.alert("Límite alcanzado", "Upgrade tu plan");
  return;
}
```

---

## 👤 PROFILE - Pantalla de Perfil

**Archivo:** `app/(app)/profile/index.tsx`

### 🎯 Propósito
Pantalla de perfil del usuario con estadísticas y opciones de configuración.

### 📊 Datos Mostrados

```typescript
interface UserProfile {
  username: string;
  email: string;
  subscription_type: "free" | "premium" | "pro";
  is_verified: boolean;
  created_at: string;
}

interface UserStats {
  tricks_created: number;    // COUNT(*) FROM magic_tricks
  tricks_viewed: number;     // TODO: Tracking
  tricks_favorited: number;  // COUNT(*) FROM user_favorites
}
```

### 🎨 Opciones

**Navegación:**
- **Profile Options** → `router.push("/(app)/profile-options")`
- **Plans** → `router.push("/(app)/plans")`
- **Tags** → `router.push("/(app)/tags")`
- **Settings** → `router.push("/(app)/settings")`
- **Reminders** → `router.push("/(app)/reminders")`
- **Logout** → `signOut()` → `router.replace("/auth/login")`

**Iconos con BlurView:**
- FontAwesome, MaterialIcons, Ionicons
- Cards con gradiente + blur + border

---

## 🏷️ TAGS - Gestión de Tags

**Archivo:** `app/(app)/tags/index.tsx`

### 🎯 Propósito
CRUD completo de tags personalizados. Crear, editar, eliminar, ordenar y ver uso.

### 📊 Estructura de Tag

```typescript
interface Tag {
  id: string;
  name: string;
  color: string;          // Hex color
  usage_count: number;    // Incrementado por RPC function
  created_at: string;
}
```

### 🎬 Funcionalidades

**fetchTags():**
```sql
SELECT id, name, color, usage_count, created_at
FROM predefined_tags
WHERE user_id = $1
ORDER BY name ASC
```

**createTag():**
```sql
INSERT INTO predefined_tags (id, user_id, name, color)
VALUES ($1, $2, $3, $4)
```

**updateTag():**
```sql
UPDATE predefined_tags
SET name = $1, color = $2, updated_at = NOW()
WHERE id = $3 AND user_id = $4
```

**deleteTag():**
```
1. Fetch affected tricks:
   SELECT trick_id FROM trick_tags WHERE tag_id = $1
         ↓
2. Mostrar DeleteTagConfirmationModal con lista
         ↓
3. Usuario confirma:
   DELETE FROM trick_tags WHERE tag_id = $1
   DELETE FROM predefined_tags WHERE id = $1
```

**Sorting:**
- Por nombre (A-Z, Z-A)
- Por uso (más usado primero, menos usado primero)
- Por fecha (más reciente, más antiguo)

**Modales:**
- **TagModal:** Crear/editar con ColorPicker
- **TagActionsModal:** Opciones (Edit, Delete, Cancel)
- **DeleteTagConfirmationModal:** Confirmación con lista de trucos afectados
- **SortModal:** Opciones de ordenamiento

### 🎨 UI

**FlatList de Tags:**
- Card por tag con color de fondo
- Nombre + usage_count
- Tap → TagActionsModal
- EmptyState si no hay tags

**FloatingActionButton:**
- Botón "+" fixed bottom-right
- onPress → setShowCreateModal(true)

---

## ⚙️ PANTALLAS ADICIONALES

### 🔔 NOTIFICATIONS
**Archivo:** `app/(app)/notifications/index.tsx`
- Lista de notificaciones (futuro)
- Actualmente placeholder

### 📋 PLANS
**Archivo:** `app/(app)/plans/index.tsx`
- Comparación de planes (Free, Premium, Pro)
- Botones de upgrade
- Integración con Stripe/payments (futuro)

### ⚙️ SETTINGS
**Archivo:** `app/(app)/settings/index.tsx`
- Idioma (es/en)
- Tema (futuro)
- Notificaciones push (futuro)
- Privacy policy, Terms of service

### 🔔 REMINDERS
**Archivo:** `app/(app)/reminders/index.tsx`
- Recordatorios para practicar trucos
- Notificaciones programadas (futuro)

### 🎯 PROFILE OPTIONS
**Archivo:** `app/(app)/profile-options/index.tsx`
- Editar username
- Editar email
- Cambiar contraseña
- Upload avatar

---

## 🧠 CONTEXTS - Gestión Global de Estado

Los Contexts son el sistema de gestión de estado global de la aplicación. Usan React Context API para compartir datos y funciones entre componentes sin prop drilling.

---

## 📚 LibraryDataContext - Contexto Principal

**Archivo:** `context/LibraryDataContext.tsx`

### 🎯 Propósito
Contexto MÁS IMPORTANTE de la aplicación. Gestiona todos los datos de la biblioteca del usuario: trucos, categorías, favoritos, búsqueda y filtros. Implementa cache local + sincronización con Supabase + real-time updates.

### 🔌 Interface Exportada

```typescript
interface LibraryDataContextType {
  // User data
  userName: string;                   // Nombre del usuario
  avatarUrl: string | null;           // URL de avatar
  greeting: string;                   // Saludo según hora del día

  // Library data
  sections: CategorySection[];        // Categorías con trucos filtrados
  allCategories: LocalCategory[];     // Todas las categorías del usuario
  loading: boolean;                   // Cargando desde red
  initializing: boolean;              // Inicializando contexto
  error: string | null;               // Error si existe

  // Actions
  refresh: () => Promise<void>;                                    // Refrescar datos
  toggleFavorite: (trickId: string) => Promise<void>;             // Toggle favorito
  createCategory: (name, description?) => Promise<LocalCategory | null>;
  updateCategory: (id, name, description?) => Promise<boolean>;
  deleteCategory: (id) => Promise<boolean>;
  applyFilters: (query: string, filters?: SearchFilters) => void; // Aplicar búsqueda/filtros
}
```

### 📊 Estado Local

```typescript
// User state
const [userName, setUserName] = useState("...");
const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
const [greeting, setGreeting] = useState("Hello");

// Library state
const [sections, setSections] = useState<CategorySection[]>([]);
const [allCategories, setAllCategories] = useState<LocalCategory[]>([]);
const [rawTricks, setRawTricks] = useState<LocalTrick[]>([]);
const [loading, setLoading] = useState(false);
const [initializing, setInitializing] = useState(true);
const [error, setError] = useState<string | null>(null);
const [currentUserId, setCurrentUserId] = useState<string | null>(null);

// Current filters
const [currentQuery, setCurrentQuery] = useState("");
const [currentFilters, setCurrentFilters] = useState<SearchFilters | undefined>();

// Refs
const hasLoadedRef = useRef(false);    // Prevenir carga doble
const channelRef = useRef<any>(null);  // Supabase realtime channel
```

### 🎬 Flujo de Inicialización

```
App monta → LibraryDataProvider monta
         ↓
useEffect (solo 1 vez, hasLoadedRef previene doble ejecución)
         ↓
1. supabase.auth.getUser()
   → Obtiene user.id
         ↓
2. supabase.from("profiles").select(...)
   → Obtiene username, email, avatar_url
   → Calcula userName (username || email.split('@')[0] || "Usuario")
   → Calcula greeting según hora del día
         ↓
3. loadData(user.id)
   ├─ localDataService.getUserData(userId)  ← Cache local (AsyncStorage)
   │  └─ Si existe cache:
   │     - setRawTricks(cachedData.tricks)
   │     - setAllCategories(cachedData.categories)
   │     - buildSections() → setSections()
   │     - setInitializing(false)  ← Usuario ve datos inmediatamente
   │
   └─ supabaseDataService.fetchAllUserData(userId)  ← Network
      └─ Fetch desde Supabase:
         - magic_tricks (con relations)
         - user_categories
         - Guarda en cache: localDataService.saveUserData()
         - setRawTricks(), setAllCategories()
         - buildSections() → setSections()
         - setLoading(false), setInitializing(false)
         ↓
4. Suscribirse a real-time updates (otro useEffect)
   - magic_tricks table
   - user_categories table
   - user_favorites table
         ↓
App lista con datos
```

### 🔍 buildSections - Función Core

**Propósito:** Construir array de CategorySection con trucos filtrados

**Firma:**
```typescript
buildSections(
  categories: LocalCategory[],
  tricks: LocalTrick[],
  query: string,
  filters?: SearchFilters
): CategorySection[]
```

**Flujo:**
```
1. Normalizar query (toLowerCase, trim)
         ↓
2. Filtrar trucos en UN SOLO LOOP (optimización):
   ├─ Filtro de texto (query)
   │  - Busca en: title, effect, secret
   ├─ Filtro de categorías (filters.categories)
   │  - trick.category_ids debe incluir alguna categoría seleccionada
   ├─ Filtro de dificultad (filters.difficulties)
   │  - trick.difficulty debe estar en array de dificultades
   ├─ Filtro de duración (filters.durations.min/max)
   │  - trick.duration entre min y max
   ├─ Filtro de reset time (filters.resetTimes.min/max)
   │  - trick.reset entre min y max
   ├─ Filtro de ángulos (filters.angles)
   │  - trick.angles debe incluir algún ángulo seleccionado
   └─ Filtro de tags (filters.tags + filters.tagsMode)
      - Modo "and": trick debe tener TODOS los tags
      - Modo "or": trick debe tener AL MENOS UN tag
         ↓
3. Crear categoría virtual "Favoritos"
   - ID: "favorites-virtual"
   - Items: filteredTricks.filter(t => t.is_favorite)
   - **SIEMPRE se agrega, incluso si está vacía** (fix reciente)
         ↓
4. Crear Map de categorías:
   ├─ Para cada categoría del usuario:
   │  ├─ Skip si se llama "Favoritos" (evitar duplicados)
   │  ├─ Si hay filtro de categorías activo:
   │  │  └─ Solo incluir si está en filters.categories
   │  ├─ Filtrar trucos que pertenecen a la categoría
   │  └─ Si hay filtros activos:
   │     └─ Solo incluir categoría si tiene trucos (no mostrar vacías)
   │     Si NO hay filtros:
   │     └─ Incluir TODAS las categorías (incluso vacías)
   └─ Agregar al Map
         ↓
5. Convertir Map a Array
         ↓
6. Ordenar:
   - Favoritos SIEMPRE primero
   - Resto alfabéticamente por nombre
         ↓
7. Retornar CategorySection[]
```

**Optimización Crítica:**
- UN SOLO LOOP sobre todos los trucos
- Todos los filtros se aplican en el mismo loop
- Evita múltiples iteraciones (mejor performance)

### 🔄 Funciones CRUD

#### 1. **loadData(userId: string)**
```typescript
async loadData(userId) {
  // 1. Intentar cache local primero
  const cachedData = await localDataService.getUserData(userId);
  if (cachedData) {
    setRawTricks(cachedData.tricks);
    setAllCategories(cachedData.categories);
    setSections(buildSections(...));
    setInitializing(false);  // Usuario ve datos INMEDIATAMENTE
  }

  // 2. Fetch desde red (en paralelo, no bloquea UI)
  setLoading(true);
  const { categories, tricks } = await supabaseDataService.fetchAllUserData(userId);

  // 3. Guardar en cache
  localDataService.saveUserData({ userId, categories, tricks, ... });

  // 4. Actualizar estado
  setRawTricks(tricks);
  setAllCategories(categories);
  setSections(buildSections(...));
  setLoading(false);
}
```

**Estrategia Cache-First:**
- Usuario ve datos instantáneamente desde cache
- Actualización desde red ocurre en background
- Si datos cambiaron → UI se actualiza automáticamente

#### 2. **refresh()**
```typescript
async refresh() {
  if (!currentUserId) return;
  await loadData(currentUserId);
}
```

**Uso:**
- Después de crear/editar/eliminar truco
- Pull-to-refresh en home
- Después de subir media

#### 3. **toggleFavorite(trickId: string)**
```typescript
async toggleFavorite(trickId) {
  // 1. Actualizar cache local INMEDIATAMENTE (optimistic update)
  localDataService.toggleFavorite(currentUserId, trickId);

  // 2. Actualizar UI desde cache
  const updatedData = await localDataService.getUserData(currentUserId);
  setRawTricks(updatedData.tricks);
  setSections(buildSections(...));

  // 3. Sincronizar con servidor
  try {
    await supabaseDataService.toggleFavorite(currentUserId, trickId, ...);
  } catch (err) {
    // 4. Si falla, revertir y refrescar
    localDataService.toggleFavorite(currentUserId, trickId);  // Revert
    refresh();
  }
}
```

**Optimistic Update:**
- UI actualiza ANTES de esperar servidor
- Si servidor falla → Revertir cambios
- Usuario percibe app como instantánea

#### 4. **createCategory(name, description?)**
```typescript
async createCategory(name, description?) {
  const newCategory = await supabaseDataService.createCategory(...);
  if (newCategory) {
    localDataService.addCategory(currentUserId, newCategory);
    await refresh();
  }
  return newCategory;
}
```

**Flujo:**
- Crear en Supabase primero
- Agregar a cache local
- Refrescar para obtener datos completos

#### 5. **updateCategory(categoryId, name, description?)**
```typescript
async updateCategory(categoryId, name, description?) {
  const success = await supabaseDataService.updateCategory(categoryId, {...});
  if (success) {
    localDataService.updateCategory(currentUserId, categoryId, {...});
    await refresh();
  }
  return success;
}
```

#### 6. **deleteCategory(categoryId)**
```typescript
async deleteCategory(categoryId) {
  const success = await supabaseDataService.deleteCategory(categoryId);
  if (success) {
    localDataService.deleteCategory(currentUserId, categoryId);
    await refresh();
  }
  return success;
}
```

#### 7. **applyFilters(query, filters?)**
```typescript
const applyFilters = useCallback((query: string, filters?: SearchFilters) => {
  setCurrentQuery(query);
  setCurrentFilters(filters);
}, []);
```

**Propósito:** Solo guardar query y filtros en estado
**No ejecuta búsqueda aquí** → useEffect detecta cambios y ejecuta búsqueda

### 🔍 Sistema de Búsqueda Híbrida

**Problema:** Con muchos trucos (>500), búsqueda en cliente es lenta

**Solución:** Búsqueda híbrida (cliente o servidor según cantidad)

```typescript
// useMemo: Decide si usar cliente o servidor
const memoizedSections = useMemo(() => {
  const shouldUseServer = hybridSearchService.shouldUseServerSearch(rawTricks.length);

  if (shouldUseServer && currentQuery.trim()) {
    return [];  // Indicar que está cargando del servidor
  }

  // Búsqueda en cliente (normal)
  return buildSections(allCategories, rawTricks, currentQuery, currentFilters);
}, [allCategories, rawTricks, currentQuery, currentFilters]);

// useEffect: Búsqueda asíncrona en servidor si >500 trucos
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
          '',  // Query ya aplicado en servidor (FTS)
          currentFilters
        );
        setSections(newSections);
      }
    } catch (error) {
      // Fallback a búsqueda en cliente si servidor falla
      if (!cancelled) {
        setSections(buildSections(allCategories, rawTricks, currentQuery, currentFilters));
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();

  return () => { cancelled = true; };
}, [currentUserId, rawTricks.length, currentQuery, currentFilters]);
```

**Decisión:**
- **< 500 trucos:** Búsqueda en cliente (filtrado en memoria)
- **≥ 500 trucos:** Búsqueda en servidor (PostgreSQL Full-Text Search con GIN index)

**Fallback:** Si servidor falla → Búsqueda en cliente

### 📡 Real-time Subscriptions

```typescript
useEffect(() => {
  if (!currentUserId) return;

  const channel = supabase
    .channel(`user_library_${currentUserId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'magic_tricks',
      filter: `user_id=eq.${currentUserId}`
    }, () => {
      refresh();  // Refrescar cuando cambia magic_tricks
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_categories',
      filter: `user_id=eq.${currentUserId}`
    }, () => {
      refresh();  // Refrescar cuando cambia user_categories
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_favorites',
      filter: `user_id=eq.${currentUserId}`
    }, () => {
      refresh();  // Refrescar cuando cambia user_favorites
    })
    .subscribe();

  channelRef.current = channel;

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  };
}, [currentUserId, refresh]);
```

**Propósito:**
- Detectar cambios en tiempo real desde otros dispositivos
- Sincronizar automáticamente sin necesidad de refresh manual

**Tablas Observadas:**
- `magic_tricks` → Crear/editar/eliminar trucos
- `user_categories` → Crear/editar/eliminar categorías
- `user_favorites` → Toggle favoritos

### 🔗 Integración con TrickDeletionContext

```typescript
const { deletedTrickId } = useTrickDeletion();

useEffect(() => {
  if (deletedTrickId && currentUserId) {
    // Actualizar inmediatamente desde caché local
    const cachedData = localDataService.getUserData(currentUserId);
    cachedData.then((data) => {
      if (data) {
        setRawTricks(data.tricks);
        setSections(buildSections(...));
      }
    });
  }
}, [deletedTrickId, currentUserId, buildSections]);
```

**Propósito:**
- TrickViewScreen elimina truco → notifica via TrickDeletionContext
- LibraryDataContext detecta cambio → actualiza UI inmediatamente
- No necesita esperar real-time subscription (más rápido)

### ⚡ Optimizaciones

1. **useMemo para buildSections:**
   - Solo recalcula si cambian: allCategories, rawTricks, currentQuery, currentFilters
   - Evita reconstruir sections en cada render

2. **useCallback para funciones:**
   - `buildSections`, `loadData`, `refresh`, `toggleFavorite`, etc.
   - Previenen re-renders innecesarios de componentes hijos

3. **hasLoadedRef:**
   - Previene doble carga en desarrollo (React StrictMode monta 2 veces)
   - Solo ejecuta loadData una vez

4. **Cache-first strategy:**
   - Usuario ve datos instantáneamente
   - Actualización en background

5. **Optimistic updates:**
   - toggleFavorite actualiza UI antes de servidor
   - Usuario percibe app como instantánea

6. **Single loop filtering:**
   - Todos los filtros en un solo loop
   - Mejor performance con grandes datasets

### 🔌 Uso en Componentes

```typescript
// En cualquier componente:
import { useLibraryData } from '../context/LibraryDataContext';

function MyComponent() {
  const {
    userName,
    avatarUrl,
    sections,
    allCategories,
    loading,
    initializing,
    refresh,
    toggleFavorite,
    createCategory,
    applyFilters,
  } = useLibraryData();

  // Usar datos...
}
```

**Componentes que usan LibraryDataContext:**
- `app/(app)/home/index.tsx` - Home page principal
- `components/home/UserProfile.tsx` - Avatar y nombre
- `components/home/LibrariesSection.tsx` - Lista de categorías
- `components/TrickViewScreen.tsx` - Vista de truco (para refresh después de upload)

---

## 🔍 SearchContext - Contexto de Búsqueda

**Archivo:** `context/SearchContext.tsx`

### 🎯 Propósito
Contexto simple para gestionar query de búsqueda y filtros. Proporciona debounce automático para evitar búsquedas excesivas.

### 🔌 Interface Exportada

```typescript
interface SearchContextType {
  searchQuery: string;                         // Query actual (sin debounce)
  debouncedSearchQuery: string;                // Query con debounce 300ms
  setSearchQuery: (query: string) => void;
  searchFilters: SearchFilters;                // Filtros activos
  setSearchFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;                     // Reset todo
}

interface SearchFilters {
  categories: string[];                        // IDs de categorías
  tags: string[];                              // IDs de tags
  tagsMode?: "and" | "or";                    // Modo de búsqueda de tags
  difficulties: number[];                      // Dificultades (0-10)
  resetTimes: { min?: number; max?: number }; // Rango de reset time
  durations: { min?: number; max?: number };  // Rango de duración
  angles: string[];                           // Ángulos
  isPublic?: boolean | null;                  // Solo trucos públicos
  sortOrder?: "recent" | "last";              // Orden
}
```

### 📊 Estado Local

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [searchFilters, setSearchFilters] = useState<SearchFilters>(defaultFilters);

// Debounce automático con hook custom
const debouncedSearchQuery = useDebounce(searchQuery, 300);
```

**defaultFilters:**
```typescript
{
  categories: [],
  tags: [],
  difficulties: [],
  resetTimes: {},
  durations: {},
  angles: [],
  isPublic: null,
  sortOrder: "recent",
}
```

### 🎯 Función clearSearch

```typescript
const clearSearch = () => {
  setSearchQuery("");
  setSearchFilters(defaultFilters);
};
```

**Uso:**
- Reset después de aplicar filtros
- Botón "Clear filters" en FiltersModal

### 🔄 Flujo de Búsqueda

```
Usuario escribe en CompactSearchBar
         ↓
setSearchQuery("query")  ← SearchContext
         ↓
searchQuery actualizado inmediatamente
         ↓
useDebounce(searchQuery, 300ms)
         ↓
Espera 300ms después de último keystroke
         ↓
debouncedSearchQuery actualizado
         ↓
LibrariesSection recibe debouncedSearchQuery
         ↓
LibraryDataContext.applyFilters(debouncedSearchQuery, filters)
         ↓
buildSections() ejecuta filtrado
         ↓
sections actualizado → UI re-renderiza
```

**Propósito del Debounce:**
- Evitar búsquedas en cada keystroke
- Reducir carga en buildSections (filtrado costoso)
- Mejor UX: esperar a que usuario termine de escribir

### 🔌 Uso en Componentes

```typescript
import { useSearch } from '../context/SearchContext';

function MyComponent() {
  const {
    searchQuery,
    debouncedSearchQuery,
    setSearchQuery,
    searchFilters,
    setSearchFilters,
    clearSearch,
  } = useSearch();

  // Usar...
}
```

**Componentes que usan SearchContext:**
- `app/(app)/home/index.tsx` - Gestiona query y filtros
- `components/home/CompactSearchBar.tsx` - Input de búsqueda
- `components/ui/FilterModal.tsx` - Modal de filtros

---

## 🗑️ TrickDeletionContext - Contexto de Eliminación

**Archivo:** `context/TrickDeletionContext.tsx`

### 🎯 Propósito
Contexto ultra-simple para notificar cuando un truco ha sido eliminado. Permite que LibraryDataContext reaccione inmediatamente sin esperar real-time subscription.

### 🔌 Interface Exportada

```typescript
interface TrickDeletionContextType {
  deletedTrickId: string | null;                    // ID del truco eliminado
  setDeletedTrickId: (trickId: string | null) => void;
  notifyTrickDeleted: (trickId: string) => void;   // Notificar eliminación
}
```

### 📊 Estado Local

```typescript
const [deletedTrickId, setDeletedTrickId] = useState<string | null>(null);
```

### 🎯 Función notifyTrickDeleted

```typescript
const notifyTrickDeleted = useCallback((trickId: string) => {
  setDeletedTrickId(trickId);
  // Reset después de 100ms para permitir que componentes reaccionen
  setTimeout(() => setDeletedTrickId(null), 100);
}, []);
```

**Estrategia:**
- Establecer `deletedTrickId` a ID del truco eliminado
- Después de 100ms → Reset a `null`
- En ese tiempo, componentes detectan cambio y reaccionan

### 🔄 Flujo de Eliminación

```
TrickViewScreen: Usuario confirma eliminar truco
         ↓
await trickService.deleteTrick(trickId)
         ↓
Si éxito:
  notifyTrickDeleted(trickId)  ← TrickDeletionContext
         ↓
deletedTrickId actualizado
         ↓
LibraryDataContext detecta cambio (useEffect)
         ↓
Actualiza UI desde cache local (instantáneo)
         ↓
setTimeout(100ms)
         ↓
deletedTrickId → null (reset)
         ↓
Real-time subscription también notifica (backup)
```

**Propósito:**
- Actualización instantánea sin esperar real-time subscription
- Real-time subscription actúa como backup (si falla notificación)

### 🔌 Uso en Componentes

```typescript
import { useTrickDeletion } from '../context/TrickDeletionContext';

// En TrickViewScreen:
const { notifyTrickDeleted } = useTrickDeletion();

const handleDelete = async () => {
  const success = await trickService.deleteTrick(trickId);
  if (success) {
    notifyTrickDeleted(trickId);  // Notificar
    router.push("/(app)/home");
  }
};

// En LibraryDataContext:
const { deletedTrickId } = useTrickDeletion();

useEffect(() => {
  if (deletedTrickId) {
    // Actualizar UI inmediatamente
    refresh();
  }
}, [deletedTrickId]);
```

---

## 🔗 Relación Entre Contexts

```
┌─────────────────────────────────────────────────┐
│  SearchContext                                  │
│  - searchQuery                                  │
│  - debouncedSearchQuery (300ms)                 │
│  - searchFilters                                │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓ (provides query & filters)
┌─────────────────────────────────────────────────┐
│  LibraryDataContext                             │
│  - sections ← buildSections(query, filters)     │
│  - allCategories                                │
│  - rawTricks                                    │
│  - refresh(), toggleFavorite(), etc.            │
│  ────────────────────────────────────────       │
│  Cache Strategy:                                │
│  1. LocalDataService (AsyncStorage)             │
│  2. SupabaseDataService (Network)               │
│  3. Real-time subscriptions (Supabase)          │
└─────────────────┬───────────────────────────────┘
                  ↑
                  │ (notifies deletion)
┌─────────────────┴───────────────────────────────┐
│  TrickDeletionContext                           │
│  - deletedTrickId                               │
│  - notifyTrickDeleted()                         │
└─────────────────────────────────────────────────┘
```

**Flujo de Datos Completo:**

1. **Usuario escribe en búsqueda:**
   - SearchContext.setSearchQuery()
   - useDebounce(300ms)
   - Home page pasa debouncedSearchQuery a LibrariesSection
   - LibrariesSection llama LibraryDataContext.applyFilters()
   - buildSections() filtra trucos
   - sections actualizado → UI re-renderiza

2. **Usuario toggle favorito:**
   - Component llama LibraryDataContext.toggleFavorite()
   - Actualiza cache local (optimistic)
   - Actualiza Supabase
   - Real-time subscription notifica cambio
   - refresh() actualiza UI

3. **Usuario elimina truco:**
   - TrickViewScreen elimina en Supabase
   - Llama TrickDeletionContext.notifyTrickDeleted()
   - LibraryDataContext detecta deletedTrickId
   - Actualiza UI desde cache
   - Real-time subscription también notifica (backup)

---

## ⚙️ SERVICES - Capa de Servicios

Los Services son la capa de lógica de negocio que maneja toda la comunicación con APIs, gestión de cache, procesamiento de datos y operaciones CRUD. Están diseñados como **Singletons** para asegurar una única instancia.

---

## 💾 LocalDataService - Servicio de Cache Local

**Archivo:** `services/LocalDataService.ts`

### 🎯 Propósito
Servicio de cache local que usa **AsyncStorage + memoria** para almacenamiento persistente ultra-rápido. Implementa una arquitectura de dos capas: memoria para acceso síncono instantáneo, y AsyncStorage para persistencia.

### 🏗️ Arquitectura de Dual-Layer Cache

```
┌─────────────────────────────────────────┐
│  Memory Cache (Map<string, string>)    │  ← Capa 1: Memoria (Síncrono)
│  - Acceso instantáneo (0ms)             │
│  - Hydratado al iniciar app             │
│  - Sobrevive a unmount/remount          │
└────────────┬────────────────────────────┘
             │ (sincroniza en background)
             ↓
┌─────────────────────────────────────────┐
│  AsyncStorage (React Native)            │  ← Capa 2: Persistente
│  - Persistencia entre sesiones          │
│  - Escrituras asíncronas (no bloquea)   │
│  - Sobrevive a cierre de app            │
└─────────────────────────────────────────┘
```

### 🎬 Hydration al Inicio

```typescript
// Ejecuta INMEDIATAMENTE al cargar el módulo
(async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      const items = await AsyncStorage.multiGet(keys);
      items.forEach(([key, value]) => {
        if (key && value) memoryCache.set(key, value);
      });
    }
    isHydrated = true;
  } catch (error) {
    console.error("Hydration error:", error);
    isHydrated = true; // Continuar aunque falle
  }
})();
```

**Propósito:**
- Cargar TODO AsyncStorage a memoria al iniciar
- Permite lecturas síncronas después de hydration
- `isHydrated` flag indica cuándo está listo

**Timing:**
- Hydration ocurre antes de que React monte componentes
- Primera lectura siempre espera hydration (waitForHydration)

### 🔧 Storage Wrapper

```typescript
const storage = {
  getString: (key: string): string | undefined => {
    return memoryCache.get(key);  // Lectura síncrona de memoria
  },

  set: (key: string, value: string): void => {
    memoryCache.set(key, value);  // Escritura inmediata en memoria
    // Persistir en background (no bloqueante)
    AsyncStorage.setItem(key, value).catch((e) =>
      console.error("AsyncStorage write error:", e)
    );
  },

  delete: (key: string): void => {
    memoryCache.delete(key);
    AsyncStorage.removeItem(key).catch((e) =>
      console.error("AsyncStorage delete error:", e)
    );
  },

  clearAll: (): void => {
    memoryCache.clear();
    AsyncStorage.clear();
  },

  getAllKeys: (): string[] => {
    return Array.from(memoryCache.keys());
  },

  contains: (key: string): boolean => {
    return memoryCache.has(key);
  },
};
```

**Ventajas:**
- Lecturas síncronas (no await necesario)
- Escrituras instantáneas (UI no espera)
- Persistencia garantizada en background

### 📦 Tipos de Datos

```typescript
interface LocalTrick {
  id: string;
  title: string;
  effect: string;
  secret: string;
  duration: number | null;
  reset: number | null;
  difficulty: number | null;
  angles: string[];
  notes: string;
  photo_url: string | null;
  effect_video_url: string | null;
  secret_video_url: string | null;
  is_public: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  category_ids: string[];      // Junction table normalizada
  tag_ids: string[];          // Junction table normalizada
  is_favorite: boolean;       // Combinado de user_favorites
  photos: string[];           // Array de URLs adicionales
  _pendingSync?: boolean;     // Flag offline: pendiente sincronizar
  _isLocalOnly?: boolean;     // Flag offline: solo existe en local
}

interface LocalCategory {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  _pendingSync?: boolean;
  _isLocalOnly?: boolean;
}

interface LocalUserData {
  userId: string;
  categories: LocalCategory[];
  tricks: LocalTrick[];
  lastSync: number;           // Timestamp de última sincronización
  version: number;            // Versión de schema (para migraciones)
}
```

**Flags de Offline:**
- `_pendingSync`: Modificado offline, pendiente de sincronizar
- `_isLocalOnly`: Creado offline, aún no existe en servidor

### 🔑 Keys Strategy

```typescript
private userDataKey(userId: string): string {
  return `user_data:${userId}:v${this.CURRENT_VERSION}`;
}

private lastUserKey(): string {
  return "last_user_id";
}
```

**Formato:**
- `user_data:abc123:v2` → Datos del usuario con versión
- `last_user_id` → Último usuario que hizo login

**Versioning:**
- `CURRENT_VERSION = 2`
- Si cambias estructura de datos → Incrementa versión
- Datos de versiones antiguas se ignoran (auto-migración)

### 📖 Funciones Core

#### 1. **getUserData(userId: string)**
```typescript
async getUserData(userId: string): Promise<LocalUserData | null> {
  await this.waitForHydration();  // Esperar hasta que hydration termine

  try {
    const key = this.userDataKey(userId);
    const raw = storage.getString(key);  // Lectura síncrona

    if (!raw) return null;

    const data = JSON.parse(raw) as LocalUserData;

    // Validar estructura
    if (!data.userId || !Array.isArray(data.categories) || !Array.isArray(data.tricks)) {
      console.warn("Invalid cache structure");
      return null;
    }

    console.log(`Cache hit: ${data.tricks.length} tricks, ${data.categories.length} categories`);
    return data;
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
}
```

**Flujo:**
1. Esperar hydration (solo la primera vez, después es instantáneo)
2. Leer de memoria (síncrono)
3. Parse JSON
4. Validar estructura
5. Retornar datos o null

**Uso:**
- LibraryDataContext.loadData() lo llama primero
- Usuario ve datos inmediatamente si existen

#### 2. **saveUserData(data: LocalUserData)**
```typescript
saveUserData(data: LocalUserData): boolean {
  try {
    const key = this.userDataKey(data.userId);

    const validatedData: LocalUserData = {
      userId: data.userId,
      categories: data.categories || [],
      tricks: data.tricks || [],
      lastSync: data.lastSync || Date.now(),
      version: this.CURRENT_VERSION,
    };

    storage.set(key, JSON.stringify(validatedData));  // Memoria + AsyncStorage
    storage.set(this.lastUserKey(), data.userId);

    console.log(`Saved: ${validatedData.tricks.length} tricks, ${validatedData.categories.length} categories`);
    return true;
  } catch (error) {
    console.error("Error saving cache:", error);
    return false;
  }
}
```

**Propósito:**
- Guardar dataset completo
- Validar y normalizar datos
- Actualizar lastSync timestamp

**Uso:**
- Después de fetch desde Supabase
- Después de modificaciones locales

#### 3. **toggleFavorite(userId, trickId)**
```typescript
toggleFavorite(userId: string, trickId: string): boolean {
  const existing = memoryCache.get(this.userDataKey(userId));
  if (!existing) return false;

  const data = JSON.parse(existing) as LocalUserData;

  // Toggle is_favorite en el truco específico
  const updatedTricks = data.tricks.map((trick) =>
    trick.id === trickId
      ? { ...trick, is_favorite: !trick.is_favorite }
      : trick
  );

  return this.saveUserData({
    ...data,
    tricks: updatedTricks,
    lastSync: Date.now(),
  });
}
```

**Optimistic Update:**
- Actualiza memoria inmediatamente
- LibraryDataContext actualiza UI antes de llamar Supabase
- Si Supabase falla → Revertir con otro toggle

#### 4. **updateTrick(userId, trickId, updates, markPending)**
```typescript
updateTrick(
  userId: string,
  trickId: string,
  updates: Partial<LocalTrick>,
  markPending = false  // true si es modificación offline
): boolean {
  const existing = memoryCache.get(this.userDataKey(userId));
  if (!existing) return false;

  const data = JSON.parse(existing) as LocalUserData;

  const updatedTricks = data.tricks.map((trick) =>
    trick.id === trickId
      ? {
          ...trick,
          ...updates,
          updated_at: new Date().toISOString(),
          _pendingSync: markPending ? true : trick._pendingSync
        }
      : trick
  );

  return this.saveUserData({
    ...data,
    tricks: updatedTricks,
    lastSync: Date.now(),
  });
}
```

**Parámetro markPending:**
- `false` (default): Actualización sincronizada
- `true`: Modificación offline, marcar para sincronizar después

#### 5. **deleteTrick(userId, trickId)**
```typescript
deleteTrick(userId: string, trickId: string): boolean {
  const existing = memoryCache.get(this.userDataKey(userId));
  if (!existing) return false;

  const data = JSON.parse(existing) as LocalUserData;
  const updatedTricks = data.tricks.filter((trick) => trick.id !== trickId);

  return this.saveUserData({
    ...data,
    tricks: updatedTricks,
    lastSync: Date.now(),
  });
}
```

#### 6. **deleteCategory(userId, categoryId)**
```typescript
deleteCategory(userId: string, categoryId: string): boolean {
  const existing = memoryCache.get(this.userDataKey(userId));
  if (!existing) return false;

  const data = JSON.parse(existing) as LocalUserData;

  // Eliminar categoría
  const updatedCategories = data.categories.filter((cat) => cat.id !== categoryId);

  // Remover categoryId de todos los trucos
  const updatedTricks = data.tricks.map((trick) => ({
    ...trick,
    category_ids: trick.category_ids.filter((id) => id !== categoryId),
  }));

  return this.saveUserData({
    ...data,
    categories: updatedCategories,
    tricks: updatedTricks,
    lastSync: Date.now(),
  });
}
```

**Importante:** Al eliminar categoría, también la remueve de todos los trucos

### 📡 Funciones para Offline Sync

#### 1. **getPendingTricks(userId)**
```typescript
getPendingTricks(userId: string): LocalTrick[] {
  const existing = memoryCache.get(this.userDataKey(userId));
  if (!existing) return [];

  const data = JSON.parse(existing) as LocalUserData;
  return data.tricks.filter((t) => t._pendingSync || t._isLocalOnly);
}
```

**Uso:** Obtener trucos que necesitan sincronizarse con servidor

#### 2. **clearPendingFlags(userId, trickIds, categoryIds)**
```typescript
clearPendingFlags(userId: string, trickIds: string[], categoryIds: string[]): boolean {
  const existing = memoryCache.get(this.userDataKey(userId));
  if (!existing) return false;

  const data = JSON.parse(existing) as LocalUserData;

  // Remover flags _pendingSync y _isLocalOnly
  const updatedTricks = data.tricks.map((trick) => {
    if (trickIds.includes(trick.id)) {
      const { _pendingSync, _isLocalOnly, ...rest } = trick;
      return rest as LocalTrick;
    }
    return trick;
  });

  const updatedCategories = data.categories.map((cat) => {
    if (categoryIds.includes(cat.id)) {
      const { _pendingSync, _isLocalOnly, ...rest } = cat;
      return rest as LocalCategory;
    }
    return cat;
  });

  return this.saveUserData({
    ...data,
    tricks: updatedTricks,
    categories: updatedCategories,
  });
}
```

**Uso:** Después de sincronizar exitosamente con servidor

### 🔧 Funciones de Utilidad

#### **getDebugInfo(userId?)**
```typescript
getDebugInfo(userId?: string): any {
  const info: any = {
    lastUserId: this.getLastUserId(),
    totalKeys: storage.getAllKeys().length,
    allKeys: storage.getAllKeys(),
    isHydrated,
    storageType: "AsyncStorage + Memory",
  };

  if (userId) {
    const key = this.userDataKey(userId);
    const raw = storage.getString(key);
    if (raw) {
      const data = JSON.parse(raw) as LocalUserData;
      const pendingTricks = data.tricks.filter((t) => t._pendingSync || t._isLocalOnly);
      const pendingCategories = data.categories.filter((c) => c._pendingSync || c._isLocalOnly);

      info.userData = {
        tricksCount: data.tricks.length,
        categoriesCount: data.categories.length,
        pendingTricksCount: pendingTricks.length,
        pendingCategoriesCount: pendingCategories.length,
        lastSync: new Date(data.lastSync).toISOString(),
        version: data.version,
      };
    }
  }

  return info;
}
```

**Uso:** Debug, mostrar estado del cache

#### **exportUserData(userId) / importUserData(jsonString)**
```typescript
exportUserData(userId: string): string | null {
  const key = this.userDataKey(userId);
  const raw = storage.getString(key);
  return raw || null;
}

importUserData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString) as LocalUserData;
    return this.saveUserData(data);
  } catch (error) {
    console.error("Error importing data:", error);
    return false;
  }
}
```

**Uso:** Backup/restore de datos del usuario

### 🚀 Cache In-Memory Adicional (Short-lived)

```typescript
interface InMemoryCache {
  sections: CategorySection[] | null;
  categories: LocalCategory[] | null;
  userId: string | null;
  timestamp: number;
}

let inMemoryCache: InMemoryCache = {
  sections: null,
  categories: null,
  userId: null,
  timestamp: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
```

**Propósito:**
- Cache adicional para `sections` ya procesadas (buildSections es costoso)
- TTL de 5 minutos
- Sobrevive a unmount/remount de componentes

**Funciones:**
- `getInMemoryCache(userId)` → Obtener si válido
- `setInMemoryCache(userId, sections, categories)` → Guardar
- `clearInMemoryCache()` → Limpiar

### ⚡ Ventajas del Sistema

1. **Acceso Síncono:**
   - Lecturas instantáneas (0ms)
   - No necesita await en contextos síncronos

2. **Escrituras No Bloqueantes:**
   - UI actualiza inmediatamente
   - Persistencia ocurre en background

3. **Hydration Automático:**
   - AsyncStorage se carga a memoria al inicio
   - Primera lectura siempre tiene datos

4. **Singleton Pattern:**
   - Una sola instancia compartida
   - Estado consistente en toda la app

5. **Versionado:**
   - Migraciones automáticas
   - Datos de versiones antiguas se ignoran

6. **Offline Support:**
   - Flags `_pendingSync` y `_isLocalOnly`
   - Sync posterior cuando hay conexión

### 🔌 Uso

```typescript
import { localDataService } from '../services/LocalDataService';

// En LibraryDataContext:
const cachedData = await localDataService.getUserData(userId);
if (cachedData) {
  // Usuario ve datos inmediatamente
  setTricks(cachedData.tricks);
  setCategories(cachedData.categories);
}

// Después de fetch de red:
localDataService.saveUserData({ userId, categories, tricks, ... });

// Toggle favorito (optimistic):
localDataService.toggleFavorite(userId, trickId);
```

---

## 🌐 SupabaseDataService - Servicio de API

**Archivo:** `services/SupabaseDataService.ts`

### 🎯 Propósito
Servicio que maneja toda la comunicación con Supabase (PostgreSQL). Implementa queries optimizadas, relaciones normalizadas y manejo de errores.

### 📖 Funciones Principales

#### 1. **fetchAllUserData(userId)**
```typescript
async fetchAllUserData(userId: string): Promise<{
  categories: LocalCategory[];
  tricks: LocalTrick[];
}> {
  try {
    // Fetch en paralelo (3 queries simultáneas)
    const [categoriesResult, tricksResult, favoritesResult] = await Promise.all([
      this.fetchCategories(userId),
      this.fetchTricks(userId),
      this.fetchFavorites(userId),
    ]);

    const favoriteIds = new Set(favoritesResult);

    // Combinar favoritos con trucos
    const tricksWithFavorites = tricksResult.map((trick) => ({
      ...trick,
      is_favorite: favoriteIds.has(trick.id),
    }));

    console.log(`Fetched: ${tricksWithFavorites.length} tricks, ${categoriesResult.length} categories`);

    return {
      categories: categoriesResult,
      tricks: tricksWithFavorites,
    };
  } catch (error) {
    console.error("Error fetching all data:", error);
    throw error;
  }
}
```

**Optimización:**
- `Promise.all` ejecuta 3 queries en paralelo
- Más rápido que secuencial (3x speed up)

**Datos Combinados:**
- Trucos con categorías (join via trick_categories)
- Trucos con tags (join via trick_tags)
- Trucos con fotos adicionales (join via trick_photos)
- Trucos con favoritos (join via user_favorites)

#### 2. **fetchTricks(userId)** (Private)
```typescript
private async fetchTricks(userId: string): Promise<LocalTrick[]> {
  const { data, error } = await supabase
    .from("magic_tricks")
    .select(`
      *,
      trick_categories(category_id),
      trick_tags(tag_id)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Cargar fotos adicionales en una query separada optimizada
  const trickIds = (data || []).map((t) => t.id);
  const photosMap = new Map<string, string[]>();

  if (trickIds.length > 0) {
    const { data: photosData } = await supabase
      .from("trick_photos")
      .select("trick_id, photo_url")
      .in("trick_id", trickIds);

    if (photosData) {
      photosData.forEach((p) => {
        if (!photosMap.has(p.trick_id)) {
          photosMap.set(p.trick_id, []);
        }
        photosMap.get(p.trick_id)!.push(p.photo_url);
      });
    }
  }

  return (data || []).map((trick) => {
    // Parse angles (puede ser string JSON o array)
    let angles: string[] = [];
    if (Array.isArray(trick.angles)) {
      angles = trick.angles;
    } else if (typeof trick.angles === "string") {
      try {
        angles = JSON.parse(trick.angles);
      } catch {
        angles = [];
      }
    }

    const category_ids = (trick.trick_categories || []).map((tc: any) => tc.category_id);
    const tag_ids = (trick.trick_tags || []).map((tt: any) => tt.tag_id);
    const photos = photosMap.get(trick.id) || [];

    return {
      id: trick.id,
      title: trick.title || "Sin título",
      effect: trick.effect || "",
      secret: trick.secret || "",
      duration: trick.duration ?? null,
      reset: trick.reset ?? null,
      difficulty: trick.difficulty ?? null,
      angles,
      notes: trick.notes || "",
      photo_url: trick.photo_url || null,
      effect_video_url: trick.effect_video_url || null,
      secret_video_url: trick.secret_video_url || null,
      is_public: trick.is_public ?? false,
      status: trick.status || "draft",
      created_at: trick.created_at,
      updated_at: trick.updated_at || trick.created_at,
      user_id: trick.user_id,
      category_ids,  // Normalizado desde junction table
      tag_ids,       // Normalizado desde junction table
      is_favorite: false,  // Se combina después con fetchFavorites
      photos,        // Array de URLs adicionales
    };
  });
}
```

**Optimizaciones:**
1. **Select con joins:** Una query para trucos + relaciones
2. **Photos en query separada:** Evita N+1 queries
3. **Map para fotos:** Agrupa photos por trick_id eficientemente

**Normalización:**
- Junction tables (`trick_categories`, `trick_tags`) → Arrays planos
- Fotos múltiples agrupadas por trick

### 🔄 CRUD Operations

Las funciones CRUD siguen en SupabaseDataService. El servicio maneja:
- `createCategory()`, `updateCategory()`, `deleteCategory()`
- `createTrick()`, `updateTrick()`, `deleteTrick()`
- `toggleFavorite()`
- `fetchModifiedSince()` para sync incremental

### 🔌 Uso

```typescript
import { supabaseDataService } from '../services/SupabaseDataService';

// En LibraryDataContext:
const { categories, tricks } = await supabaseDataService.fetchAllUserData(userId);
localDataService.saveUserData({ userId, categories, tricks, ... });
```

---

## 📹 CloudflareStreamService - Servicio de Video Streaming

**Archivo:** `services/cloudflare/CloudflareStreamService.ts`

### 🎯 Propósito
Servicio que maneja la subida de videos a **Cloudflare Stream** usando el protocolo **TUS** (resumable uploads). Permite subir videos grandes (hasta 30GB) con reintentos automáticos y tracking de progreso.

### 🔧 Configuración

```typescript
constructor() {
  this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  this.apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN || '';
  this.customerSubdomain = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN || '';
  this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;
}
```

**Variables de Entorno Requeridas:**
- `CLOUDFLARE_ACCOUNT_ID` → ID de cuenta Cloudflare
- `CLOUDFLARE_STREAM_API_TOKEN` → API Token con permisos Stream
- `CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN` → Subdominio custom (ej: `customer-xyz.cloudflarestream.com`)

### 📤 uploadVideo() - Función Principal

```typescript
async uploadVideo(
  videoUri: string,
  metadata?: { name?: string; userId?: string; trickId?: string },
  onProgress?: (progress: number) => void
): Promise<StreamVideoUploadResult>
```

**Flujo Completo (Protocolo TUS):**

```
1. Validación
   ├─ isConfigured() → Verificar credenciales
   └─ FileSystem.getInfoAsync() → Obtener tamaño
         ↓
2. Calcular timeout dinámico
   estimatedTime = max(120s, ceil(fileSize / 10MB) * 30s)
         ↓
3. POST: Crear sesión TUS
   URL: https://api.cloudflare.com/.../stream?direct_user=true
   Headers:
     • Authorization: Bearer {token}
     • Tus-Resumable: 1.0.0
     • Upload-Length: {fileSize}
     • Upload-Metadata: name {base64}, userId {base64}
   Response: Header "Location" → Upload URL
         ↓
4. PATCH: Upload con FileSystem.createUploadTask()
   Headers:
     • Tus-Resumable: 1.0.0
     • Upload-Offset: 0
     • Content-Type: application/offset+octet-stream
   Progress callback cada ~100ms
         ↓
5. Timeout Management (Dual)
   ├─ Sin progreso: 60s (reseteable)
   └─ Absoluto: min(estimated, 600s)
         ↓
6. Obtener Video ID del header "stream-media-id"
         ↓
7. Construir URLs:
   • HLS: https://{subdomain}/{videoId}/manifest/video.m3u8
   • Thumbnail: https://{subdomain}/{videoId}/thumbnails/thumbnail.jpg
   • DASH: https://{subdomain}/{videoId}/manifest/video.mpd
```

**Reintentos con Exponential Backoff:**
```typescript
const MAX_RETRIES = 3;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    // ... upload
  } catch (error) {
    if (attempt === MAX_RETRIES) break;
    const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}
```

**Ventajas del Protocolo TUS:**
- **Resumable:** Continúa desde donde quedó si falla
- **Chunked:** Sube en chunks (mejor para redes inestables)
- **Progress:** Tracking preciso en tiempo real
- **Large files:** Hasta 30GB sin problemas

### 🔌 Uso

```typescript
const streamService = new CloudflareStreamService();

const result = await streamService.uploadVideo(
  videoUri,
  { name: 'Effect Video', userId, trickId },
  (progress) => setUploadProgress(progress)
);

if (result.success) {
  await supabase.from('magic_tricks')
    .update({ effect_video_url: result.playbackUrl })
    .eq('id', trickId);
}
```

---

## 🎞️ VideoService - Servicio de Compresión

**Archivo:** `services/videoService.ts`

### 🎯 Propósito
Compresión local de videos con **react-native-compressor** antes de subir. Crítico para videos >200MB para reducir tiempo de upload.

### ⚙️ Detección de Entorno

```typescript
const isExpoGo = Constants.appOwnership === "expo";

let Video: any = null;
if (!isExpoGo) {
  const compressor = require("react-native-compressor");
  Video = compressor.Video;
}
```

**Limitaciones:**
- **Expo Go:** NO soporta módulos nativos → Sin compresión
- **Dev Client:** Soporta nativos → Compresión disponible

### 🗜️ compressVideo()

```typescript
async compressVideo(
  inputUri: string,
  quality: "low" | "medium" | "high" = "medium"
): Promise<string>
```

**Bitrates (basados en estándares YouTube):**
- **Low:** 3 Mbps (SD/720p)
- **Medium:** 6.5 Mbps (1080p 30fps) ← Default
- **High:** 10 Mbps (1080p 60fps / 4K)

**Flujo:**
```
1. Verificar Video module disponible
         ↓
2. Obtener fileSize original
         ↓
3. Video.compress(uri, { bitrate, minimumBitrate })
         ↓
4. Calcular reducción %
         ↓
5. Si reducción < 10% → Usar original (inefectivo)
   Else → Return comprimido
```

**Logs:**
```
📊 Archivo original: 245.3 MB
🎯 Bitrate objetivo: 6.5 Mbps
✅ Compresión completada en 42.1s
   • Tamaño final: 89.7 MB
   • Reducción: 63.4%
```

---

## 📤 FileUploadService - Upload Genérico

**Archivo:** `services/fileUploadService.ts`

### 📏 Límites

```typescript
FILE_SIZE_LIMITS = {
  VIDEO_MAX: 30000,           // 30GB (Cloudflare Stream)
  VIDEO_RECOMMENDED: 200,     // >200MB → Analizar compresión
  IMAGE_MAX: 100,             // 100MB (Cloudflare Images)
  IMAGE_RECOMMENDED: 10,      // 10MB recomendado
}
```

### 🎬 Flujo Upload Video Completo

```
1. requestMediaLibraryPermissions()
         ↓
2. getFileInfo(uri) → Tamaño
         ↓
3. Si >200MB:
   ├─ videoAnalysisService.analyzeVideo()
   │  └─ Determina si necesita compresión (bitrate)
   └─ videoService.compressVideo(uri, quality)
         ↓
4. cloudflareStreamService.uploadVideo(uri, metadata, onProgress)
   ├─ TUS protocol
   └─ Reintentos automáticos (3x)
         ↓
5. Cloudflare procesa (~5-10s)
   ├─ Genera thumbnail
   ├─ Transcodifica HLS/DASH
   └─ URLs disponibles
         ↓
6. Return { url, thumbnailUrl, variants }
```

### 📱 Platform-Specific

**iOS:** Base64 → ArrayBuffer
**Android:** Fetch → Blob

### 🔌 Uso Integrado

```typescript
// Análisis + Compresión + Upload
let finalUri = videoUri;
if (fileSize > 200) {
  const analysis = await videoAnalysisService.analyzeVideo(videoUri);
  if (analysis.needsCompression) {
    finalUri = await videoService.compressVideo(videoUri, analysis.quality);
  }
}

const result = await uploadFileToStorage(finalUri, userId, 'videos', 'video/mp4', onProgress);

if (result.url) {
  await supabase.from('magic_tricks')
    .update({ effect_video_url: result.url })
    .eq('id', trickId);

  // Reload después de 8s (Cloudflare processing)
  setTimeout(() => router.replace(`/(app)/trick/${trickId}`), 8000);
}
```

---

## 🔍 HybridSearchService - Búsqueda Inteligente

**Archivo:** `services/HybridSearchService.ts`

### 🎯 Estrategia Híbrida

El servicio decide automáticamente entre búsqueda en **cliente** (JavaScript) o **servidor** (PostgreSQL FTS) basado en la cantidad de datos:

```typescript
HYBRID_THRESHOLD = 1; // Actualmente configurado para SIEMPRE usar servidor

shouldUseServerSearch(tricksCount: number): boolean {
  return tricksCount >= HYBRID_THRESHOLD;
}
```

**Rationale:**
- **< 500 trucos**: Búsqueda en cliente (instantánea, sin latencia de red)
- **≥ 500 trucos**: Búsqueda en servidor (índices GIN, procesamiento distribuido)

### 🖥️ Búsqueda en Servidor

```typescript
async searchOnServer(
  userId: string,
  query: string,
  filters?: SearchFilters
): Promise<LocalTrick[]>
```

**Flujo:**
```
1. Construir query base (magic_tricks + joins)
         ↓
2. Si hay query texto:
   └─ .filter('search_vector', 'fts', websearch_to_tsquery('simple', query))
         ↓
3. Aplicar filtros:
   ├─ categories (IN)
   ├─ difficulties (IN)
   ├─ durations (GTE/LTE)
   ├─ resetTimes (GTE/LTE)
   └─ angles (JSONB @> '[\"angle\"]')
         ↓
4. Ordenar (created_at ASC/DESC)
         ↓
5. Ejecutar query
         ↓
6. Transformar a LocalTrick[]
```

**Query Supabase:**
```typescript
let supabaseQuery = supabase
  .from("magic_tricks")
  .select(`
    *,
    trick_categories!inner(category_id),
    trick_tags(tag_id),
    user_favorites(id)
  `)
  .eq("user_id", userId);

// Full-Text Search con índice GIN
if (query.trim()) {
  const sanitizedQuery = query.trim().replace(/'/g, "''");
  supabaseQuery = supabaseQuery.filter(
    'search_vector',
    'fts',
    `websearch_to_tsquery('simple', '${sanitizedQuery}')`
  );
}

// Filtro JSONB para ángulos
if (filters?.angles && filters.angles.length > 0) {
  const anglesConditions = filters.angles.map(angle =>
    `angles @> '["${angle}"]'`
  );
  supabaseQuery = supabaseQuery.or(anglesConditions.join(','));
}
```

**Características:**
- **FTS Multi-idioma:** Usa configuración `'simple'` (español, inglés, otros)
- **websearch_to_tsquery:** Sintaxis tipo Google (`"carta OR mazo"`, `"carta -baraja"`)
- **JSONB Contains:** Búsqueda eficiente en arrays JSON con índice GIN
- **Sanitización SQL:** Escapa comillas simples para prevenir inyección

### 🔄 hybridSearch() - Wrapper Principal

```typescript
async hybridSearch(
  userId: string,
  allTricks: LocalTrick[],
  query: string,
  filters?: SearchFilters
): Promise<{ tricks: LocalTrick[], usedServer: boolean }>
```

**Decisión Automática:**
```typescript
const tricksCount = allTricks.length;
const useServer = this.shouldUseServerSearch(tricksCount);

if (useServer) {
  const tricks = await this.searchOnServer(userId, query, filters);
  return { tricks, usedServer: true };
} else {
  // Búsqueda en cliente (buildSections en LibraryDataContext)
  return { tricks: allTricks, usedServer: false };
}
```

### 📊 Comparación Cliente vs Servidor

| Aspecto | Cliente (JS) | Servidor (PostgreSQL) |
|---------|--------------|----------------------|
| **Velocidad** | Instantánea (0ms) | ~100-500ms (red + BD) |
| **Escalabilidad** | O(n) - Lento >500 items | O(log n) - Rápido millones |
| **Índices** | No usa índices | GIN en search_vector, angles |
| **Capacidad** | Limitada por RAM | Limitada por servidor |
| **Offline** | ✅ Funciona | ❌ Requiere conexión |
| **Sintaxis** | Búsqueda simple | Operadores avanzados (OR, -, "") |

### 🧩 Integración con LibraryDataContext

**En buildSections():**
```typescript
// Si hay query de búsqueda Y tenemos muchos trucos
if (query && tricks.length >= HYBRID_THRESHOLD) {
  const { tricks: searchedTricks } = await hybridSearchService.hybridSearch(
    userId,
    tricks,
    query,
    filters
  );
  tricks = searchedTricks;
} else {
  // Búsqueda en cliente (filtrado manual)
  tricks = tricks.filter(trick =>
    trick.title.toLowerCase().includes(query.toLowerCase()) ||
    trick.effect.toLowerCase().includes(query.toLowerCase())
  );
}
```

---

## 🎯 TrickService - CRUD con Offline-First

**Archivo:** `services/trickService.ts`

### 🌟 Características Principales

- **Offline-First:** Actualiza cache local inmediatamente, sincroniza servidor en background
- **Optimistic Updates:** UI responde instantáneamente
- **Queue System:** Encola operaciones cuando no hay conexión
- **Junction Tables:** Maneja relaciones many-to-many automáticamente

### 📖 getCompleteTrick()

```typescript
async getCompleteTrick(
  trickId: string,
  userId: string
): Promise<LocalTrick | null>
```

**Joins Completos:**
```typescript
const { data, error } = await supabase
  .from("magic_tricks")
  .select(`
    *,
    trick_categories!inner(category_id),
    trick_tags(tag_id),
    trick_photos(
      id,
      photo_url,
      display_order,
      created_at
    ),
    user_favorites(id)
  `)
  .eq("id", trickId)
  .eq("user_id", userId)
  .single();

// Transform to LocalTrick
return {
  ...data,
  category_ids: data.trick_categories.map(tc => tc.category_id),
  tag_ids: data.trick_tags.map(tt => tt.tag_id),
  photos: data.trick_photos.sort((a, b) => a.display_order - b.display_order),
  is_favorite: data.user_favorites?.length > 0,
};
```

**Uso:**
```typescript
// En TrickViewScreen, garantiza datos completos con fotos
const completeTrick = await trickService.getCompleteTrick(trickId, userId);
```

### 🔄 updateIsPublic() - Patrón Offline-First

```typescript
async updateIsPublic(
  trickId: string,
  isPublic: boolean,
  userId: string
): Promise<boolean>
```

**Flujo Completo:**
```
1. localDataService.updateTrick(userId, trickId, { is_public })
   └─ Actualiza cache (memoria + AsyncStorage) INSTANTÁNEAMENTE
         ↓
2. if (!networkMonitorService.isOnline()):
   └─ offlineQueueService.enqueue({
        type: "update_trick",
        payload: { trickId, data: { is_public: isPublic } }
      })
   └─ return true (UI ya está actualizada)
         ↓
3. if (online):
   └─ try:
        supabase.from("magic_tricks")
          .update({ is_public: isPublic })
          .eq("id", trickId)
          .eq("user_id", userId)
      catch:
        └─ Encolar para reintentar (max 3 intentos)
```

**Garantías:**
- UI **siempre** responde inmediatamente (optimistic update)
- Cache local **siempre** se actualiza primero
- Operación **nunca se pierde** (queue persistente en AsyncStorage)
- Reintentos automáticos con exponential backoff

### 🗑️ deleteTrick() - Limpieza Completa

```typescript
async deleteTrick(trickId: string, userId: string): Promise<boolean>
```

**Flujo de Eliminación:**
```
1. Obtener trick completo (para URLs de archivos)
         ↓
2. Eliminar archivos de Cloudflare:
   ├─ effect_video_url → CloudflareStreamService.deleteVideo()
   ├─ secret_video_url → CloudflareStreamService.deleteVideo()
   ├─ photo_url → CloudflareImagesService.deleteImage()
   └─ trick_photos[].photo_url → Loop + deleteImage()
         ↓
3. Eliminar junction tables:
   ├─ DELETE FROM trick_categories WHERE trick_id
   ├─ DELETE FROM trick_tags WHERE trick_id
   ├─ DELETE FROM trick_photos WHERE trick_id
   └─ DELETE FROM user_favorites WHERE trick_id
         ↓
4. Eliminar registro principal:
   └─ DELETE FROM magic_tricks WHERE id = trickId
         ↓
5. Actualizar cache local:
   └─ localDataService.removeTrick(userId, trickId)
```

**Manejo de Errores:**
```typescript
try {
  // Intentar eliminar archivos
  await Promise.all([
    deleteVideoIfExists(effect_video_url),
    deleteVideoIfExists(secret_video_url),
    deleteImageIfExists(photo_url),
    ...photos.map(p => deleteImageIfExists(p.photo_url))
  ]);
} catch (error) {
  console.warn("Some files failed to delete, continuing...");
  // NO bloquea la eliminación del truco
}

// Continuar con eliminación de BD (crítico)
const { error } = await supabase
  .from("magic_tricks")
  .delete()
  .eq("id", trickId);

if (error) throw error;
```

**Orden de Operaciones:**
1. Archivos primero (no crítico si falla)
2. Junctions después (crítico)
3. Registro principal al final (más crítico)

---

## 🔄 OfflineSyncContext - Gestión de Sincronización

**Archivo:** `context/OfflineSyncContext.tsx`

### 🎯 Propósito

Coordina la sincronización automática entre cache local y servidor cuando hay conexión a internet disponible.

### 📦 Estado Global

```typescript
interface OfflineSyncState {
  isOnline: boolean;              // Estado de conectividad
  isSyncing: boolean;             // Sincronización en progreso
  pendingOperations: number;      // Operaciones pendientes en queue
  lastSyncTime: Date | null;      // Última sync exitosa
}
```

### 🔌 Hooks de Auto-Sync

**1. Network Reconnection:**
```typescript
useEffect(() => {
  const unsubscribe = networkMonitorService.addListener((online) => {
    setIsOnline(online);

    if (online && user) {
      console.log("📡 Network restored - auto-syncing...");
      performSync(user.id);
    }
  });

  return unsubscribe;
}, [user]);
```

**2. App Foreground Transition:**
```typescript
useEffect(() => {
  const subscription = AppState.addEventListener("change", (nextAppState) => {
    if (appState === "background" && nextAppState === "active") {
      console.log("🔄 App foregrounded - checking for pending sync...");
      if (isOnline && user && pendingOperations > 0) {
        performSync(user.id);
      }
    }
    setAppState(nextAppState);
  });

  return () => subscription.remove();
}, [appState, isOnline, user, pendingOperations]);
```

**3. Manual Trigger:**
```typescript
const syncNow = async () => {
  if (!user || !isOnline) return;
  await performSync(user.id);
};
```

### ⚙️ performSync()

```typescript
const performSync = async (userId: string) => {
  if (isSyncing) return; // Prevenir sync concurrente

  setIsSyncing(true);

  try {
    await offlineQueueService.sync(userId);

    // Actualizar contador de operaciones pendientes
    const pending = await offlineQueueService.getPendingCount(userId);
    setPendingOperations(pending);

    setLastSyncTime(new Date());
  } catch (error) {
    console.error("Sync failed:", error);
  } finally {
    setIsSyncing(false);
  }
};
```

### 🧩 Integración en Componentes

```typescript
import { useOfflineSync } from './context/OfflineSyncContext';

function MyComponent() {
  const { isOnline, syncNow, pendingOperations, isSyncing } = useOfflineSync();

  const handleSensitiveOperation = () => {
    if (!isOnline) {
      Alert.alert("Offline", "Esta operación requiere conexión a internet");
      return;
    }
    // Proceder...
  };

  return (
    <View>
      <OfflineIndicator />
      {pendingOperations > 0 && (
        <TouchableOpacity onPress={syncNow}>
          <Text>Sync {pendingOperations} operaciones pendientes</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

---

## 📋 OfflineQueue - Sistema de Cola Persistente

**Archivo:** `lib/offlineQueue.ts`

### 🗂️ Estructura de Operaciones

```typescript
interface QueueOperation {
  id: string;                          // UUID
  userId: string;                      // Propietario
  type: OperationType;                 // create_trick | update_trick | delete_trick | etc.
  payload: any;                        // Datos específicos de la operación
  timestamp: number;                   // Date.now() (orden cronológico)
  status: "pending" | "syncing" | "failed" | "completed";
  retryCount: number;                  // Intentos fallidos (max 3)
  lastError?: string;                  // Último mensaje de error
}

type OperationType =
  | "create_trick"
  | "update_trick"
  | "delete_trick"
  | "toggle_favorite"
  | "create_category"
  | "update_category"
  | "delete_category";
```

### ➕ enqueue() - Agregar Operación

```typescript
async enqueue(operation: {
  userId: string;
  type: OperationType;
  payload: any;
}): Promise<void>
```

**Flujo:**
```
1. Generar UUID único
         ↓
2. Crear QueueOperation:
   { id, userId, type, payload, timestamp, status: "pending", retryCount: 0 }
         ↓
3. Obtener queue actual de AsyncStorage
         ↓
4. Agregar operación al final
         ↓
5. Persistir queue actualizada:
   AsyncStorage.setItem(`offline_queue_${userId}`, JSON.stringify(queue))
```

**Uso Típico:**
```typescript
// En trickService.updateIsPublic()
if (!networkMonitorService.isOnline()) {
  await offlineQueueService.enqueue({
    userId,
    type: "update_trick",
    payload: {
      trickId,
      data: { is_public: isPublic }
    }
  });
  return true;
}
```

### 🔄 sync() - Procesar Cola

```typescript
async sync(userId: string): Promise<void>
```

**Algoritmo:**
```
1. Obtener todas las operaciones con status="pending"
         ↓
2. Ordenar por timestamp (cronológico)
         ↓
3. Para cada operación:
   ├─ Cambiar status a "syncing"
   ├─ executeOperation(operation)
   │  ├─ Success:
   │  │  └─ Eliminar de queue
   │  └─ Error:
   │     ├─ retryCount++
   │     ├─ Si retryCount < 3:
   │     │  └─ status = "pending" (reintentará)
   │     └─ Si retryCount >= 3:
   │        └─ status = "failed" (abandonar)
   └─ Persistir cambios
```

**Código Simplificado:**
```typescript
async sync(userId: string): Promise<void> {
  const queue = await this.getQueue(userId);
  const pending = queue.filter(op => op.status === "pending");

  for (const operation of pending) {
    operation.status = "syncing";
    await this.saveQueue(userId, queue);

    try {
      await this.executeOperation(operation);

      // Success: Eliminar de queue
      const index = queue.findIndex(op => op.id === operation.id);
      queue.splice(index, 1);

    } catch (error) {
      operation.retryCount++;
      operation.lastError = error.message;

      if (operation.retryCount >= 3) {
        operation.status = "failed";
        console.error(`Operation ${operation.id} failed permanently`);
      } else {
        operation.status = "pending";
        // Exponential backoff en próximo sync
      }
    }

    await this.saveQueue(userId, queue);
  }
}
```

### ⚡ executeOperation() - Ejecutar Operación

```typescript
private async executeOperation(operation: QueueOperation): Promise<void> {
  switch (operation.type) {
    case "create_trick":
      await supabaseDataService.createTrick(
        operation.userId,
        operation.payload.data
      );
      break;

    case "update_trick":
      await supabase
        .from("magic_tricks")
        .update(operation.payload.data)
        .eq("id", operation.payload.trickId)
        .eq("user_id", operation.userId);
      break;

    case "delete_trick":
      await trickService.deleteTrick(
        operation.payload.trickId,
        operation.userId
      );
      break;

    case "toggle_favorite":
      if (operation.payload.isFavorite) {
        await supabase.from("user_favorites").insert({
          user_id: operation.userId,
          trick_id: operation.payload.trickId
        });
      } else {
        await supabase.from("user_favorites").delete()
          .eq("user_id", operation.userId)
          .eq("trick_id", operation.payload.trickId);
      }
      break;

    case "create_category":
      await supabase.from("user_categories").insert({
        user_id: operation.userId,
        ...operation.payload.data
      });
      break;

    case "update_category":
      await supabase.from("user_categories")
        .update(operation.payload.data)
        .eq("id", operation.payload.categoryId)
        .eq("user_id", operation.userId);
      break;

    case "delete_category":
      await supabase.from("user_categories").delete()
        .eq("id", operation.payload.categoryId)
        .eq("user_id", operation.userId);
      break;

    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
}
```

### 📊 Métodos Auxiliares

**getPendingCount():**
```typescript
async getPendingCount(userId: string): Promise<number> {
  const queue = await this.getQueue(userId);
  return queue.filter(op => op.status === "pending").length;
}
```

**clearFailedOperations():**
```typescript
async clearFailedOperations(userId: string): Promise<void> {
  const queue = await this.getQueue(userId);
  const filtered = queue.filter(op => op.status !== "failed");
  await this.saveQueue(userId, filtered);
}
```

**getFailedOperations():**
```typescript
async getFailedOperations(userId: string): Promise<QueueOperation[]> {
  const queue = await this.getQueue(userId);
  return queue.filter(op => op.status === "failed");
}
```

### 🔒 Persistencia

**AsyncStorage Keys:**
```typescript
`offline_queue_${userId}` → QueueOperation[]
```

**Ejemplo de Queue Persistida:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user123",
    "type": "update_trick",
    "payload": {
      "trickId": "trick456",
      "data": { "is_public": true }
    },
    "timestamp": 1705395600000,
    "status": "pending",
    "retryCount": 0
  },
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "userId": "user123",
    "type": "delete_trick",
    "payload": {
      "trickId": "trick789"
    },
    "timestamp": 1705395800000,
    "status": "failed",
    "retryCount": 3,
    "lastError": "Network request failed"
  }
]
```

### 🎯 Estrategia de Reintentos

**Exponential Backoff (Implementación Futura):**
```typescript
const delay = Math.pow(2, operation.retryCount) * 1000; // 1s, 2s, 4s
await new Promise(resolve => setTimeout(resolve, delay));
```

**Actualmente:** Reintentos inmediatos en próximo sync trigger (network reconnection o app foreground).

---

## 💬 ChatService - Asistente de IA (MMENTO AI)

**Archivo:** `services/chatService.ts`

### 🎯 Propósito

Gestiona todas las operaciones del asistente de IA, incluyendo conversaciones, mensajes, límites de uso, y acciones especiales (registrar trucos, crear categorías/tags).

### 📦 Interfaces Principales

```typescript
interface Conversation {
  id: string;
  title: string;
  folder_id?: string;
  is_pinned: boolean;
  is_archived: boolean;
  message_count: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  audio_url?: string;
  tokens_used: number;
  model_used: string;
  created_at: string;
}

interface UserLimits {
  can_query: boolean;
  queries_today: number;
  queries_limit: number;
  is_plus: boolean;
  is_developer?: boolean; // Límite >1000 = Developer
}
```

### 🔑 Métodos Principales

#### checkUserLimit()

```typescript
async checkUserLimit(userId: string): Promise<UserLimits>
```

**Flujo:**
```
1. Llamar RPC: check_user_ai_limit(p_user_id)
         ↓
2. Obtener: { can_query, queries_today, queries_limit, is_plus }
         ↓
3. Detectar developer: queries_limit > 1000
         ↓
4. Return UserLimits
```

**Límites por Tier:**
- **Free:** 10 queries/día
- **Plus:** 100 queries/día
- **Developer:** ∞ (>1000)

#### sendMessage() - Flujo Completo

```typescript
async sendMessage(
  userId: string,
  conversationId: string,
  content: string,
  audioUrl?: string
): Promise<Message>
```

**Flujo Detallado:**
```
1. checkUserLimit(userId)
   └─ Si !can_query: throw Error("dailyLimitReached")
         ↓
2. Verificar conversación no archivada
   └─ Si is_archived: throw Error("conversationArchived")
         ↓
3. Verificar límite de mensajes (100/conversación)
   └─ Si message_count >= 100: archivar + throw Error("conversationLimitReached")
         ↓
4. INSERT mensaje usuario (ai_messages)
         ↓
5. Obtener historial reciente (últimos 20 mensajes)
         ↓
6. getUserContext(userId) → TODOS los trucos del usuario
   ├─ Trucos con categorías y tags
   ├─ Técnicas
   ├─ Categorías (predefinidas + usuario)
   └─ Tags
         ↓
7. Preparar mensajes para OpenAI:
   ├─ System: getSystemInstructions()
   ├─ System: getMagicTrickPrompt(userContext)
   ├─ Historial (19 mensajes)
   └─ User: content actual
         ↓
8. Seleccionar modelo óptimo (gpt-3.5-turbo, gpt-4, etc.)
         ↓
9. openAI.sendChatCompletion(messages, { model, temperature: 0.7 })
         ↓
10. Procesar acciones especiales en respuesta:
    ├─ GUARDAR_TRUCO → registerTrickFromChat()
    ├─ CREAR_CATEGORIA → createUserCategory()
    └─ CREAR_TAG_CON_COLOR → createUserTag()
         ↓
11. INSERT mensaje assistant (ai_messages)
         ↓
12. incrementUsage(userId, tokensUsed)
         ↓
13. Return assistantMessage
```

### 🎩 registerTrickFromChat() - Registro por IA (Plus Only)

```typescript
async registerTrickFromChat(
  userId: string,
  trickData: any,
  conversationId: string
): Promise<{ success: boolean; trickId?: string; error?: string }>
```

**Requisitos:**
- Usuario **Plus** o **Developer**

**Flujo:**
```
1. Verificar subscription_type IN ('plus', 'developer')
   └─ Si no: return { success: false, error: "registerTrickPlusOnly" }
         ↓
2. Generar UUID para trick
         ↓
3. RPC: create_magic_trick(p_trick_id, p_user_id, p_title, ...)
         ↓
4. Si trickData.categoryId:
   └─ INSERT trick_categories
         ↓
5. Si trickData.tagIds:
   ├─ INSERT trick_tags (múltiples)
   └─ RPC: increment_tag_usage(tag_id) para cada tag
         ↓
6. Return { success: true, trickId }
```

**Ejemplo de Acción en Respuesta:**
```typescript
// La IA devuelve en su respuesta:
GUARDAR_TRUCO {
  "datos": {
    "title": "Ambitious Card",
    "effect": "Una carta elegida sube al tope del mazo",
    "secret": "Double lift + Palming",
    "duration": 180,
    "difficulty": 7,
    "reset": 10,
    "categoryId": "abc-123",
    "tagIds": ["tag-1", "tag-2"]
  }
}

// ChatService detecta "GUARDAR_TRUCO" y ejecuta:
await this.registerTrickFromChat(userId, datos, conversationId);
```

### 🎨 createUserTag() - Crear Tag con Color

```typescript
async createUserTag(
  userId: string,
  name: string,
  color?: string
): Promise<{ success: boolean; tagId?: string; error?: string }>
```

**Flujo:**
```
INSERT INTO predefined_tags {
  user_id,
  name,
  color: color || "#4CAF50", // Verde por defecto
  usage_count: 0
}
```

**Acción IA:**
```
CREAR_TAG_CON_COLOR { "name": "Impromptu", "color": "#FF5722" }
```

### 📂 getUserContext() - Contexto Completo

```typescript
private async getUserContext(userId: string): Promise<UserContext>
```

**Queries Ejecutadas:**
```typescript
// 1. Perfil
SELECT username, subscription_type FROM profiles WHERE id = userId;

// 2. TODOS los trucos con relaciones
SELECT
  id, title, effect, secret, duration, difficulty, reset,
  special_materials, angles, is_public, created_at,
  trick_categories (category_id),
  trick_tags (tag_id)
FROM magic_tricks
WHERE user_id = userId
ORDER BY created_at DESC;

// 3. Técnicas
SELECT id, name, description, difficulty
FROM techniques
WHERE user_id = userId;

// 4. Categorías predefinidas
SELECT id, name FROM predefined_categories;

// 5. Categorías del usuario
SELECT id, name FROM user_categories WHERE user_id = userId;

// 6. Tags
SELECT id, name FROM predefined_tags
ORDER BY usage_count DESC;
```

**Formato del Contexto:**
```typescript
return {
  username: "JuanMago",
  isPlus: true,
  tricksCount: 42,
  tricks: [
    {
      id: "trick-1",
      title: "Ambitious Card",
      effect: "...",
      secret: "...",
      categories: ["Cartomagia", "Clásicos"],
      tags: ["Impromptu", "Close-Up"],
      angles: ["360"],
      // ... más campos
    },
    // ... 41 trucos más
  ],
  categories: [/* predefinidas + usuario */],
  tags: [/* ordenados por uso */],
};
```

**Este contexto se inyecta en el system prompt:**
```typescript
const messages = [
  {
    role: "system",
    content: getSystemInstructions(), // Instrucciones generales
  },
  {
    role: "system",
    content: getMagicTrickPrompt(userContext), // "El usuario tiene 42 trucos: ..."
  },
  // ... historial + mensaje actual
];
```

### 🔢 incrementUsage()

```typescript
async incrementUsage(userId: string, tokensUsed: number): Promise<void>
```

**RPC Call:**
```typescript
supabase.rpc("increment_ai_usage", {
  p_user_id: userId,
  p_tokens: tokensUsed
});
```

**Actualiza:**
- Contador diario de queries
- Total de tokens consumidos
- Última fecha de uso

### 📋 Gestión de Conversaciones

**createConversation():**
```typescript
INSERT INTO ai_conversations {
  user_id,
  title,
  message_count: 0,
  is_archived: false,
  is_pinned: false
}
```

**getConversations():**
```typescript
SELECT * FROM ai_conversations
WHERE user_id = userId AND is_archived = false
ORDER BY updated_at DESC;
```

**searchConversations():**
```typescript
// Búsqueda por título con ILIKE (case-insensitive)
.ilike("title", `%${query}%`)
```

**moveToFolder():**
```typescript
UPDATE ai_conversations
SET folder_id = folderId
WHERE id = conversationId;
```

**togglePin():**
```typescript
// Alternar is_pinned
const current = await getConversation(id);
UPDATE SET is_pinned = !current.is_pinned;
```

### 📁 Folders

**createFolder():**
```typescript
INSERT INTO ai_folders {
  user_id,
  name,
  color: "#10b981", // Verde por defecto
  icon: "folder" // Opcional
}
```

**getFolders():**
```typescript
SELECT * FROM ai_folders
WHERE user_id = userId
ORDER BY created_at ASC;
```

### 🔒 Validaciones y Límites

**Validación de Límites:**
- **Free:** 10 queries/día, se reinicia a medianoche UTC
- **Plus:** 100 queries/día
- **Mensajes por conversación:** 100 max (auto-archiva)

**Errores Específicos:**
- `dailyLimitReached` → Free llegó al límite
- `dailyLimitReachedPlus` → Plus llegó al límite
- `conversationArchived` → Conversación ya archivada
- `conversationLimitReached` → 100 mensajes alcanzados
- `registerTrickPlusOnly` → Truco requiere Plus

### 🎯 Integración con OpenAI

**Selección de Modelo:**
```typescript
// En OpenAIService.selectOptimalModel()
if (contentLength < 1000 && historyLength < 10) {
  return "gpt-3.5-turbo"; // Rápido y económico
} else {
  return "gpt-4"; // Más inteligente para contextos largos
}
```

**Parámetros:**
- `temperature: 0.7` → Balance creatividad/coherencia
- `maxTokens: 2000` → Respuestas completas pero no excesivas
- `useCache: false` → Siempre datos actualizados del usuario

---

## 📡 NetworkMonitorService - Detección de Conectividad

**Archivo:** `services/NetworkMonitorService.ts`

### 🎯 Propósito

Monitorea en tiempo real el estado de la conexión a internet usando `@react-native-community/netinfo`.

### 📦 Interface

```typescript
interface NetworkStatus {
  isConnected: boolean;              // ¿Hay conexión?
  isInternetReachable: boolean | null; // ¿Internet realmente accesible?
  type: string | null;               // 'wifi', 'cellular', 'none', etc.
}

type NetworkListener = (status: NetworkStatus) => void;
```

### 🔧 Singleton

```typescript
const networkMonitorService = NetworkMonitorService.getInstance();
```

### ⚙️ Inicialización

```typescript
async initialize(): Promise<void>
```

**Flujo:**
```
1. NetInfo.fetch() → Estado inicial
         ↓
2. Actualizar currentStatus
         ↓
3. NetInfo.addEventListener((state) => updateStatus(state))
         ↓
4. Guardar unsubscribe para limpieza
```

**Uso:**
```typescript
// En App.tsx o root layout
useEffect(() => {
  networkMonitorService.initialize();
  return () => networkMonitorService.destroy();
}, []);
```

### 📊 Métodos de Estado

**getStatus():**
```typescript
getStatus(): NetworkStatus {
  return { ...this.currentStatus }; // Copia defensiva
}
```

**isOnline():**
```typescript
isOnline(): boolean {
  return this.currentStatus.isConnected;
}
```

**isOffline():**
```typescript
isOffline(): boolean {
  return !this.currentStatus.isConnected;
}
```

### 🔔 Sistema de Listeners

**subscribe():**
```typescript
subscribe(listener: NetworkListener): () => void
```

**Características:**
- Llama al listener inmediatamente con estado actual
- Return value: función para unsubscribe
- Set<NetworkListener> para múltiples listeners

**Uso:**
```typescript
// En OfflineSyncContext
useEffect(() => {
  const unsubscribe = networkMonitorService.subscribe((status) => {
    setIsOnline(status.isConnected);

    if (status.isConnected && user) {
      console.log("📡 Network restored - auto-syncing...");
      performSync(user.id);
    }
  });

  return unsubscribe;
}, [user]);
```

### 🔄 updateStatus() - Lógica Interna

```typescript
private updateStatus(state: NetInfoState): void
```

**Flujo:**
```
1. Construir NetworkStatus desde NetInfoState
         ↓
2. Comparar wasConnected vs isNowConnected
         ↓
3. Si cambió:
   └─ console.log("Connection changed: OFFLINE → ONLINE")
         ↓
4. Actualizar currentStatus
         ↓
5. notifyListeners() → Llamar todos los listeners
```

**Log Example:**
```
[NetworkMonitor] Connection changed: OFFLINE → ONLINE
```

### ⏱️ waitForConnection()

```typescript
async waitForConnection(timeoutMs: number = 30000): Promise<boolean>
```

**Uso:**
```typescript
// Esperar conexión antes de operación crítica
const connected = await networkMonitorService.waitForConnection(5000);
if (connected) {
  await uploadFile();
} else {
  Alert.alert("Sin conexión", "No se pudo conectar después de 5 segundos");
}
```

**Algoritmo:**
```
1. Si ya online: return true inmediatamente
         ↓
2. Subscribe a cambios de red
         ↓
3. Iniciar timeout (30s por defecto)
         ↓
4. Si conecta antes del timeout:
   └─ clearTimeout + unsubscribe + return true
         ↓
5. Si timeout expira:
   └─ unsubscribe + return false
```

### 🧹 destroy()

```typescript
destroy(): void
```

**Limpieza:**
```
1. this.unsubscribe() → Detener listener de NetInfo
         ↓
2. this.listeners.clear() → Remover todos los listeners
         ↓
3. this.unsubscribe = null
```

### 🔌 Integración con Offline System

**OfflineSyncContext usa este servicio:**
```typescript
// Trigger sync en reconexión
useEffect(() => {
  const unsubscribe = networkMonitorService.subscribe((status) => {
    if (status.isConnected && user) {
      performSync(user.id);
    }
  });
  return unsubscribe;
}, [user]);
```

**TrickService verifica antes de operaciones:**
```typescript
async updateIsPublic(trickId, isPublic, userId) {
  // Update local cache SIEMPRE
  localDataService.updateTrick(userId, trickId, { is_public: isPublic });

  // Si offline, encolar
  if (!networkMonitorService.isOnline()) {
    await offlineQueueService.enqueue({...});
    return true;
  }

  // Si online, sync a servidor
  try {
    await supabase.from("magic_tricks").update({...});
  } catch (error) {
    // Encolar si falla
    await offlineQueueService.enqueue({...});
  }
}
```

---

## 📹 VideoAnalysisService - Análisis Inteligente de Video

**Archivo:** `services/videoAnalysisService.ts`

### 🎯 Propósito

Determina automáticamente si un video necesita compresión basándose en bitrate, duración, resolución y tamaño del archivo.

### 📐 Estándares de Video

```typescript
VIDEO_STANDARDS = {
  MAX_DURATION_SECONDS: 600, // 10 minutos máximo

  // Bitrate máximo por resolución (Mbps)
  // Basado en YouTube, Vimeo, H.264 specs
  MAX_BITRATE_MBPS: {
    '4K': 35,      // 3840x2160 @ 30fps
    '1080p': 12,   // 1920x1080 @ 60fps
    '720p': 8,     // 1280x720 @ 30fps
    '480p': 5,     // 854x480
  },

  // Tamaño máximo por minuto (MB/min)
  MAX_SIZE_PER_MINUTE_MB: {
    '4K': 260,     // ~35 Mbps
    '1080p': 90,   // ~12 Mbps
    '720p': 60,    // ~8 Mbps
    '480p': 38,    // ~5 Mbps
  },

  // Umbral de compresión (30% más del esperado)
  COMPRESSION_THRESHOLD: 1.3,

  // Calidad por rango de exceso
  COMPRESSION_QUALITY: {
    MINOR: 'high',      // 1.3x - 2x del límite
    MODERATE: 'medium', // 2x - 3x del límite
    SEVERE: 'low',      // >3x del límite
  },
};
```

### 📊 VideoAnalysis Interface

```typescript
interface VideoAnalysis {
  // Información básica
  fileSizeMB: number;
  durationSeconds?: number;
  width?: number;
  height?: number;

  // Métricas calculadas
  resolutionCategory: '4K' | '1080p' | '720p' | '480p';
  bitrateMbps?: number;
  sizePerMinuteMB?: number;

  // Decisión de compresión
  shouldCompress: boolean;
  recommendedQuality: 'high' | 'medium' | 'low' | 'none';
  reason: string;

  // Validaciones
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### 🔍 analyzeVideo() - Análisis Principal

```typescript
async analyzeVideo(videoUri: string): Promise<VideoAnalysis>
```

**Flujo Completo:**
```
1. FileSystem.getInfoAsync(videoUri) → Obtener tamaño
         ↓
2. videoService.getVideoInfo(videoUri) → Metadata (duración, width, height)
         ↓
3. detectResolutionCategory(width, height)
   ├─ >= 8M pixels → '4K'
   ├─ >= 2M pixels → '1080p'
   ├─ >= 900K pixels → '720p'
   └─ else → '480p'
         ↓
4. Validar duración <= 10 minutos
   └─ Si excede: errors.push(...)
         ↓
5. Calcular métricas:
   ├─ bitrateMbps = (fileSizeMB * 8) / durationSeconds
   └─ sizePerMinuteMB = (fileSizeMB / durationSeconds) * 60
         ↓
6. determineCompressionQuality(actualBitrate, maxBitrate)
   ├─ ratio = actualBitrate / maxBitrate
   ├─ Si ratio <= 1.3: 'none' (no necesita)
   ├─ Si ratio <= 2.0: 'high' (compresión ligera)
   ├─ Si ratio <= 3.0: 'medium' (compresión moderada)
   └─ Si ratio > 3.0: 'low' (compresión agresiva)
         ↓
7. Si no hay duración:
   └─ Heurística: fileSizeMB > 300 → Comprimir 'medium'
         ↓
8. Return VideoAnalysis
```

**Ejemplo de Resultado:**
```typescript
{
  fileSizeMB: 245.3,
  durationSeconds: 120, // 2 minutos
  width: 1920,
  height: 1080,
  resolutionCategory: '1080p',
  bitrateMbps: 16.35, // (245.3 * 8) / 120
  sizePerMinuteMB: 122.65,
  shouldCompress: true,
  recommendedQuality: 'medium', // ratio = 16.35 / 12 = 1.36
  reason: "Bitrate alto detectado: 16.4 Mbps (1.4x el límite de 12 Mbps para 1080p). Se recomienda compresión \"medium\".",
  isValid: true,
  errors: [],
  warnings: []
}
```

### 🎯 determineCompressionQuality()

```typescript
private determineCompressionQuality(
  actualBitrate: number,
  maxBitrate: number
): CompressionQuality
```

**Lógica:**
```typescript
const ratio = actualBitrate / maxBitrate;

if (ratio <= 1.3) return 'none';    // Dentro del rango aceptable
if (ratio <= 2.0) return 'high';    // Ligero exceso (8 Mbps target)
if (ratio <= 3.0) return 'medium';  // Exceso moderado (5 Mbps target)
return 'low';                       // Exceso severo (2 Mbps target)
```

**Bitrates de Compresión:**
- **high:** 10 Mbps (alta calidad, reducción moderada)
- **medium:** 6.5 Mbps (buena calidad, reducción significativa)
- **low:** 3 Mbps (calidad aceptable, máxima reducción)

### 📋 formatAnalysisReport()

```typescript
formatAnalysisReport(analysis: VideoAnalysis): string
```

**Output Example:**
```
📊 ANÁLISIS DE VIDEO
────────────────────────────────────────
📁 Tamaño: 245.30 MB
⏱️  Duración: 2:00
📐 Resolución: 1920x1080 (1080p)
📊 Bitrate: 16.4 Mbps
📈 Tamaño/min: 123 MB/min
────────────────────────────────────────
⚠️  COMPRESIÓN RECOMENDADA: MEDIUM
💡 Bitrate alto detectado: 16.4 Mbps (1.4x el límite de 12 Mbps para 1080p). Se recomienda compresión "medium".
```

### 🧩 Integración con fileUploadService

```typescript
// En fileUploadService.uploadVideo()
let finalUri = videoUri;
const fileSize = (await FileSystem.getInfoAsync(videoUri)).size / (1024 * 1024);

if (fileSize > 200) {
  // Analizar video
  const analysis = await videoAnalysisService.analyzeVideo(videoUri);

  console.log(videoAnalysisService.formatAnalysisReport(analysis));

  if (!analysis.isValid) {
    throw new Error(analysis.errors.join(', '));
  }

  if (analysis.shouldCompress && videoService.isCompressionAvailable()) {
    finalUri = await videoService.compressVideo(videoUri, analysis.recommendedQuality);
  }
}

// Upload finalUri to Cloudflare Stream
const result = await cloudflareStreamService.uploadVideo(finalUri, metadata, onProgress);
```

### ⚠️ Validaciones y Warnings

**Errores (bloquean upload):**
- `"El video excede la duración máxima de 10 minutos (duración: 15 min)"`
- `"No se pudo acceder al archivo de video"`

**Warnings (no bloquean):**
- `"No se pudo obtener metadata completa del video"` → Usa heurística de tamaño
- `"No se pudo determinar duración. Usando heurística basada en tamaño."`
- `"Archivo muy grande (1200 MB). La subida puede tardar varios minutos."`

### 🎬 detectResolutionCategory()

```typescript
private detectResolutionCategory(width?: number, height?: number): VideoResolutionCategory
```

**Algoritmo:**
```typescript
if (!width || !height) return '1080p'; // Asumir moderno

const pixels = width * height;

if (pixels >= 8000000) return '4K';    // >= 3840x2160
if (pixels >= 2000000) return '1080p'; // >= 1920x1080
if (pixels >= 900000) return '720p';   // >= 1280x720
return '480p';                         // < 900K pixels
```

### 📐 calculateBitrate()

```typescript
private calculateBitrate(fileSizeMB: number, durationSeconds: number): number
```

**Fórmula:**
```
Bitrate (Mbps) = (File Size (MB) * 8 bits/byte) / Duration (seconds)
```

**Ejemplo:**
```
245.3 MB / 120s = (245.3 * 8) / 120 = 16.35 Mbps
```

---
## 🔐 SERVICE: authService

**Archivo:** `services/authService.ts`

### 🎯 Propósito
Servicio singleton que encapsula todas las operaciones de autenticación con Supabase, proporcionando una interfaz consistente para registro, inicio de sesión, cierre de sesión, recuperación de contraseña y gestión de sesiones de usuario.

### 🏗️ Patrón Singleton

```typescript
class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
}
```

### 📋 Métodos Principales

#### signUp(email, password, username?)
- **Propósito:** Registrar nuevo usuario
- **Validaciones:** Email válido, contraseña ≥6 caracteres
- **Retorna:** `{ user, session }`
- **Metadata:** Username se guarda en `user.user_metadata.username`

#### signIn(email, password)
- **Propósito:** Iniciar sesión
- **Retorna:** `{ user, session }` con access_token
- **Errores comunes:** Credenciales inválidas, email no confirmado

#### signOut()
- **Propósito:** Cerrar sesión
- **Acción adicional:** Limpiar cache local (AsyncStorage)

#### getCurrentUser()
- **Propósito:** Obtener usuario actual
- **Retorna:** `User | null`
- **Uso:** Guards de autenticación, verificaciones rápidas

#### updatePassword(newPassword)
- **Propósito:** Cambiar contraseña del usuario autenticado
- **Validación:** Longitud mínima 6 caracteres

#### resetPassword(email)
- **Propósito:** Enviar email de recuperación
- **Configuración:** Requiere `redirectTo` en Supabase settings

#### isAuthenticated()
- **Propósito:** Verificar sesión activa
- **Retorna:** `boolean`
- **Performance:** Rápido, consulta solo memoria

#### refreshSession()
- **Propósito:** Renovar token antes de expiración
- **Uso:** Interval cada 30 minutos (opcional, Supabase auto-refresh por defecto)

#### testConnection()
- **Propósito:** Diagnóstico de conectividad con Supabase
- **Uso:** Debug, healthcheck

### 🌍 Traducción de Errores

**Método privado:** `translateAuthError(error)`

Mapea errores técnicos de Supabase a español:

```typescript
'Invalid login credentials' → 'Email o contraseña incorrectos'
'Email not confirmed' → 'Debes confirmar tu email antes de iniciar sesión'
'User already registered' → 'Este email ya está registrado'
'Too many requests' → 'Demasiados intentos. Espera unos minutos'
'Network request failed' → 'Error de conexión. Verifica tu internet'
```

### 🔗 Integración con Otros Servicios

**Con LocalDataService:**
```typescript
// Después de signIn
const { user } = await authService.signIn(email, password);
await localDataService.loadUserData(user.id);

// Antes de signOut
await authService.signOut();
await localDataService.clearCache();
```

**Con LibraryDataContext:**
```typescript
const handleLogin = async () => {
  const { user } = await authService.signIn(email, password);
  await loadUserLibrary(user.id); // Context
};
```

### ⚡ Ejemplo de Uso Completo

```typescript
// Registro
const handleRegister = async (email: string, password: string) => {
  const { user, error } = await authService.signUp(email, password);
  if (error) {
    alert(error.message); // Mensaje en español
    return;
  }
  router.replace('/auth/login');
};

// Login
const handleLogin = async (email: string, password: string) => {
  const { user, session, error } = await authService.signIn(email, password);
  if (error) {
    alert(error.message);
    return;
  }
  await localDataService.loadUserData(user.id);
  router.replace('/(app)/home');
};

// Logout
const handleLogout = async () => {
  await authService.signOut();
  await localDataService.clearCache();
  router.replace('/auth/login');
};
```

---

## 🎙️ SERVICE: audioService

**Archivo:** `services/audioService.ts`

### ⚠️ Estado Actual: PREPARADO PARA FUTURO USO

Este archivo está **vacío/minimal** actualmente. Está reservado para desarrollo futuro de funcionalidades de audio.

### 🎯 Propósito Planificado
Servicio singleton para grabar, reproducir y procesar audio en la aplicación, incluyendo transcripción mediante OpenAI Whisper.

### 📋 Funcionalidades Planificadas

#### Grabación de Audio
- `startRecording()` - Iniciar grabación con permisos
- `stopRecording()` - Detener y obtener URI
- `pauseRecording()` - Pausar grabación (si disponible)

#### Reproducción de Audio
- `playAudio(uri)` - Reproducir archivo
- `pauseAudio()` - Pausar reproducción
- `stopAudio()` - Detener y descargar

#### Utilidades
- `getAudioDuration(uri)` - Obtener duración en ms
- `transcribeAudio(uri)` - Usar openAIService.transcribeAudio()
- `compressAudio(uri)` - Reducir tamaño de archivo
- `uploadAudio(uri, userId)` - Upload a Supabase Storage

### 🛠️ Tecnologías Sugeridas

**expo-av** (ya instalado):
```typescript
import { Audio } from 'expo-av';

// Configurar permisos
await Audio.requestPermissionsAsync();
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
});

// Grabar
const recording = new Audio.Recording();
await recording.prepareToRecordAsync(
  Audio.RecordingOptionsPresets.HIGH_QUALITY
);
await recording.startAsync();

// Detener
await recording.stopAndUnloadAsync();
const uri = recording.getURI();
```

### 💡 Casos de Uso Futuros

1. **Notas de Voz en Trucos:** Grabar explicaciones verbales
2. **Transcripción Automática:** Convertir audio a texto con Whisper
3. **Búsqueda por Voz:** Dictar query de búsqueda
4. **Instrucciones de Voz:** Reproducir guías paso a paso

### 🔗 Integración con openAIService

```typescript
// Ya disponible en openAIService.ts:
async transcribeAudio(audioPath: string): Promise<string>

// Uso futuro:
const uri = await audioService.stopRecording();
const text = await openAIService.transcribeAudio(uri);
setTrickDescription(text);
```

### 📝 Notas de Implementación

- **No implementar hasta necesidad real** - Mantener vacío por ahora
- **Seguir patrón Singleton** cuando se desarrolle
- **Límites de Whisper:** Max 25MB, <10 min recomendado
- **Formatos:** M4A, MP3, WAV, WebM

---

## 🤖 SERVICE: openAIService

**Archivo:** `services/openAIService.ts`

### 🎯 Propósito
Servicio singleton que proporciona integración con OpenAI para chat conversacional (GPT-3.5/GPT-4), transcripción de audio (Whisper), selección dinámica de modelos y sistema de caché optimizado con compresión GZIP.

### 🏗️ Arquitectura

```
openAIService (Singleton)
    ├─ sendChatCompletion(messages, options)
    ├─ transcribeAudio(audioPath)
    ├─ selectOptimalModel(msgLen, convLen)
    └─ Cache Layer (GZIP + AsyncStorage, TTL 24h)
          ↓
   OpenAI API Client
    ├─ Chat Completions (GPT-3.5/4)
    └─ Whisper (Audio Transcription)
```

### 📋 Métodos Principales

#### sendChatCompletion(messages, options?)

**Parámetros:**
```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;           // Auto-selecciona si no se especifica
  temperature?: number;     // 0-2, default: 0.7
  maxTokens?: number;       // Default: 1000
  useCache?: boolean;       // Default: true
}
```

**Retorna:**
```typescript
{
  content: string;          // Respuesta generada
  tokensUsed: number;       // Tokens consumidos
  model: string;            // Modelo utilizado
}
```

**Ejemplo:**
```typescript
const response = await openAIService.sendChatCompletion([
  { role: 'system', content: 'Eres un experto en magia.' },
  { role: 'user', content: '¿Cómo mejorar mi truco de cartas?' }
], {
  temperature: 0.7,
  maxTokens: 500
});

console.log(response.content); // Respuesta de GPT
console.log(`Tokens: ${response.tokensUsed}`);
```

#### transcribeAudio(audioPath)

**Propósito:** Convertir audio a texto con Whisper

**Parámetros:**
- `audioPath` (string): Ruta local del archivo audio

**Formatos soportados:** mp3, mp4, mpeg, mpga, m4a, wav, webm

**Límites:**
- Tamaño máximo: 25 MB
- Duración recomendada: <10 minutos

**Ejemplo:**
```typescript
const uri = recording.getURI();
const transcription = await openAIService.transcribeAudio(uri);
console.log('Texto:', transcription);
```

#### selectOptimalModel(messageLength, conversationLength)

**Propósito:** Seleccionar GPT-3.5 vs GPT-4 dinámicamente

**Lógica:**
```typescript
// Mensaje largo (>500 chars) → GPT-4
if (messageLength > 500) return 'gpt-4o';

// Conversación larga (>10 msgs) → GPT-4
if (conversationLength > 10) return 'gpt-4o';

// Por defecto → GPT-4o-mini (rápido + económico)
return 'gpt-4o-mini';
```

### 💾 Sistema de Caché Avanzado

**Características:**
- **Compresión GZIP** con `pako` library
- **TTL:** 24 horas (86400000 ms)
- **Storage:** AsyncStorage
- **Key:** MD5 hash de (messages + model)

**Flujo:**
```
1. Generar cache key: MD5(messages + model)
2. Buscar en AsyncStorage
3. Si existe y no expiró:
   - Descomprimir con pako.ungzip()
   - Retornar respuesta cacheada (tokensUsed = 0)
4. Si no existe o expiró:
   - Llamar a OpenAI API
   - Comprimir respuesta con pako.gzip()
   - Guardar en AsyncStorage
   - Retornar respuesta nueva
```

**Beneficios:**
- **Reducción de costos:** ~$0.03 por respuesta GPT-4 cacheada
- **Latencia:** 50-200ms (caché) vs 2-5s (API)
- **Offline:** Respuestas disponibles sin conexión

### 🚨 Manejo de Errores

**Códigos comunes:**
- **401:** API Key inválida → `'API Key de OpenAI inválida. Verifica tu configuración.'`
- **429:** Rate limit → `'Límite de tasa excedido. Intenta de nuevo en unos minutos.'`
- **500/502/503:** Servicio caído → `'Servicio de OpenAI no disponible. Intenta más tarde.'`

### ⚙️ Configuración (.env)

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL_PRIMARY=gpt-4o-mini      # Rápido/económico
OPENAI_MODEL_SECONDARY=gpt-4o         # Inteligente/costoso
OPENAI_MODEL_WHISPER=whisper-1        # Transcripción
```

### 🔗 Integración con MMENTO AI

```typescript
// app/(app)/mmento-ai/index.tsx
const [messages, setMessages] = useState<ChatMessage[]>([
  {
    role: 'system',
    content: 'Eres MmentoAI, experto en magia y trucos.'
  }
]);

const handleSend = async (userMsg: string) => {
  const updated = [...messages, { role: 'user', content: userMsg }];

  const response = await openAIService.sendChatCompletion(updated, {
    temperature: 0.7,
    maxTokens: 800,
    useCache: true
  });

  setMessages([...updated, {
    role: 'assistant',
    content: response.content
  }]);
};
```

### 💰 Optimización de Costos

**Estrategias:**
1. **Caché agresivo:** TTL 24h para FAQ comunes
2. **Limitar maxTokens:** Solo lo necesario
3. **Preferir GPT-4o-mini:** 10x más económico
4. **Truncar conversaciones:** Mantener solo últimos 10 mensajes

**Tracking de uso:**
```typescript
class TokenTracker {
  trackUsage(model: string, tokens: number) {
    this.totalTokens += tokens;
    this.tokensByModel[model] = (this.tokensByModel[model] || 0) + tokens;
  }

  calculateCost(): number {
    let cost = 0;
    for (const [model, tokens] of Object.entries(this.tokensByModel)) {
      if (model.includes('gpt-4o-mini')) {
        cost += (tokens / 1000) * 0.0015;
      } else if (model.includes('gpt-4o')) {
        cost += (tokens / 1000) * 0.03;
      }
    }
    return cost;
  }
}
```

---

## 📑 SERVICE: orderService

**Archivo:** `utils/orderService.ts`

### 🎯 Propósito
Servicio singleton que gestiona el ordenamiento personalizado de categorías y trucos mediante drag-and-drop, con debouncing de 1.5s para optimizar escrituras a Supabase.

### 🏗️ Arquitectura

```
orderService (Singleton)
    ├─ getUserCategoryOrder(userId)
    ├─ getUserTrickOrder(userId, categoryId)
    ├─ updateCategoryOrder(userId, catId, pos)
    ├─ updateTrickOrder(userId, catId, trickId, pos)
    ├─ moveTrickToCategory(...)
    ├─ initializeCategoryOrder(userId, catId)
    ├─ initializeTrickOrder(userId, catId, trickId)
    ├─ cleanupCategoryOrder(userId, catId)
    └─ flushUpdates() → Batch upsert
          ↓
   Debounce Queue (1.5s)
    ├─ pendingCategoryUpdates: Map
    └─ pendingTrickUpdates: Map
          ↓
   Supabase Tables
    ├─ user_category_order
    └─ user_trick_order
```

### 📊 Tablas de Base de Datos

**user_category_order:**
```sql
CREATE TABLE user_category_order (
  user_id UUID NOT NULL,
  category_id UUID NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(user_id, category_id)
);
```

**user_trick_order:**
```sql
CREATE TABLE user_trick_order (
  user_id UUID NOT NULL,
  category_id UUID NOT NULL,
  trick_id UUID NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(user_id, category_id, trick_id)
);
```

### 📋 Métodos Principales

#### getUserCategoryOrder(userId)
- **Retorna:** `Record<string, number>` (categoryId → position)
- **Orden:** ASC por position

#### getUserTrickOrder(userId, categoryId)
- **Retorna:** `Record<string, number>` (trickId → position)
- **Maneja:** Categoría "Favoritos" detectada por nombre

#### updateCategoryOrder(userId, categoryId, newPosition)
- **Debounce:** 1.5 segundos
- **Cola:** Agrega a `pendingCategoryUpdates`
- **Flush:** Automático después de delay sin nuevos updates

#### updateTrickOrder(userId, categoryId, trickId, newPosition)
- **Debounce:** 1.5 segundos
- **Cola:** Agrega a `pendingTrickUpdates`

#### moveTrickToCategory(userId, trickId, fromCatId, toCatId, newPos)
- **Acciones:**
  1. Eliminar de categoría origen
  2. Insertar en categoría destino
  3. Re-ordenar trucos restantes en ambas

#### flushUpdates()
- **Propósito:** Ejecutar batch upsert inmediato
- **Operación:** `supabase.upsert(updates, { onConflict })`
- **Uso:** Forzar flush antes de logout, backup, etc.

### ⏱️ Sistema de Debouncing

**Implementación:**
```typescript
private debounceTimer: NodeJS.Timeout | null = null;
private readonly DEBOUNCE_DELAY = 1500; // 1.5 segundos

private scheduleFlush(): void {
  if (this.debounceTimer) {
    clearTimeout(this.debounceTimer);
  }

  this.debounceTimer = setTimeout(async () => {
    await this.flushUpdates();
  }, this.DEBOUNCE_DELAY);
}
```

**Beneficios:**
- Reduce escrituras a DB (múltiples drags → 1 batch upsert)
- Mejor performance en drag-and-drop rápido
- Ahorra costos de operaciones DB

### 🎯 Integración con Drag-and-Drop

**react-beautiful-dnd:**
```typescript
const handleDragEnd = async (result: DropResult) => {
  const { source, destination } = result;
  if (!destination) return;

  // Optimistic update en UI
  const reordered = Array.from(categories);
  const [moved] = reordered.splice(source.index, 1);
  reordered.splice(destination.index, 0, moved);
  setCategories(reordered);

  // Update con debounce
  await orderService.updateCategoryOrder(
    userId,
    moved.id,
    destination.index
  );
};
```

### 🔗 Integración con LibraryDataContext

```typescript
// Cargar orden al inicializar
useEffect(() => {
  const loadOrder = async () => {
    const orderMap = await orderService.getUserCategoryOrder(userId);

    const sorted = [...categories].sort((a, b) => {
      const posA = orderMap[a.id] ?? 999;
      const posB = orderMap[b.id] ?? 999;
      return posA - posB;
    });

    setCategories(sorted);
  };

  loadOrder();
}, [userId]);
```

### ⚠️ Edge Cases Manejados

**Categoría "Favoritos":**
```typescript
// Detectar por nombre (case-insensitive)
const isFavorites = categoryName.toLowerCase() === 'favoritos' ||
                    categoryId === 'favorites-virtual';

if (isFavorites) {
  // Buscar ID real en DB
  const { data } = await supabase
    .from('user_categories')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', 'favoritos')
    .single();

  categoryId = data?.id || categoryId;
}
```

**Elementos sin orden:**
```typescript
// Inicializar automáticamente
const unordered = categories.filter(cat => !(cat.id in orderMap));

for (const category of unordered) {
  await orderService.initializeCategoryOrder(userId, category.id);
}
```

### 💡 Mejores Prácticas

1. **Flush antes de operaciones críticas:**
   ```typescript
   await orderService.flushUpdates();
   await performBackup();
   ```

2. **Optimistic updates en UI:** Actualizar UI inmediatamente, no esperar DB

3. **Normalizar posiciones:** Evitar gaps (0, 1, 2... no 0, 5, 10)

4. **Revertir en error:**
   ```typescript
   try {
     await orderService.updateCategoryOrder(...);
   } catch (error) {
     setCategories(originalCategories); // Revertir
   }
   ```

---

## 📦 UTIL: compressionService

**Archivo:** `utils/compressionService.ts`

### 🎯 Propósito
Servicio singleton para compresión automática de archivos (imágenes, videos, datos) con estrategias adaptativas según tipo y tamaño.

### 📋 Métodos Principales

#### compressFile(uri, mimeType, options?)
- **Propósito:** Compresión automática según tipo de archivo
- **Soporta:** images/*, videos/*, text/*, application/*
- **Retorna:** `{ uri, originalSize, compressedSize, ratio, algorithm, wasCompressed }`
- **Algoritmos:** jpeg, h264, gzip, none

#### compressImage(uri, originalSize, options)
- **Estrategia dinámica según tamaño:**
  - >4MB: quality=0.5, maxDim=1080
  - >2MB: quality=0.6, maxDim=1280
  - >1MB: quality=0.7, maxDim=1440
  - <1MB: quality=0.8, maxDim=1920
- **Tecnología:** expo-image-manipulator con SaveFormat.JPEG

#### compressVideo(uri, originalSize, options)
- **Calidades dinámicas:**
  - >50MB → "low"
  - >20MB → "medium"
  - <20MB → "high"
- **Tecnología:** react-native-compressor (no disponible en Expo Go)
- **Fallback:** Si no está disponible, retorna URI original sin comprimir

#### compressData(uri, originalSize, mimeType)
- **Algoritmo:** pako.gzip() (compresión GZIP)
- **Umbral:** Solo si >100KB (DATA_SIZE_THRESHOLD)
- **Beneficio mínimo:** 20% de reducción (MIN_COMPRESSION_BENEFIT)
- **Skips:** Archivos ya comprimidos (zip, rar, 7z, gzip, webp)

### 🔧 Utilidades

**isVideoCompressionAvailable():** Verifica si react-native-compressor está disponible

**cleanupTemporaryFiles():** Limpia archivos `compressed_*` y `decompressed_*` del cache

**getCompressionStats():** Retorna métricas de operaciones de compresión

### ⚡ Ejemplo de Uso

```typescript
import { compressionService } from '@/utils/compressionService';

const handleUpload = async (uri: string, mimeType: string) => {
  const result = await compressionService.compressFile(uri, mimeType, {
    quality: 0.8,
    maxWidth: 1920
  });

  console.log(`Original: ${result.originalSize / 1024}KB`);
  console.log(`Comprimido: ${result.compressedSize / 1024}KB`);
  console.log(`Ratio: ${(result.ratio * 100).toFixed(1)}%`);
  console.log(`Algoritmo: ${result.algorithm}`);

  // Upload el archivo comprimido
  await uploadToServer(result.uri);
};
```

---

## 🔒 UTIL: security

**Archivo:** `utils/security.ts`

### 🎯 Propósito
SecurityManager con métodos estáticos para rate limiting, sanitización de inputs y validación de contenido malicioso.

### 📋 Métodos Principales

#### checkRateLimit(userId)
- **Límite:** 10 requests por minuto
- **Ventana:** 60 segundos (sliding window)
- **Storage:** AsyncStorage con key `rate_limit_{userId}`
- **Retorna:** `boolean` (true = permitido, false = excedido)

**Flujo:**
```
1. Leer contador de AsyncStorage
2. Si no existe → crear con count=1, timestamp=now
3. Si existe:
   - Si timestamp + 60s < now → reset ventana
   - Si count < 10 → incrementar y permitir
   - Si count >= 10 → denegar
```

#### sanitizeInput(input)
- **Acciones:**
  - Elimina caracteres de control (0x00-0x1F, 0x7F)
  - Limita longitud a 2000 caracteres
  - Elimina espacios excesivos
  - Trim

**Ejemplo:**
```typescript
const userInput = sanitizeInput(rawInput);
// "Hello\x00World   " → "Hello World"
```

#### validateContent(content)
- **Propósito:** Detectar prompts maliciosos (prompt injection)
- **Blacklist:**
  - "ignore previous instructions"
  - "disregard all prior"
  - "forget everything"
  - "system prompt"
  - "reveal your instructions"
  - "api key"
  - "access token"
- **Retorna:** `boolean` (true = válido, false = malicioso)

#### verifyAuth()
- **Propósito:** Verificar que usuario está autenticado
- **Retorna:** `string` (userId)
- **Throws:** Error si no autenticado

### 🔗 Uso con openAIService

```typescript
// Antes de enviar mensaje a OpenAI
const handleSendMessage = async (message: string) => {
  // Sanitizar
  const clean = SecurityManager.sanitizeInput(message);

  // Validar contenido
  if (!SecurityManager.validateContent(clean)) {
    alert('Mensaje contiene contenido no permitido');
    return;
  }

  // Verificar rate limit
  const userId = await SecurityManager.verifyAuth();
  const allowed = await SecurityManager.checkRateLimit(userId);
  if (!allowed) {
    alert('Demasiadas solicitudes. Espera un minuto.');
    return;
  }

  // Proceder
  await openAIService.sendChatCompletion([
    { role: 'user', content: clean }
  ]);
};
```

---

## 🔑 UTIL: auth

**Archivo:** `utils/auth.ts`

### 🎯 Propósito
Wrappers convenientes sobre authService.ts para operaciones comunes de autenticación.

### 📋 Funciones Exportadas

**signIn(email, password):**
- Llama a `authService.signIn()`
- Guarda token con `setAuthToken(session.access_token)`
- Retorna `Promise<boolean>`

**signUp(email, password, username?):**
- Llama a `authService.signUp()`
- Guarda token si disponible
- Retorna `Promise<boolean>`

**signOut():**
- Llama a `authService.signOut()`
- Limpia token con `removeAuthToken()`
- Retorna `Promise<void>`

**getCurrentUser():**
- Wrapper de `authService.getCurrentUser()`

**isAuthenticated():**
- Wrapper de `authService.isAuthenticated()`

**resetPassword(email):**
- Wrapper de `authService.resetPassword()`

**updatePassword(newPassword):**
- Wrapper de `authService.updatePassword()`

**refreshSession():**
- Wrapper de `authService.refreshSession()`

### ⚡ Diferencia con authService

| authService | auth.ts |
|------------|---------|
| Clase singleton | Funciones exportadas |
| Métodos de instancia | Funciones standalone |
| No maneja tokens | Guarda/elimina tokens |
| Bajo nivel | Alto nivel, más conveniente |

### 🔗 Uso Típico

```typescript
import { signIn, signOut, getCurrentUser } from '@/utils/auth';

// Login
const handleLogin = async () => {
  try {
    await signIn('user@example.com', 'password123');
    router.replace('/(app)/home');
  } catch (error) {
    alert(error.message);
  }
};

// Logout
const handleLogout = async () => {
  await signOut();
  router.replace('/auth/login');
};

// Check auth
const user = await getCurrentUser();
if (!user) {
  router.replace('/auth/login');
}
```

---

## 🎨 UTIL: colorUtils

**Archivo:** `utils/colorUtils.ts`

### 🎯 Propósito
Utilidades para gestión de colores de tags con paleta predefinida y generación automática de colores de texto con alto contraste.

### 🎨 Paleta de Colores (18 colores)

**TAG_COLORS:**
```typescript
// Claros (6)
LIGHT_GREEN: "#C8E6C9"
LIGHT_BLUE: "#BBDEFB"
LIGHT_ORANGE: "#FFE0B2"
LIGHT_PURPLE: "#E1BEE7"
LIGHT_RED: "#FFCDD2"

// Medios (6)
MEDIUM_GREEN: "#4CAF50"
MEDIUM_BLUE: "#2196F3"
MEDIUM_ORANGE: "#FF9800"
MEDIUM_PURPLE: "#9C27B0"
MEDIUM_RED: "#F44336"

// Oscuros (5)
DARK_GREEN: "#1B5E20"
DARK_BLUE: "#0D47A1"
DARK_ORANGE: "#E65100"
DARK_PURPLE: "#4A148C"
DARK_RED: "#B71C1C"

// Grises (3)
LIGHT_GRAY: "#F5F5F5"
MEDIUM_GRAY: "#9E9E9E"
DARK_GRAY: "#424242"
```

### 📋 Funciones Principales

#### getContrastTextColor(backgroundColor)
- **Propósito:** Obtener color de texto con alto contraste
- **Mapeo:**
  - Colores claros → texto oscuro
  - Colores oscuros/medios → texto claro
- **Fallback:** "#FFFFFF" si color no está en mapeo

**Ejemplo:**
```typescript
getContrastTextColor("#C8E6C9") // → "#1B5E20" (oscuro)
getContrastTextColor("#1B5E20") // → "#C8E6C9" (claro)
getContrastTextColor("#FF9800") // → "#FFE0B2" (claro)
```

#### getTagPillStyle(backgroundColor, isSelected)
- **Propósito:** Generar estilo para pill/badge de tag
- **Retorna:** Objeto con backgroundColor, borderWidth, borderColor, borderRadius
- **Opacidad:** 30% si selected, 15% si no selected

**Ejemplo:**
```typescript
getTagPillStyle("#4CAF50", true)
// {
//   backgroundColor: "#4CAF5030",  // 30% opacity
//   borderWidth: 1,
//   borderColor: "#C8E6C980",      // 80% opacity
//   borderRadius: 20
// }
```

#### getTagTextStyle(backgroundColor, isSelected)
- **Propósito:** Estilo para texto del tag
- **Retorna:** Objeto con color y opacity
- **Lógica:**
  - Selected: color de contraste, opacity=1
  - No selected: color de fondo original, opacity=0.9

### 🔗 Uso en TagSelector

```typescript
import { getTagPillStyle, getTagTextStyle } from '@/utils/colorUtils';

const TagPill = ({ tag, isSelected, onPress }) => {
  const pillStyle = getTagPillStyle(tag.color, isSelected);
  const textStyle = getTagTextStyle(tag.color, isSelected);

  return (
    <TouchableOpacity
      style={[styles.pill, pillStyle]}
      onPress={onPress}
    >
      <Text style={[styles.text, textStyle]}>{tag.name}</Text>
    </TouchableOpacity>
  );
};
```

### 🎨 ColorPicker Array

**PICKER_COLORS:** Array ordenado de 18 colores para grid de ColorPicker UI
```typescript
[
  // Row 1: Claros
  LIGHT_GREEN, LIGHT_BLUE, LIGHT_ORANGE, LIGHT_PURPLE, LIGHT_RED,

  // Row 2: Medios
  MEDIUM_GREEN, MEDIUM_BLUE, MEDIUM_ORANGE, MEDIUM_PURPLE, MEDIUM_RED,

  // Row 3: Oscuros
  DARK_GREEN, DARK_BLUE, DARK_ORANGE, DARK_PURPLE, DARK_RED,

  // Row 4: Grises
  LIGHT_GRAY, MEDIUM_GRAY, DARK_GRAY
]
```

---

## ⚡ UTIL: performanceOptimizer

**Archivo:** `utils/performanceOptimizer.ts`

### 🎯 Propósito
Singleton que mide, analiza y optimiza performance de operaciones pesadas (encriptación, uploads, compresión) con estrategias adaptativas basadas en métricas históricas.

### 🏗️ Arquitectura

```
PerformanceOptimizer (Singleton)
    ├─ measureAndOptimize(operation, fn, ...args)
    ├─ getOptimizationStrategy(fileSize)
    ├─ storeMetric(operation, duration, size)
    ├─ getAverageMetrics(operation)
    └─ Adaptive Thresholds
          ↓
   Métricas por Operación
    ├─ encrypt: { avgDuration, avgSize, avgSpeed }
    ├─ upload: { avgDuration, avgSize, avgSpeed }
    └─ compression: { avgDuration, avgSize, avgSpeed }
```

### 📋 Métodos Principales

#### measureAndOptimize(operation, fn, ...args)
- **Propósito:** Ejecutar función midiendo tiempo y tamaño
- **Acciones:**
  1. Medir tiempo de inicio
  2. Ejecutar función
  3. Calcular duración
  4. Almacenar métrica
  5. Log performance (si >SLOW_THRESHOLD)
  6. Ajustar estrategia si >VERY_SLOW_THRESHOLD
- **Retorna:** Resultado de la función

#### getOptimizationStrategy(fileSize)
- **Propósito:** Calcular estrategia óptima basada en historial
- **Retorna:** `{ useStreaming, chunkSize, compressionLevel, parallelChunks }`
- **Decisiones:**
  - useStreaming: fileSize > adaptiveThresholds.streaming || predictedTime > 2s
  - chunkSize: 256KB-1MB según avgSpeed
  - compressionLevel: 0.6-1.0 según predictedUploadTime
  - parallelChunks: 2-4 según avgSpeed

#### getAverageMetrics(operation)
- **Retorna:** `{ avgDuration, avgSize, avgSpeed, count }`
- **Cálculo de Speed:** (avgSize / avgDuration) / 1024 (MB/s)

### 🎯 Thresholds Adaptativos

**Iniciales:**
```typescript
adaptiveThresholds = {
  streaming: 5 * 1024 * 1024,      // 5MB
  compression: 2 * 1024 * 1024,    // 2MB
}
```

**Ajuste Dinámico:**
- Si operación > VERY_SLOW_THRESHOLD (3s) → reduce streaming threshold
- Si avgSpeed < 1 MB/s → reduce chunk size
- Si avgSpeed > 5 MB/s → aumenta chunk size

### ⚡ Ejemplo de Uso

```typescript
import { performanceOptimizer } from '@/utils/performanceOptimizer';

// Encriptar con optimización
const encryptFile = async (data: string) => {
  return await performanceOptimizer.measureAndOptimize(
    'encrypt',
    async (input) => {
      // Lógica de encriptación
      return encryptedData;
    },
    data
  );
};

// Obtener estrategia para upload
const uploadLargeFile = async (uri: string, size: number) => {
  const strategy = performanceOptimizer.getOptimizationStrategy(size);

  console.log('Estrategia:', strategy);
  // {
  //   useStreaming: true,
  //   chunkSize: 512000,
  //   compressionLevel: 0.8,
  //   parallelChunks: 3
  // }

  if (strategy.useStreaming) {
    await uploadInChunks(uri, strategy.chunkSize, strategy.parallelChunks);
  } else {
    await uploadDirect(uri);
  }
};

// Ver stats
const stats = performanceOptimizer.getAverageMetrics('encrypt');
console.log(`Avg: ${stats.avgDuration}ms, Speed: ${stats.avgSpeed} MB/s`);
```

### 📊 Métricas Almacenadas

**PerformanceMetric interface:**
```typescript
{
  duration: number;      // Milisegundos
  size: number;          // Bytes
  timestamp: number;     // Date.now()
  operation: string;     // Nombre de operación
}
```

**Límite:** Mantiene solo últimas 10 métricas por operación (MAX_METRICS)

---

## 🌐 FEATURE: Offline-First Architecture

**Componentes:** NetworkMonitorService, OfflineQueue, LocalDataService, OfflineSyncContext, OfflineIndicator

### 🏗️ Arquitectura Completa

```
┌─────────────────────────────────────────────────────┐
│             Offline-First System                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Network Monitor                                 │
│     ├─ Detecta online/offline                      │
│     ├─ Trigger sync on reconnect                   │
│     └─ Provides isOnline()                         │
│                                                     │
│  2. Offline Queue (AsyncStorage)                    │
│     ├─ create_trick                                │
│     ├─ update_trick                                │
│     ├─ delete_trick                                │
│     ├─ toggle_favorite                             │
│     └─ Retry: max 3 attempts, exponential backoff  │
│                                                     │
│  3. Local Data Service                              │
│     ├─ AsyncStorage (persistente)                  │
│     ├─ In-memory cache (rápido)                    │
│     ├─ Flags: _pendingSync, _isLocalOnly          │
│     └─ getPendingTricks(), getPendingCategories()  │
│                                                     │
│  4. Offline Sync Context                            │
│     ├─ Estado: isOnline, isSyncing, pendingOps    │
│     ├─ Auto-sync: reconnect, app foreground       │
│     └─ Manual: syncNow()                           │
│                                                     │
│  5. Offline Indicator UI                            │
│     ├─ Visual: offline status, pending count      │
│     └─ Tap: manual sync trigger                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 🔄 Flujo de Operación Offline

```
Usuario crea truco sin conexión
         ↓
1. LocalDataService.addTrick(trick, isLocalOnly=true)
   - Guarda en memoria con flag _isLocalOnly=true
   - Persiste a AsyncStorage
   - UI se actualiza inmediatamente
         ↓
2. OfflineQueue.enqueue({
     type: 'create_trick',
     payload: { trick },
     timestamp: Date.now()
   })
   - Guarda operación en AsyncStorage
         ↓
3. OfflineIndicator muestra "1 operación pendiente"
         ↓
[Usuario recupera conexión]
         ↓
4. NetworkMonitor detecta reconnect
         ↓
5. OfflineSyncContext.syncNow()
   - isSyncing = true
   - Procesa cola de operaciones
         ↓
6. OfflineQueue.processQueue()
   - Toma operación más antigua
   - Ejecuta en Supabase
   - Si éxito: elimina de cola
   - Si fallo: incrementa retry count
   - Si retry >= 3: marca como 'failed'
         ↓
7. LocalDataService actualiza flags
   - _isLocalOnly = false
   - _pendingSync = false
         ↓
8. OfflineIndicator muestra "Sincronizado ✓"
```

### 🔗 Integración en Componentes

```typescript
import { useOfflineSync } from '@/context/OfflineSyncContext';

const CreateTrickScreen = () => {
  const { isOnline, pendingOperations } = useOfflineSync();

  const handleCreate = async (trick: MagicTrick) => {
    // Guardar localmente
    await localDataService.addTrick(userId, trick, !isOnline);

    if (!isOnline) {
      // Queue para después
      await offlineQueueService.enqueue({
        userId,
        type: 'create_trick',
        payload: { trick }
      });

      alert('Truco guardado. Se sincronizará al conectar.');
    } else {
      // Guardar en servidor
      await supabase.from('magic_tricks').insert(trick);
    }
  };

  return (
    <View>
      {!isOnline && (
        <Text>Modo offline - {pendingOperations} operaciones pendientes</Text>
      )}
      {/* ... */}
    </View>
  );
};
```

---

## 🔄 FEATURE: Real-time Subscriptions (Supabase)

**Propósito:** Sincronización en tiempo real de datos entre dispositivos usando Supabase Realtime.

### 🏗️ Arquitectura

```
┌────────────────────────────────────────────────┐
│        Supabase Realtime System                │
├────────────────────────────────────────────────┤
│                                                │
│  Client (Device A)                             │
│    ├─ LibraryDataContext                      │
│    ├─ Subscribe to channel:                   │
│    │   `user_library_{userId}`                │
│    └─ Listen to postgres_changes              │
│              │                                 │
│              ▼                                 │
│  Supabase Server                               │
│    ├─ Detecta INSERT/UPDATE/DELETE            │
│    ├─ Filtra por user_id                      │
│    └─ Broadcast a todos los clientes          │
│              │                                 │
│              ▼                                 │
│  Client (Device B)                             │
│    ├─ Recibe evento                           │
│    ├─ Actualiza LocalDataService              │
│    └─ Re-renderiza UI                         │
│                                                │
└────────────────────────────────────────────────┘
```

### 📋 Tablas Suscritas

**LibraryDataContext suscribe a:**
1. `magic_tricks` - Cambios en trucos
2. `user_categories` - Cambios en categorías
3. `trick_categories` - Cambios en relación truco-categoría
4. `user_favorites` - Cambios en favoritos

### 🔧 Implementación

```typescript
// context/LibraryDataContext.tsx
useEffect(() => {
  if (!userId) return;

  const channel = supabase
    .channel(`user_library_${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'magic_tricks',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      console.log('Cambio en magic_tricks:', payload);

      if (payload.eventType === 'INSERT') {
        // Agregar truco a local cache
        localDataService.addTrickFromRealtime(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        // Actualizar truco en local cache
        localDataService.updateTrickFromRealtime(payload.new);
      } else if (payload.eventType === 'DELETE') {
        // Eliminar truco de local cache
        localDataService.deleteTrickFromRealtime(payload.old.id);
      }

      // Re-build sections con nuevo dato
      buildSections();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

### 🎯 Casos de Uso

**Escenario 1: Usuario edita truco en móvil**
```
Device A (iPhone)
  └─ Edita título de truco
       ↓
  Supabase UPDATE magic_tricks
       ↓
  Realtime broadcast
       ↓
Device B (iPad)
  └─ Recibe evento UPDATE
       ↓
  LocalDataService actualiza cache
       ↓
  UI se actualiza automáticamente
```

**Escenario 2: Usuario agrega favorito en tablet**
```
Device B (iPad)
  └─ Toggle favorite
       ↓
  Supabase INSERT user_favorites
       ↓
  Realtime broadcast
       ↓
Device A (iPhone)
  └─ Recibe evento INSERT
       ↓
  Actualiza lista de favoritos
       ↓
  Categoría "Favoritos" se actualiza
```

### ⚡ Performance

**Optimizaciones:**
- **Debounce:** Evitar re-renders excesivos (300ms)
- **Batch updates:** Agrupar cambios antes de re-build
- **Filtrado por user_id:** Solo recibe eventos propios

---

## 🎬 FEATURE: Video Compression Strategy

**Componentes:** VideoAnalysisService, VideoService, CompressionService

### 🧠 Sistema de Análisis Inteligente

```
┌───────────────────────────────────────────────────┐
│        Video Compression Strategy                 │
├───────────────────────────────────────────────────┤
│                                                   │
│  1. VideoAnalysisService.analyzeVideo(uri)        │
│     ├─ Obtiene metadata (expo-video-thumbnails)  │
│     ├─ Extrae: duration, size, width, height     │
│     └─ Calcula bitrate                           │
│              │                                    │
│              ▼                                    │
│  2. Decisión de Compresión                        │
│     ├─ Size > 20MB? → Comprimir                  │
│     ├─ Duration > 10 min? → Rechazar             │
│     ├─ Bitrate > 10 Mbps? → Comprimir            │
│     └─ Resolution > 1080p? → Comprimir           │
│              │                                    │
│              ▼                                    │
│  3. Selección de Calidad                          │
│     ├─ >50MB or >8min → "low"                    │
│     ├─ >30MB or >5min → "medium"                 │
│     └─ <30MB → "high"                            │
│              │                                    │
│              ▼                                    │
│  4. VideoService.compressVideo(uri, quality)      │
│     └─ react-native-compressor                   │
│              │                                    │
│              ▼                                    │
│  5. Resultado: URI de video comprimido            │
│                                                   │
└───────────────────────────────────────────────────┘
```

### 📊 Análisis de Video

**VideoAnalysisService.analyzeVideo(uri):**

```typescript
interface VideoAnalysis {
  isValid: boolean;
  shouldCompress: boolean;
  recommendedQuality: 'low' | 'medium' | 'high';
  metadata: {
    duration: number;       // Segundos
    size: number;           // Bytes
    width: number;
    height: number;
    bitrate: number;        // Mbps
  };
  warnings: string[];
  errors: string[];
}
```

**Lógica de Decisión:**

```typescript
// Tamaño
if (size > 100 * 1024 * 1024) {
  warnings.push('Archivo muy grande (>100MB)');
}

if (size > 20 * 1024 * 1024) {
  shouldCompress = true;
}

// Duración
if (duration > 600) { // 10 min
  errors.push('Video excede duración máxima de 10 minutos');
  isValid = false;
}

// Bitrate
if (bitrate > 10) {
  shouldCompress = true;
  warnings.push('Bitrate alto, se recomienda comprimir');
}

// Calidad recomendada
if (size > 50 * 1024 * 1024 || duration > 480) {
  recommendedQuality = 'low';
} else if (size > 30 * 1024 * 1024 || duration > 300) {
  recommendedQuality = 'medium';
} else {
  recommendedQuality = 'high';
}
```

### ⚡ Uso en FileUploadService

```typescript
// services/fileUploadService.ts
const uploadVideo = async (uri: string, userId: string, onProgress) => {
  // 1. Analizar
  const analysis = await videoAnalysisService.analyzeVideo(uri);

  if (!analysis.isValid) {
    throw new Error(analysis.errors.join(', '));
  }

  // 2. Comprimir si necesario
  let finalUri = uri;
  if (analysis.shouldCompress && videoService.isCompressionAvailable()) {
    finalUri = await videoService.compressVideo(uri, analysis.recommendedQuality);
  }

  // 3. Upload
  const result = await cloudflareStreamService.uploadVideo(
    finalUri,
    { userId },
    onProgress
  );

  return result.url;
};
```

### 📈 Resultados Típicos

| Original | Comprimido (low) | Comprimido (medium) | Comprimido (high) |
|----------|------------------|---------------------|-------------------|
| 145 MB   | 28 MB (-81%)     | 45 MB (-69%)        | 78 MB (-46%)      |
| 4K 60fps | 1080p 30fps      | 1080p 30fps         | 1080p 60fps       |
| 18 Mbps  | 3.5 Mbps         | 5.5 Mbps            | 9.5 Mbps          |

---

## 🔍 FEATURE: Search System (FTS + Híbrido)

**Componentes:** HybridSearchService, Supabase FTS, SearchContext

### 🏗️ Arquitectura Híbrida

```
┌────────────────────────────────────────────────────┐
│           Hybrid Search System                     │
├────────────────────────────────────────────────────┤
│                                                    │
│  HybridSearchService.search(query, userId)         │
│           │                                        │
│           ▼                                        │
│    ┌──────────────┐                               │
│    │ Trick count? │                               │
│    └───┬──────┬───┘                               │
│        │      │                                    │
│    <500│      │≥500                                │
│        │      │                                    │
│        ▼      ▼                                    │
│   ┌─────────────┐   ┌──────────────────────┐     │
│   │Client Search│   │  Server Search (FTS) │     │
│   │JavaScript   │   │  PostgreSQL + GIN    │     │
│   │filter()     │   │  search_vector       │     │
│   └─────────────┘   └──────────────────────┘     │
│        │                     │                     │
│        └─────────┬───────────┘                     │
│                  ▼                                 │
│           Resultados filtrados                     │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 🔎 Full-Text Search (PostgreSQL)

**search_vector column:**
```sql
ALTER TABLE magic_tricks
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(effect, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(secret, '')), 'C')
) STORED;

CREATE INDEX idx_magic_tricks_search_vector
ON magic_tricks
USING GIN (search_vector);
```

**Trigger auto-update:**
```sql
CREATE TRIGGER tsvector_update_trigger
BEFORE INSERT OR UPDATE ON magic_tricks
FOR EACH ROW
EXECUTE FUNCTION tsvector_update_trigger(search_vector, 'simple', title, effect, secret);
```

### 📋 HybridSearchService

**shouldUseServerSearch(trickCount):**
```typescript
const HYBRID_THRESHOLD = 500;

if (trickCount >= HYBRID_THRESHOLD) {
  return true; // Usar FTS en servidor
} else {
  return false; // Filtrar en cliente
}
```

**searchOnServer(query, userId):**
```typescript
const { data } = await supabase
  .from('magic_tricks')
  .select('*')
  .eq('user_id', userId)
  .textSearch('search_vector', query, {
    type: 'websearch',
    config: 'simple'
  });

return data;
```

**searchOnClient(query, tricks):**
```typescript
const lowerQuery = query.toLowerCase();

return tricks.filter(trick => {
  return (
    trick.title.toLowerCase().includes(lowerQuery) ||
    trick.effect.toLowerCase().includes(lowerQuery) ||
    trick.secret.toLowerCase().includes(lowerQuery)
  );
});
```

### 🎯 Query Syntax (websearch_to_tsquery)

**Ejemplos:**
```
"double lift"     → Exact phrase search
cards OR coins    → Either word
-invisible        → Exclude word
deck palm         → Both words (AND)
```

### ⚡ Performance

| Método | Trick Count | Latencia | Precisión |
|--------|-------------|----------|-----------|
| Client | <500        | ~5-20ms  | Substring match |
| Server | ≥500        | ~50-200ms| Full-text relevance |

**GIN Index Stats:**
- **Scans:** 0.5-2ms con index
- **Heap Fetches:** Minimal con covering index
- **Efectividad:** 100x más rápido que LIKE '%query%'

### 🔗 Integración con SearchContext

```typescript
// context/SearchContext.tsx
const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery] = useDebounce(searchQuery, 300);

// context/LibraryDataContext.tsx
useEffect(() => {
  const performSearch = async () => {
    if (!debouncedQuery) {
      buildSections(); // Show all
      return;
    }

    const trickCount = tricks.length;
    const results = await hybridSearchService.search(
      debouncedQuery,
      userId,
      trickCount
    );

    setSections(buildSectionsFromResults(results));
  };

  performSearch();
}, [debouncedQuery]);
```

---

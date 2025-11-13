# 🔍 Flujo de Búsqueda en Home Page

## 📊 Diagrama del Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│ HOME PAGE (app/(app)/home/index.tsx)                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CompactSearchBar                                                     │
│ Usuario escribe: "carta mazo"                                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SearchContext                                                        │
│ setSearchQuery("carta mazo")                                        │
│ setSearchFilters({ categories: [...], ... })                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ LibraryDataContext                                                   │
│ Detecta cambio en searchQuery                                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │ ¿Cuántos    │
                    │ trucos?     │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                                 ▼
    < 500 trucos                      >= 500 trucos
          │                                 │
          ▼                                 ▼
┌──────────────────────┐         ┌──────────────────────┐
│ BÚSQUEDA EN CLIENTE  │         │ BÚSQUEDA EN SERVIDOR │
│ (JavaScript)         │         │ (PostgreSQL FTS)     │
└──────┬───────────────┘         └──────┬───────────────┘
       │                                │
       │ buildSections()                │ HybridSearchService
       │ - Filtrado JS                  │   .searchOnServer()
       │ - includes()                   │
       │ - Lento con                    │
       │   muchos datos                 │
       │                                │
       └────────────┬───────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ searchOnServer()     │
         │ (Solo si >= 500)     │
         └──────────┬───────────┘
                    │
                    ▼
         ┌─────────────────────────────────────────────┐
         │ Supabase Query                              │
         │                                             │
         │ supabase                                    │
         │   .from("magic_tricks")                     │
         │   .select("*")                              │
         │   .eq("user_id", userId)                    │
         │   .filter('search_vector', 'fts',           │
         │     `websearch_to_tsquery('simple',         │ ← AQUÍ SE USA
         │       'carta mazo')`)                       │   TU FTS OPTIMIZADO
         │                                             │
         └──────────┬──────────────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────────────┐
         │ PostgreSQL                                  │
         │                                             │
         │ 1. Lee índice GIN                           │ ← ULTRA RÁPIDO
         │    idx_magic_tricks_search_vector           │   (0.5-2ms)
         │                                             │
         │ 2. Busca en search_vector                   │
         │    (columna pre-calculada)                  │
         │                                             │
         │ 3. Retorna filas que coinciden              │
         │                                             │
         └──────────┬──────────────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────────────┐
         │ transformToLocalTricks()                    │
         │ Convierte resultado DB a LocalTrick[]       │
         └──────────┬──────────────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────────────┐
         │ buildSections()                             │
         │ Agrupa trucos por categorías                │
         │ - Favoritos (virtual)                       │
         │ - Categorías del usuario                    │
         └──────────┬──────────────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────────────┐
         │ LibrariesSection                            │
         │ Renderiza categorías con trucos filtrados   │
         └──────────┬──────────────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────────────┐
         │ CollapsibleCategoryOptimized                │
         │ Muestra cada categoría con sus trucos       │
         │ - Favoritos (siempre visible ahora)         │
         │ - Otras categorías                          │
         └─────────────────────────────────────────────┘
```

---

## ⚡ Cuándo se USA el FTS Optimizado

### ✅ SÍ se usa (Búsqueda en servidor):

```typescript
// Condición en LibraryDataContext.tsx:515
const shouldUseServer = hybridSearchService.shouldUseServerSearch(rawTricks.length);
// shouldUseServerSearch() retorna true si rawTricks.length >= 500

if (shouldUseServer && currentQuery.trim()) {
  // ✅ AQUÍ SE USA TU FTS OPTIMIZADO
  const { tricks } = await hybridSearchService.hybridSearch(
    currentUserId,
    rawTricks,
    currentQuery,  // "carta mazo"
    currentFilters
  );
}
```

### ❌ NO se usa (Búsqueda en cliente):

```typescript
// Si tienes < 500 trucos
if (rawTricks.length < 500) {
  // ❌ NO usa FTS de PostgreSQL
  // ❌ Usa buildSections() con filtrado JavaScript
  // ❌ Más lento pero suficiente para pocos trucos
  const newSections = buildSections(
    allCategories,
    rawTricks,
    currentQuery,  // Filtra con .includes() en JS
    currentFilters
  );
}
```

---

## 🎯 Ejemplo Práctico

### Escenario A: Usuario con 50 trucos

```
Usuario busca: "carta mazo"
    ↓
LibraryDataContext detecta: 50 < 500 trucos
    ↓
❌ NO usa FTS de PostgreSQL
❌ Búsqueda en JavaScript (buildSections)
    ↓
Filtra trucos con:
  trick.title.toLowerCase().includes("carta mazo") ||
  trick.effect.toLowerCase().includes("carta mazo") ||
  trick.secret.toLowerCase().includes("carta mazo")
    ↓
Tiempo: ~5-20ms (rápido porque solo 50 trucos)
    ↓
Resultado: Trucos filtrados se muestran en home
```

### Escenario B: Usuario con 600 trucos

```
Usuario busca: "carta mazo"
    ↓
LibraryDataContext detecta: 600 >= 500 trucos
    ↓
✅ USA FTS de PostgreSQL (searchOnServer)
    ↓
Query a Supabase:
  SELECT * FROM magic_tricks
  WHERE user_id = 'xxx'
    AND search_vector @@ websearch_to_tsquery('simple', 'carta mazo')
    ↓
PostgreSQL usa índice GIN idx_magic_tricks_search_vector
    ↓
Tiempo: ~0.5-2ms (ULTRA RÁPIDO incluso con 600 trucos)
    ↓
Resultado: Trucos filtrados se muestran en home
```

---

## 📍 Archivos Involucrados

| Archivo | Responsabilidad | ¿Usa FTS? |
|---------|-----------------|-----------|
| **`app/(app)/home/index.tsx`** | Home page principal | No |
| **`components/home/CompactSearchBar.tsx`** | Input de búsqueda | No |
| **`context/SearchContext.tsx`** | Estado de búsqueda | No |
| **`context/LibraryDataContext.tsx:512-561`** | Decide cliente vs servidor | **Sí (si >= 500)** |
| **`services/HybridSearchService.ts:25-121`** | **Query FTS a Supabase** | **✅ SÍ (línea 52-58)** |
| **`components/home/LibrariesSection.tsx`** | Renderiza resultados | No |
| **`components/home/CollapsibleCategoryOptimized.tsx`** | Muestra categorías | No |

---

## 🔧 Dónde está el FTS Exactamente

**Archivo:** `services/HybridSearchService.ts`

**Líneas:** 47-59

```typescript
if (query.trim()) {
  const sanitizedQuery = query.trim().replace(/'/g, "''");

  // 🎯 AQUÍ ES DONDE SE USA TU FTS OPTIMIZADO
  supabaseQuery = supabaseQuery.filter(
    'search_vector',           // ← Columna tsvector pre-calculada
    'fts',                     // ← Full-Text Search operator
    `websearch_to_tsquery('simple', '${sanitizedQuery}')`
  );
  //                      ↑
  //          Configuración 'simple' = multi-idioma
}
```

Esto se traduce a SQL:

```sql
SELECT *
FROM magic_tricks
WHERE user_id = 'xxx'
  AND search_vector @@ websearch_to_tsquery('simple', 'carta mazo')
  --  ↑↑↑↑↑↑↑↑↑↑↑↑↑
  --  Esta columna tiene el índice GIN (ULTRA RÁPIDO)
```

---

## ✅ Resumen: ¿Funciona en la home page?

### **SÍ, funciona en la home page cuando:**

1. ✅ El usuario tiene **>= 500 trucos**
2. ✅ El usuario **escribe algo en la búsqueda**
3. ✅ Has ejecutado la migración SQL (`FTS_MULTILANGUAGE_MIGRATION.sql`)

### **NO se usa cuando:**

1. ❌ El usuario tiene **< 500 trucos** (usa JavaScript en su lugar)
2. ❌ La búsqueda está **vacía** (no hay query)
3. ❌ No has ejecutado la migración SQL (columna `search_vector` no existe)

---

## 🚀 Para Activarlo AHORA:

1. **Ejecuta la migración:**
   ```sql
   -- En Supabase SQL Editor
   -- Ejecuta: FTS_MULTILANGUAGE_MIGRATION.sql
   ```

2. **Funcionará automáticamente cuando:**
   - Usuario busque en home page
   - Y tenga >= 500 trucos

3. **Para probar CON < 500 trucos:**
   ```typescript
   // Puedes cambiar el umbral temporalmente en HybridSearchService.ts:12
   const HYBRID_THRESHOLD = 1; // Era 500, cambia a 1 para testing
   ```

---

¿Quieres que cambiemos el umbral a un valor más bajo para que uses FTS desde el principio, o lo dejamos en 500?

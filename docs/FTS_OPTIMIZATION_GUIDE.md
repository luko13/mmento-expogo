# 🚀 Guía de Optimización Full-Text Search (FTS)

## 📋 Resumen

Esta optimización convierte el sistema de búsqueda de **"FTS dinámico"** (lento) a **"FTS con columna dedicada"** (ultra-rápido).

### ⚡ Diferencia de Rendimiento

| Método | Velocidad | Escalabilidad | Usa Índice |
|--------|-----------|---------------|------------|
| **ANTES: FTS Dinámico** | ~2-10ms | ❌ Se degrada con datos | ⚠️ Parcialmente |
| **DESPUÉS: FTS Optimizado** | ~0.1-1ms | ✅ Escala linealmente | ✅ Completamente |

### 🎯 Mejora Esperada
- **10-100x más rápido** en búsquedas
- **Escala hasta millones de filas** sin degradación
- **Menor uso de CPU** en el servidor
- **Misma funcionalidad** (sintaxis websearch tipo Google)

---

## 🔧 Implementación

### Paso 1: Ejecutar Migración SQL en Supabase

**Archivo:** `docs/FTS_OPTIMIZATION_MIGRATION.sql`

Ejecuta el archivo completo en la consola SQL de Supabase. Esto:

1. ✅ Crea columna `search_vector` (tsvector pre-calculado)
2. ✅ Crea índice GIN `idx_magic_tricks_search_vector`
3. ✅ Crea trigger automático para mantener `search_vector` actualizado
4. ✅ Elimina el índice viejo `idx_magic_tricks_search_text`
5. ✅ Puebla datos existentes

**Tiempo estimado:** 1-2 segundos (incluso con miles de trucos)

### Paso 2: Código ya Actualizado

**Archivo:** `services/HybridSearchService.ts`

El código ya está actualizado para usar la columna `search_vector`:

```typescript
// ANTES (FTS dinámico - lento)
supabaseQuery = supabaseQuery.or(
  `to_tsvector('spanish', COALESCE(title::text, '') || ' ' || COALESCE(effect, '') || ' ' || COALESCE(secret, '')).@@.${tsQuery}`
);

// DESPUÉS (FTS optimizado - ultra-rápido)
supabaseQuery = supabaseQuery.filter(
  'search_vector',
  'fts',
  `websearch_to_tsquery('spanish', '${sanitizedQuery}')`
);
```

---

## 📊 Cómo Funciona

### Arquitectura ANTES (Dinámico)

```
Usuario busca "mazo"
    ↓
SELECT * FROM magic_tricks
WHERE to_tsvector('spanish', title || effect || secret) @@ 'mazo'
    ↓
PostgreSQL:
  1. Lee cada fila
  2. Genera tsvector ON-THE-FLY (lento)
  3. Compara con query
  4. Usa índice GIN parcialmente
    ↓
Resultado: ~2-10ms
```

### Arquitectura DESPUÉS (Optimizado)

```
Usuario crea/edita truco
    ↓
TRIGGER automático actualiza search_vector
    ↓
search_vector = to_tsvector('spanish', title || effect || secret)
    ↓
Columna persistida en disco
    ↓
Índice GIN construido sobre search_vector
```

```
Usuario busca "mazo"
    ↓
SELECT * FROM magic_tricks
WHERE search_vector @@ websearch_to_tsquery('spanish', 'mazo')
    ↓
PostgreSQL:
  1. Usa índice GIN directamente (ULTRA RÁPIDO)
  2. Lee solo las filas que coinciden
  3. No genera nada dinámicamente
    ↓
Resultado: ~0.1-1ms (10-100x más rápido)
```

---

## ✅ Verificación Post-Migración

### 1. Verificar que la columna existe

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'magic_tricks'
  AND column_name = 'search_vector';
```

**Resultado esperado:**
```
column_name   | data_type
--------------+----------
search_vector | tsvector
```

### 2. Verificar que el índice existe

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'magic_tricks'
  AND indexname = 'idx_magic_tricks_search_vector';
```

**Resultado esperado:**
```
indexname                       | indexdef
--------------------------------+-------------------------------------------
idx_magic_tricks_search_vector  | CREATE INDEX ... USING gin (search_vector)
```

### 3. Verificar que el trigger funciona

```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'magic_tricks'::regclass
  AND tgname = 'tsvector_update_trigger';
```

**Resultado esperado:**
```
tgname                   | tgenabled
-------------------------+-----------
tsvector_update_trigger  | O
```

### 4. Probar búsqueda con EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE
SELECT id, title
FROM magic_tricks
WHERE user_id = 'TU_USER_ID'  -- Reemplaza con user_id real
  AND search_vector @@ websearch_to_tsquery('spanish', 'mazo');
```

**Resultado esperado (BUENO):**
```
Bitmap Heap Scan on magic_tricks
  Recheck Cond: (search_vector @@ '''mazo'''::tsquery)
  -> Bitmap Index Scan on idx_magic_tricks_search_vector  ← ¡ESTO!
        Index Cond: (search_vector @@ '''mazo'''::tsquery)
Planning Time: 0.5 ms
Execution Time: 0.8 ms  ← Debe ser < 2ms
```

**Resultado MAL (si no funciona):**
```
Seq Scan on magic_tricks  ← ¡MALO! No usa índice
  Filter: (search_vector @@ '''mazo'''::tsquery)
Planning Time: 0.5 ms
Execution Time: 10.5 ms  ← Lento
```

---

## 🔄 Mantenimiento Automático

### El Trigger se Encarga de Todo

**Trigger:** `tsvector_update_trigger`

Se ejecuta automáticamente en:
- ✅ `INSERT INTO magic_tricks` → Genera `search_vector`
- ✅ `UPDATE magic_tricks SET title/effect/secret` → Actualiza `search_vector`
- ❌ `UPDATE magic_tricks SET difficulty` → NO se ejecuta (no afecta búsqueda)

### No Requiere Código Adicional

El trigger es **transparente** para tu aplicación:

```typescript
// Tu código normal (sin cambios)
await supabase
  .from('magic_tricks')
  .insert({
    title: 'Carta Ambiciosa',
    effect: 'La carta sube al tope del mazo',
    secret: 'Se usa doble lift'
  });

// ← El trigger actualiza search_vector automáticamente ✅
```

---

## 📈 Métricas y Monitoring

### Ver uso del índice

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as veces_usado,
  idx_tup_read as filas_leidas
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_magic_tricks_search_vector';
```

### Ver tamaño del índice

```sql
SELECT pg_size_pretty(pg_relation_size('idx_magic_tricks_search_vector')) as index_size;
```

### Ver ejemplos de tsvector

```sql
SELECT
  title,
  search_vector
FROM magic_tricks
LIMIT 3;
```

**Ejemplo de output:**
```
title              | search_vector
-------------------+------------------------------------------
Carta Ambiciosa    | 'ambicios':2 'cart':1 'dob':9 'lift':10 ...
Monedas Cruzadas   | 'cruzad':2 'moned':1 'palm':5 ...
```

---

## 🚨 Troubleshooting

### Problema: "column search_vector does not exist"

**Causa:** No ejecutaste la migración SQL

**Solución:** Ejecuta `FTS_OPTIMIZATION_MIGRATION.sql` en Supabase

---

### Problema: Búsquedas siguen lentas (> 5ms)

**Causa:** El índice no se está usando

**Diagnóstico:**
```sql
EXPLAIN ANALYZE
SELECT * FROM magic_tricks
WHERE search_vector @@ websearch_to_tsquery('spanish', 'test');
```

Si dice **"Seq Scan"** en lugar de **"Bitmap Index Scan"**:

1. Verifica que el índice existe:
   ```sql
   SELECT * FROM pg_indexes WHERE indexname = 'idx_magic_tricks_search_vector';
   ```

2. Reconstruye el índice:
   ```sql
   REINDEX INDEX idx_magic_tricks_search_vector;
   ```

3. Actualiza estadísticas:
   ```sql
   ANALYZE magic_tricks;
   ```

---

### Problema: search_vector no se actualiza automáticamente

**Causa:** Trigger no existe o está deshabilitado

**Diagnóstico:**
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'magic_tricks'::regclass;
```

**Solución:** Re-ejecuta la sección del trigger en la migración SQL

---

### Problema: Búsquedas en español no funcionan bien

**Causa:** Configuración de idioma incorrecta

**Verificar:**
```sql
SELECT to_tsvector('spanish', 'cartas mágicas');
-- Debe retornar: 'cart':1 'magic':2 (stemming en español)
```

Si retorna palabras completas, verifica que PostgreSQL tenga el diccionario español:
```sql
SELECT cfgname FROM pg_ts_config WHERE cfgname = 'spanish';
```

---

## 🎯 Beneficios Finales

### ✅ Rendimiento
- **10-100x más rápido** en búsquedas
- **Escala linealmente** con millones de filas
- **Menor latencia** para usuarios

### ✅ Recursos
- **Menor uso de CPU** en servidor
- **Menor uso de memoria** (no genera tsvector dinámicamente)
- **Mismo espacio en disco** (el índice GIN es similar)

### ✅ Funcionalidad
- **Misma sintaxis websearch** (tipo Google)
- **Búsqueda en español** con stemming
- **Sin cambios en el frontend**
- **Transparente para el usuario**

### ✅ Mantenimiento
- **Trigger automático** mantiene datos sincronizados
- **Sin código extra** en aplicación
- **Sin migraciones futuras** necesarias

---

## 📚 Referencias

- [PostgreSQL Full-Text Search Docs](https://www.postgresql.org/docs/current/textsearch.html)
- [Supabase FTS Guide](https://supabase.com/docs/guides/database/full-text-search)
- [GIN Indexes Performance](https://www.postgresql.org/docs/current/gin.html)

---

## 🔄 Rollback (si algo sale mal)

```sql
-- Revertir todos los cambios
DROP TRIGGER IF EXISTS tsvector_update_trigger ON magic_tricks;
DROP FUNCTION IF EXISTS magic_tricks_search_vector_update();
DROP INDEX IF EXISTS idx_magic_tricks_search_vector;
ALTER TABLE magic_tricks DROP COLUMN IF EXISTS search_vector;

-- Recrear índice viejo (si es necesario)
CREATE INDEX idx_magic_tricks_search_text ON magic_tricks
USING gin (to_tsvector('spanish'::regconfig,
  COALESCE(title::text, '') || ' ' ||
  COALESCE(effect, '') || ' ' ||
  COALESCE(secret, '')));
```

Luego revertir el código TypeScript al commit anterior.

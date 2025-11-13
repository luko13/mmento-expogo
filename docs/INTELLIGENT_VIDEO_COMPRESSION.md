# Sistema Inteligente de Compresión de Videos

## 📖 Descripción General

Este sistema analiza automáticamente los videos antes de subirlos a Cloudflare Stream y decide inteligentemente si necesitan compresión local basándose en múltiples factores: duración, tamaño, resolución y bitrate.

## 🎯 Objetivos

1. **Optimizar tiempos de subida** - Comprimir solo cuando sea necesario
2. **Mantener calidad visual** - Usar compresión adaptativa según el exceso detectado
3. **Evitar doble compresión innecesaria** - Cloudflare ya recodifica, solo comprimimos lo excesivo
4. **Soportar videos hasta 10 minutos** - Límite configurable
5. **Ser robusto y mantenible** - Sistema que no requiera cambios frecuentes

## 🏗️ Arquitectura

### Componentes Principales

```
Usuario selecciona video
        ↓
┌───────────────────────────┐
│  videoAnalysisService     │ ← Analiza video
│  - Obtiene duración       │
│  - Calcula bitrate        │
│  - Detecta resolución     │
│  - Decide compresión      │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│  fileUploadService        │ ← Ejecuta decisión
│  - Comprime si necesario  │
│  - Sube a Cloudflare      │
│  - Limpia temporales      │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│  CloudflareStorageService │ ← Sube con TUS
│  - Maneja subida grande   │
│  - Reporta progreso       │
└───────────────────────────┘
        ↓
┌───────────────────────────┐
│  Cloudflare Stream        │ ← Recodifica final
│  - H.264 multi-bitrate    │
│  - Streaming adaptativo   │
└───────────────────────────┘
```

### Servicios

#### 1. `videoAnalysisService.ts`
**Propósito:** Análisis inteligente de videos

**Funcionalidades:**
- Detecta duración del video (usando expo-av temporalmente)
- Calcula bitrate real (MB/s → Mbps)
- Categoriza resolución (4K, 1080p, 720p, 480p)
- Compara con límites estándar de la industria
- Genera recomendación de compresión (none, high, medium, low)

**Límites configurados:**

| Resolución | Bitrate Max | MB/min Max | Uso típico |
|------------|-------------|------------|------------|
| 4K         | 35 Mbps     | 260 MB/min | Videos profesionales |
| 1080p      | 12 Mbps     | 90 MB/min  | Videos de alta calidad |
| 720p       | 8 Mbps      | 60 MB/min  | Videos estándar |
| 480p       | 5 Mbps      | 38 MB/min  | Videos básicos |

**Umbral de compresión:** 1.5x el límite recomendado
- Si bitrate real > límite × 1.5 → Comprimir

#### 2. `videoService.ts`
**Propósito:** Compresión de videos con react-native-compressor

**Calidades de compresión:**

| Calidad | Bitrate | Uso | Reducción típica |
|---------|---------|-----|------------------|
| **high** | 8 Mbps | Videos 1.5x-2.5x el límite | 30-50% |
| **medium** | 5 Mbps | Videos 2.5x-4x el límite | 50-70% |
| **low** | 2 Mbps | Videos >4x el límite | 70-85% |

**Características:**
- Valida reducción mínima del 10% (sino usa original)
- Reporta tiempo de compresión y estadísticas
- Limpia archivos temporales automáticamente

#### 3. `fileUploadService.ts`
**Propósito:** Orquestación del proceso de subida

**Flujo:**
1. Recibe video a subir
2. Llama a `videoAnalysisService.analyzeVideo()`
3. Si `shouldCompress === true`:
   - Llama a `videoService.compressVideo(quality)`
   - Reporta estadísticas de compresión
4. Sube video (original o comprimido) a Cloudflare
5. Limpia archivos temporales

## 📊 Ejemplos de Decisión

### Caso 1: Video pequeño bien optimizado
```
📊 ANÁLISIS DE VIDEO
────────────────────────────────────────
📁 Tamaño: 45.32 MB
⏱️  Duración: 3:00
📐 Resolución: 1920x1080 (1080p)
📊 Bitrate: 2.0 Mbps
📈 Tamaño/min: 15 MB/min
────────────────────────────────────────
✅ NO REQUIERE COMPRESIÓN
💡 El video está dentro de los límites recomendados
```
**Acción:** Subir directamente sin comprimir

---

### Caso 2: Video del usuario (1.4 GB, 3 min)
```
📊 ANÁLISIS DE VIDEO
────────────────────────────────────────
📁 Tamaño: 1407.50 MB
⏱️  Duración: 3:00
📐 Resolución: 3840x2160 (4K)
📊 Bitrate: 62.6 Mbps
📈 Tamaño/min: 469 MB/min
────────────────────────────────────────
⚠️  COMPRESIÓN RECOMENDADA: SEVERE (LOW)
💡 Bitrate alto detectado: 62.6 Mbps (1.8x el límite de 35 Mbps para 4K)
⚠️  ADVERTENCIAS:
   • Archivo muy grande (1408 MB). La subida puede tardar varios minutos.
```
**Acción:** Comprimir con calidad "low" (2 Mbps) → ~150-200 MB

---

### Caso 3: Video 1080p moderadamente alto
```
📊 ANÁLISIS DE VIDEO
────────────────────────────────────────
📁 Tamaño: 250.00 MB
⏱️  Duración: 5:00
📐 Resolución: 1920x1080 (1080p)
📊 Bitrate: 6.7 Mbps
📈 Tamaño/min: 50 MB/min
────────────────────────────────────────
✅ NO REQUIERE COMPRESIÓN
💡 El video está dentro de los límites recomendados
```
**Acción:** Subir directamente (bitrate < 12 Mbps × 1.5 = 18 Mbps)

---

### Caso 4: Video 10 minutos a alta calidad
```
📊 ANÁLISIS DE VIDEO
────────────────────────────────────────
📁 Tamaño: 1800.00 MB
⏱️  Duración: 10:00
📐 Resolución: 1920x1080 (1080p)
📊 Bitrate: 24.0 Mbps
📈 Tamaño/min: 180 MB/min
────────────────────────────────────────
⚠️  COMPRESIÓN RECOMENDADA: MODERATE (MEDIUM)
💡 Bitrate alto detectado: 24.0 Mbps (2.0x el límite de 12 Mbps para 1080p)
⚠️  ADVERTENCIAS:
   • Archivo muy grande (1800 MB). La subida puede tardar varios minutos.
```
**Acción:** Comprimir con calidad "medium" (5 Mbps) → ~400-450 MB

## 🔧 Configuración

### Límites Principales

Definidos en `services/videoAnalysisService.ts`:

```typescript
export const VIDEO_STANDARDS = {
  MAX_DURATION_SECONDS: 600, // 10 minutos máximo

  MAX_BITRATE_MBPS: {
    '4K': 35,
    '1080p': 12,
    '720p': 8,
    '480p': 5,
  },

  COMPRESSION_THRESHOLD: 1.5, // Comprimir si >1.5x el límite
};
```

### Ajustar Comportamiento

Para cambiar cuándo se comprime:

```typescript
// Más agresivo (comprimir más seguido)
COMPRESSION_THRESHOLD: 1.2  // Comprimir si >1.2x el límite

// Más conservador (comprimir menos)
COMPRESSION_THRESHOLD: 2.0  // Comprimir si >2x el límite
```

Para cambiar límite de duración:

```typescript
MAX_DURATION_SECONDS: 900, // 15 minutos
```

## 🧪 Testing

### Comandos útiles para logs

Los logs son muy detallados y muestran todo el proceso:

```javascript
// Buscar análisis de video en logs
🔍 Analizando video antes de subir...
📊 ANÁLISIS DE VIDEO

// Buscar decisión de compresión
⚠️  COMPRESIÓN RECOMENDADA
✅ NO REQUIERE COMPRESIÓN

// Buscar progreso de compresión
🗜️ Iniciando compresión de video
✅ Compresión completada en X.Xs
```

### Casos de prueba recomendados

1. **Video pequeño (< 50 MB, 1-2 min)** → No debe comprimir
2. **Video mediano bien optimizado (100-200 MB, 3-5 min)** → No debe comprimir
3. **Video grande de cámara (> 500 MB, 3-5 min)** → Debe comprimir con "medium" o "low"
4. **Video 4K (> 1 GB, < 5 min)** → Debe comprimir con "low"
5. **Video > 10 minutos** → Debe rechazar con error

## 📈 Mejoras Futuras

### Corto plazo
- [ ] Migrar de `expo-av` a `expo-video-metadata` (cuando actualices a SDK 54+)
- [ ] Agregar UI de "Analizando video..." durante el análisis
- [ ] Mostrar al usuario la estimación de tiempo de compresión

### Mediano plazo
- [ ] Caché de análisis (evitar re-analizar el mismo video)
- [ ] Modo "Ultra" para subir videos sin comprimir bajo demanda
- [ ] Estadísticas de usuario: "Has ahorrado X GB con compresión inteligente"

### Largo plazo
- [ ] Soporte para AV1 codec cuando Cloudflare lo soporte ampliamente
- [ ] Análisis de escenas (detectar si es video estático vs. alta acción)
- [ ] Machine Learning para predicción de bitrate óptimo

## 🚨 Troubleshooting

### "Compresión de video no disponible"
- **Causa:** Estás usando Expo Go o react-native-compressor no está instalado
- **Solución:** Usar dev client (`npm run build:dev:android/ios`)

### "No se pudo obtener duración del video"
- **Causa:** expo-av tiene problemas con algunos formatos de video
- **Solución:** El sistema usa heurística por tamaño (>300MB → comprimir)
- **Mejora:** Actualizar a SDK 54+ y usar expo-video-metadata

### Videos muy grandes siguen fallando
- **Causa:** Timeout de red o problemas de memoria
- **Solución:**
  1. Verificar que el umbral de compresión esté en 1.5 o menos
  2. Considerar reducir bitrate de compresión "low" a 1.5 Mbps
  3. Verificar logs de Cloudflare Stream para errores del lado servidor

### Compresión toma mucho tiempo
- **Es normal:** Videos grandes pueden tardar 30-60 segundos en comprimirse
- **Mejora:** Mostrar progreso al usuario con `react-native-compressor` progress callback

## 📚 Referencias

- [Cloudflare Stream Docs](https://developers.cloudflare.com/stream/)
- [YouTube Video Upload Specs](https://support.google.com/youtube/answer/1722171)
- [H.264 Bitrate Recommendations](https://support.google.com/youtube/answer/1722171)
- [TUS Protocol](https://tus.io/)
- [react-native-compressor](https://github.com/numandev1/react-native-compressor)

## 👤 Autor

Sistema diseñado e implementado para mmento por Claude Code (Anthropic) - Enero 2025

---

**¿Preguntas?** Consulta los logs detallados o revisa el código en:
- `services/videoAnalysisService.ts` - Lógica de análisis
- `services/videoService.ts` - Compresión
- `services/fileUploadService.ts` - Orquestación

FASE 1: CRÍTICO - Estabilidad (1-2 semanas)

Error boundaries (#28)
Memory leaks (#37)
Garbage collection crypto (#39)
Cancelar uploads (#26)
Limpiar cache archivos (#38)

FASE 2: PERFORMANCE INMEDIATO (2-3 semanas)

Paginación (#1)
Debounce búsquedas (#6)
Skeleton screens (#27)
Lazy loading componentes (#2)
Reducir re-renders (#7)

FASE 3: ESTADO Y CACHE (2 semanas)

Estado global Zustand (#13)
Cache React Query (#4)
Separar estado UI/datos (#14)
Normalizar datos (#15)
Memoización (#3)

FASE 4: CIFRADO OPTIMIZADO (2-3 semanas)

Workers para cifrado (#8)
Cifrado por chunks (#9)
Cache claves públicas (#10)
Batch decryption mejorado (#11)
Lazy decryption (#12)

FASE 5: BASE DE DATOS (2 semanas)

Índices Supabase (#17)
Views materializadas (#18)
Reducir JOINs (#19)
Batch inserts (#20)
Soft deletes (#21)

FASE 6: MULTIMEDIA (2-3 semanas)

Compresión video (#22)
Thumbnails precalculados (#23)
Progressive loading imágenes (#24)
Reducir tamaño imágenes (#40)
CDN archivos (#24)

FASE 7: UX/INTERACCIONES (2 semanas)

Optimistic updates (#5)
Gesture handlers nativos (#30)
Haptic feedback (#31)
Offline mode (#29)
Persistencia selectiva (#16)

FASE 8: ARQUITECTURA (3-4 semanas)

Service layer (#33)
Separar lógica negocio (#32)
Queue system (#34)
Background tasks (#35)
Modularizar bundle (#36)

FASE 9: RED Y SINCRONIZACIÓN (2 semanas)

Retry logic (#41)
Connection pooling (#42)
Prefetch datos (#43)
Delta sync (#44)
WebSocket real-time (#45)

FASE 10: CALIDAD Y MANTENIMIENTO (Ongoing)

TypeScript estricto (#46)
Testing (#47)
Monitoring producción (#48)
Analytics (#49)
Documentación cifrado (#50)



Basándome en el análisis del código y la guía de optimización, aquí está el planning detallado para optimizar LibrariesSection y TrickView:

# 🚀 Plan de Optimización: LibrariesSection & TrickView

## 📊 Análisis de Problemas Actuales

### LibrariesSection
1. **Carga inicial pesada**: Se cargan TODOS los datos del usuario de una vez
2. **Re-renders excesivos**: El componente se re-renderiza completamente con cada cambio
3. **Descifrado síncrono**: Bloquea la UI mientras descifra contenido
4. **Sin paginación**: Muestra todos los items sin límite
5. **Búsqueda ineficiente**: Filtra en el cliente sin debounce

### TrickView
1. **Descifrado de videos bloqueante**: Carga y descifra videos síncronamente
2. **Videos pesados**: No hay optimización de calidad/resolución
3. **Sin precarga**: Los videos se cargan cuando se abre la vista
4. **Memory leaks**: Los videos descifrados no se limpian de memoria

## 📋 Plan de Implementación por Fases

### **FASE 1: Optimización de Renderizado (1 semana)**

#### 1.1 Implementar React.memo y useMemo
```tsx
// components/home/LibraryItemRow.tsx
export const LibraryItemRow = React.memo(({ 
  item, 
  onPress 
}: LibraryItemRowProps) => {
  // Componente actual...
}, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renders
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.title === nextProps.item.title &&
         prevProps.item.is_encrypted === nextProps.item.is_encrypted;
});

// En LibrariesSection
const filteredSections = useMemo(() => {
  return categorySections.filter(section => {
    // Lógica de filtrado actual
  });
}, [categorySections, searchQuery, searchFilters]);
```

#### 1.2 Virtualización con FlashList
```tsx
// Instalar: npm install @shopify/flash-list

import { FlashList } from "@shopify/flash-list";

// Reemplazar FlatList con FlashList
<FlashList
  data={visibleCategories}
  renderItem={renderCategoryItem}
  estimatedItemSize={200} // Altura estimada de cada categoría
  keyExtractor={(item) => item.category.id}
  // Mejor rendimiento que FlatList
/>
```

#### 1.3 Debounce en búsqueda
```tsx
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// En LibrariesSection
const debouncedSearchQuery = useDebounce(searchQuery, 300);

// Usar debouncedSearchQuery en lugar de searchQuery para filtrar
```

### **FASE 2: Lazy Loading y Paginación (1 semana)**

#### 2.1 Implementar paginación por categorías
```tsx
// components/home/CollapsibleCategory.tsx
const CollapsibleCategory = memo(({ section, ...props }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadedItems, setLoadedItems] = useState<LibraryItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const ITEMS_PER_PAGE = 10;

  const loadMoreItems = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const startIndex = loadedItems.length;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const newItems = section.items.slice(startIndex, endIndex);
    
    setLoadedItems(prev => [...prev, ...newItems]);
    setHasMore(endIndex < section.items.length);
    setLoading(false);
  }, [loadedItems, section.items, loading, hasMore]);

  // Cargar primeros items cuando se expande
  useEffect(() => {
    if (isExpanded && loadedItems.length === 0) {
      loadMoreItems();
    }
  }, [isExpanded]);

  return (
    <View>
      {/* Header de categoría */}
      
      {isExpanded && (
        <FlatList
          data={loadedItems}
          renderItem={({ item }) => <LibraryItemRow item={item} onPress={onItemPress} />}
          onEndReached={loadMoreItems}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading ? <ActivityIndicator /> : null}
        />
      )}
    </View>
  );
});
```

#### 2.2 Lazy decryption
```tsx
// services/encryptedContentService.ts
export class EncryptedContentService {
  // Cache de contenido descifrado
  private decryptedCache = new Map<string, any>();

  async getContentLazy(
    contentId: string,
    contentType: string,
    userId: string,
    decryptForSelf: Function,
    getPrivateKey: Function
  ): Promise<any> {
    const cacheKey = `${contentType}_${contentId}`;
    
    // Verificar cache primero
    if (this.decryptedCache.has(cacheKey)) {
      return this.decryptedCache.get(cacheKey);
    }

    // Obtener solo metadata básica primero
    const basicData = await this.getBasicContent(contentId, contentType);
    
    // Marcar como "pendiente de descifrado" si está cifrado
    if (basicData.is_encrypted) {
      basicData._decryptionPending = true;
    }

    return basicData;
  }

  // Descifrar bajo demanda cuando se necesite
  async decryptOnDemand(
    contentId: string,
    contentType: string,
    // ... otros parámetros
  ): Promise<any> {
    const decrypted = await this.getContent(contentId, contentType, /* ... */);
    const cacheKey = `${contentType}_${contentId}`;
    this.decryptedCache.set(cacheKey, decrypted);
    return decrypted;
  }
}
```

### **FASE 3: Optimización de Estado (1 semana)**

#### 3.1 Implementar Zustand para estado global
```tsx
// stores/contentStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ContentState {
  categories: Category[];
  tricks: Map<string, Trick>;
  techniques: Map<string, Technique>;
  gimmicks: Map<string, Gimmick>;
  
  // Actions
  setCategories: (categories: Category[]) => void;
  updateTrick: (id: string, updates: Partial<Trick>) => void;
  addDecryptedContent: (type: string, id: string, content: any) => void;
}

export const useContentStore = create<ContentState>()(
  immer((set) => ({
    categories: [],
    tricks: new Map(),
    techniques: new Map(),
    gimmicks: new Map(),

    setCategories: (categories) => set((state) => {
      state.categories = categories;
    }),

    updateTrick: (id, updates) => set((state) => {
      const trick = state.tricks.get(id);
      if (trick) {
        state.tricks.set(id, { ...trick, ...updates });
      }
    }),

    addDecryptedContent: (type, id, content) => set((state) => {
      switch (type) {
        case 'tricks':
          state.tricks.set(id, content);
          break;
        case 'techniques':
          state.techniques.set(id, content);
          break;
        case 'gimmicks':
          state.gimmicks.set(id, content);
          break;
      }
    }),
  }))
);
```

#### 3.2 Separar UI state del data state
```tsx
// stores/uiStore.ts
interface UIState {
  expandedCategories: Set<string>;
  selectedFilters: SearchFilters;
  searchQuery: string;
  
  toggleCategory: (categoryId: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  expandedCategories: new Set(),
  selectedFilters: { categories: [], tags: [], difficulties: [] },
  searchQuery: '',

  toggleCategory: (categoryId) => set((state) => ({
    expandedCategories: new Set(
      state.expandedCategories.has(categoryId)
        ? [...state.expandedCategories].filter(id => id !== categoryId)
        : [...state.expandedCategories, categoryId]
    )
  })),

  setSearchQuery: (query) => set({ searchQuery: query }),
}));
```

### **FASE 4: Optimización de TrickView (1 semana)**

#### 4.1 Precarga de videos con calidad adaptativa
```tsx
// hooks/useAdaptiveVideo.ts
export const useAdaptiveVideo = (videoUrl: string | null) => {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [preloadedUrl, setPreloadedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl) return;

    // Detectar velocidad de conexión
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === '4g') setQuality('high');
      else if (effectiveType === '3g') setQuality('medium');
      else setQuality('low');
    }

    // Precargar video con calidad adaptativa
    preloadVideo(videoUrl, quality);
  }, [videoUrl, quality]);

  const preloadVideo = async (url: string, quality: 'low' | 'medium' | 'high') => {
    // Implementar lógica de precarga con diferentes calidades
    // Podría involucrar llamar a un endpoint que devuelva URLs de diferentes calidades
    setPreloadedUrl(url); // Por ahora, usar la URL original
  };

  return { preloadedUrl, quality, setQuality };
};
```

#### 4.2 Limpieza de memoria y gestión de recursos
```tsx
// components/TrickViewScreen.tsx
export default function TrickViewScreen({ trick, onClose }) {
  const [tempVideoFiles, setTempVideoFiles] = useState<string[]>([]);

  // Limpiar archivos temporales al desmontar
  useEffect(() => {
    return () => {
      tempVideoFiles.forEach(async (tempUri) => {
        try {
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        } catch (error) {
          console.error('Error limpiando archivo temporal:', error);
        }
      });
    };
  }, [tempVideoFiles]);

  // Al descifrar un video, agregar a la lista de temporales
  const handleDecryptedVideo = (tempUri: string) => {
    setTempVideoFiles(prev => [...prev, tempUri]);
  };

  // Pausar videos cuando no están visibles
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        effectVideoPlayer?.pause();
        secretVideoPlayer?.pause();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [effectVideoPlayer, secretVideoPlayer]);
}
```

### **FASE 5: Optimización de Cifrado (2 semanas)**

#### 5.1 Web Workers para cifrado (React Native)
```tsx
// utils/cryptoWorker.ts
// React Native no soporta Web Workers nativos, usar react-native-workers

import { Worker } from 'react-native-workers';

export class CryptoWorkerService {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('path/to/crypto.worker.js');
  }

  async decryptInBackground(encryptedData: string, privateKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({
        type: 'decrypt',
        data: { encryptedData, privateKey }
      });

      this.worker.onmessage = (e) => {
        if (e.data.type === 'decrypted') {
          resolve(e.data.result);
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.error));
        }
      };
    });
  }
}
```

#### 5.2 Batch decryption mejorado
```tsx
// services/batchDecryptionService.ts
export class BatchDecryptionService {
  private queue: DecryptionTask[] = [];
  private processing = false;
  private batchSize = 5;

  async addToQueue(task: DecryptionTask): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...task, resolve, reject });
      if (!this.processing) {
        this.processBatch();
      }
    });
  }

  private async processBatch() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);

    // Procesar en paralelo
    const results = await Promise.allSettled(
      batch.map(task => this.decryptItem(task))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        batch[index].resolve(result.value);
      } else {
        batch[index].reject(result.reason);
      }
    });

    // Continuar con el siguiente batch
    setTimeout(() => this.processBatch(), 0);
  }

  private async decryptItem(task: DecryptionTask) {
    // Implementar descifrado
    return task.decrypt();
  }
}
```

### **FASE 6: Optimización de Base de Datos (1 semana)**

#### 6.1 Crear vistas materializadas en Supabase
```sql
-- En Supabase SQL Editor
CREATE MATERIALIZED VIEW user_content_summary AS
SELECT 
  u.id as user_id,
  COUNT(DISTINCT mt.id) as tricks_count,
  COUNT(DISTINCT t.id) as techniques_count,
  COUNT(DISTINCT g.id) as gimmicks_count,
  COUNT(DISTINCT CASE WHEN mt.is_encrypted THEN mt.id END) as encrypted_tricks_count,
  COUNT(DISTINCT CASE WHEN t.is_encrypted THEN t.id END) as encrypted_techniques_count,
  COUNT(DISTINCT CASE WHEN g.is_encrypted THEN g.id END) as encrypted_gimmicks_count
FROM profiles u
LEFT JOIN magic_tricks mt ON mt.user_id = u.id
LEFT JOIN techniques t ON t.user_id = u.id
LEFT JOIN gimmicks g ON g.user_id = u.id
GROUP BY u.id;

-- Índice para búsquedas rápidas
CREATE INDEX idx_user_content_summary_user_id ON user_content_summary(user_id);

-- Refrescar vista cada hora
CREATE OR REPLACE FUNCTION refresh_user_content_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_content_summary;
END;
$$ LANGUAGE plpgsql;
```

#### 6.2 Optimizar queries con índices compuestos
```sql
-- Índices para búsquedas comunes
CREATE INDEX idx_magic_tricks_user_encrypted ON magic_tricks(user_id, is_encrypted);
CREATE INDEX idx_trick_categories_composite ON trick_categories(category_id, trick_id);
CREATE INDEX idx_techniques_search ON techniques USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

### **FASE 7: Monitoreo y Métricas (1 semana)**

#### 7.1 Implementar React Native Performance
```tsx
// utils/performance.ts
import { InteractionManager } from 'react-native';
import analytics from '@react-native-firebase/analytics';

export class PerformanceMonitor {
  private marks = new Map<string, number>();

  startMeasure(name: string) {
    this.marks.set(name, Date.now());
  }

  endMeasure(name: string) {
    const start = this.marks.get(name);
    if (!start) return;

    const duration = Date.now() - start;
    this.marks.delete(name);

    // Enviar a analytics
    analytics().logEvent('performance_metric', {
      metric_name: name,
      duration_ms: duration,
    });

    // Log en desarrollo
    if (__DEV__) {
      
    }
  }

  measureInteraction(name: string, callback: () => Promise<void>) {
    return InteractionManager.runAfterInteractions(async () => {
      this.startMeasure(name);
      try {
        await callback();
      } finally {
        this.endMeasure(name);
      }
    });
  }
}

// Uso en LibrariesSection
const perf = new PerformanceMonitor();

useEffect(() => {
  perf.measureInteraction('libraries_initial_load', async () => {
    await loadAllData();
  });
}, []);
```

## 📈 Métricas de Éxito

### Objetivos de Rendimiento
- **Tiempo de carga inicial**: < 1 segundo
- **Tiempo hasta interactividad**: < 2 segundos
- **FPS durante scroll**: > 55 fps
- **Uso de memoria**: < 200MB
- **Tiempo de descifrado por item**: < 100ms

### Herramientas de Medición
1. **React DevTools Profiler**
2. **Flipper** para debugging
3. **Firebase Performance Monitoring**
4. **Sentry** para errores en producción

## 🔄 Proceso de Implementación

### Semana 1-2: Fundamentos
1. Implementar memoización y virtualización
2. Agregar debounce a búsquedas
3. Configurar herramientas de monitoreo

### Semana 3-4: Lazy Loading
1. Implementar paginación por categorías
2. Agregar lazy decryption
3. Optimizar carga de videos

### Semana 5-6: Estado y Cifrado
1. Migrar a Zustand
2. Implementar batch decryption
3. Agregar cache de contenido descifrado

### Semana 7-8: Base de Datos y Pulido
1. Crear vistas materializadas
2. Optimizar queries
3. Testing de rendimiento
4. Ajustes finales

## 🎯 Resultado Esperado

- **50% reducción** en tiempo de carga inicial
- **70% reducción** en uso de memoria
- **Experiencia fluida** con 60fps constantes
- **Descifrado imperceptible** para el usuario
- **Búsqueda instantánea** con resultados en < 100ms

Este plan proporciona una ruta clara y medible para optimizar significativamente el rendimiento de LibrariesSection y TrickView, mejorando drásticamente la experiencia del usuario.


Informe de Calidad de Código de mmento-expogo
Problemas de Rendimiento
Procesamiento secuencial de archivos grandes: Por ejemplo, el método de descifrado de archivos grandes recorre cada chunk en serie, sin paralelización 
GitHub
. Esto hace que la operación sea muy lenta para archivos grandes. Recomendación: Paralelizar el descifrado de chunks (similar a la forma de cifrado ya implementada) o usar Streams.
Conversiones intensivas en la interfaz: En TrickViewScreen, el código convierte datos binarios a Base64 con bucles en JavaScript (ej., líneas [61] y [63]). Esto realiza concatenaciones grandes en memoria y puede bloquear el hilo de UI. Ejemplo:
ts
Copiar
Editar
// Conversión ineficiente a Base64
let binaryString = "";
const chunkSize = 8192;
for (let i = 0; i < decryptedVideo.data.length; i += chunkSize) {
  const chunk = decryptedVideo.data.slice(i, i + chunkSize);
  binaryString += String.fromCharCode.apply(null, Array.from(chunk));
}
const base64Data = btoa(binaryString);
Este enfoque es costoso. Recomendación: Evitar concatenaciones en bucle. Usar utilidades nativas o escritorios optimizados (p. ej., escribir directamente con FileSystem.writeAsStringAsync con codificación Base64) o procesar en Web Workers si es posible.
Consultas de base de datos no optimizadas: La función de actualización de conteo de etiquetas (updateTagsUsageCount) hace múltiples llamadas secuenciales a la base de datos por cada etiqueta
GitHub
. Esto provoca latencia agregada. Recomendación: Agrupar operaciones (p. ej. una llamada bulk o Promise.all) para mejorar el rendimiento.
Bucles de renderizado complejos: En LibrariesSection, se recorren todos los contenidos del usuario para agruparlos por categoría
GitHub
GitHub
. Si hay muchos elementos, este bucle puede ser costoso. Ya está envuelto en useMemo, pero se sugiere verificar que las dependencias sean correctas y, si es necesario, paginar o cargar bajo demanda para no bloquear la UI.
Problemas de Seguridad
Exposición de claves privadas en logs: En CryptoService.decryptForSelf, se registra en consola la clave privada del usuario y los datos cifrados
GitHub
. Esto es crítico, pues cualquier log accesible revelaría secretos sensibles. Recomendación: Eliminar o desactivar estos console.log. Nunca imprimir claves privadas ni datos cifrados.
Almacenamiento inseguro de tokens: Se utiliza AsyncStorage para guardar tokens de autenticación (por ejemplo, en utils/storage.ts se guarda authToken en AsyncStorage
GitHub
). AsyncStorage no cifra los datos, por lo que el token podría extraerse de un dispositivo comprometido. Recomendación: Usar un almacén seguro (como expo-secure-store) para credenciales y tokens sensibles.
Manejo de errores e inyecciones: Aunque las consultas a Supabase usan APIs preparadas (p. ej., .eq()), hay que asegurarse de validar/escapar cualquier entrada dinámica en consultas complejas. Si se usaran consultas SQL manuales, habría riesgo de inyección. En este código no se observa inyección SQL evidente, pero se recomienda siempre usar parámetros o UDF seguros. También validar inputs de usuarios para evitar XSS en vistas web (si existieran).
Permisos de almacenamiento: En mediaUtils, se piden permisos de galería con mensajes dinámicos, pero no se valida la entrada del tipo de media; asegurarse de que solo se solicite permisos válidos.
Malas Prácticas de Codificación
Código duplicado y poco modular: Se repiten en varios lugares fragmentos casi idénticos, como la conversión binaria⇒Base64 en el componente de visualización de trucos
GitHub
GitHub
. Esto dificulta el mantenimiento. Recomendación: Extraer esas rutinas comunes a utilidades reutilizables para evitar duplicación.
Nombres de variables mixtos e inconsistentes: En todo el proyecto se mezcla español e inglés (“trick”, “categoria”, “secret”, etc.), lo cual puede confundir. Usar un solo idioma de convención para nombres mejora la legibilidad.
Funciones demasiado largas y responsabilidades múltiples: Por ejemplo, FileEncryptionService ocupa cientos de líneas con métodos muy extensos. Esto complica la comprensión y pruebas. Recomendación: Dividir en clases o funciones más pequeñas (p. ej., separar lógica de compresión, cifrado y carga).
Dependencias innecesarias o exceso de imports: Se importa mucha funcionalidad en algunos componentes (por ejemplo, en AddMagicWizard hay lógica de encriptación, UI y navegación), creando acoplamientos. Modularizar separando lógica de negocio (servicios) de componentes UI.
Uso excesivo de console: Hay muchos console.log y console.error para depuración. En producción esto ensucia el log y potencialmente revela información. Recomendación: Usar una estrategia de logging configurables (disabled en release) o eliminarlos antes de desplegar.
Validaciones tautológicas: En AddMagicWizard, la validación de campos siempre devuelve true
GitHub
, por lo que es inútil. El código dead-like debe limpiarse o implementarse correctamente.
No uso de herramientas de calidad: Se recomienda integrar linters (ESLint) y analizadores estáticos (TypeScript con reglas estrictas) para detectar código no usado, posibles problemas de seguridad (e.g. variables no definidas) y guías de estilo. También pruebas automáticas para validación continua.
Sugerencias Generales
Adoptar análisis de código estático (ESLint, SonarQube) para detectar issues de seguridad y estilo.
Implementar revisión de código (code review) enfocada en performance y seguridad.
Usar profiling (medición de tiempos) en operaciones pesadas para identificar cuellos de botella reales.
Para cifrado, confiar en librerías auditadas y evitar reimplementaciones propias sin necesidad.
Documentar claramente el manejo de claves y datos sensibles, siguiendo principios de seguridad (principio de menor privilegio).
# Guía de Integración del Sistema Offline

Este documento explica cómo integrar el sistema offline-first en la aplicación mmento.

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Integración en el Layout Principal](#integración-en-el-layout-principal)
3. [Uso en Componentes](#uso-en-componentes)
4. [Creación de Nuevos Trucos Offline](#creación-de-nuevos-trucos-offline)
5. [Debugging y Monitoreo](#debugging-y-monitoreo)

## Configuración Inicial

### 1. Wrap la app con OfflineSyncProvider

Editar `app/_layout.tsx`:

```typescript
import { OfflineSyncProvider } from "../context/OfflineSyncContext";
import { OfflineIndicator } from "../components/ui/OfflineIndicator";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <OfflineSyncProvider>
          <StatusBar translucent backgroundColor="transparent" style="light" />

          {/* Indicador offline en la parte superior */}
          <OfflineIndicator />

          <StyledView className="flex-1">
            {/* ... resto del código ... */}
            <Stack>
              {/* ... tus screens ... */}
            </Stack>
          </StyledView>
        </OfflineSyncProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
```

### 2. Actualizar el Context de LibraryData

Ya que `LibraryDataContext` maneja la mayoría de las operaciones, debemos asegurarnos de que use el sistema offline. Los métodos de `trickService` ya están actualizados para manejar offline automáticamente.

## Integración en el Layout Principal

El `OfflineIndicator` ya está listo para usarse. Aparecerá automáticamente cuando:
- No hay conexión a internet
- Hay operaciones pendientes de sincronización
- Se está sincronizando
- Hay errores de sincronización

## Uso en Componentes

### Obtener el estado offline

```typescript
import { useOfflineSync } from "../../context/OfflineSyncContext";

function MiComponente() {
  const {
    isOnline,
    isSyncing,
    pendingOperations,
    syncNow
  } = useOfflineSync();

  return (
    <View>
      {!isOnline && (
        <Text>⚠️ Sin conexión - Los cambios se sincronizarán automáticamente</Text>
      )}

      {pendingOperations > 0 && (
        <TouchableOpacity onPress={syncNow}>
          <Text>🔄 Sincronizar {pendingOperations} cambios pendientes</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### Prevenir operaciones críticas offline

Algunas operaciones pueden requerir conexión obligatoria:

```typescript
async function compartirTruco(trickId: string) {
  // Verificar conexión antes de compartir
  if (!isOnline) {
    Alert.alert(
      "Sin conexión",
      "Necesitas conexión a internet para compartir trucos",
      [{ text: "OK" }]
    );
    return;
  }

  // Proceder con el compartir...
}
```

## Creación de Nuevos Trucos Offline

Para crear trucos offline, usa el servicio existente pero genera un ID temporal:

```typescript
import { supabase } from "../lib/supabase";
import { offlineQueueService } from "../lib/offlineQueue";
import { localDataService } from "../services/LocalDataService";
import { networkMonitorService } from "../services/NetworkMonitorService";

async function createTrickOffline(trickData: MagicTrick, categoryId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Generar ID temporal (se reemplazará por el ID real del servidor al sincronizar)
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const newTrick: LocalTrick = {
    id: tempId,
    user_id: user.id,
    title: trickData.title,
    effect: trickData.effect,
    secret: trickData.secret,
    duration: trickData.duration,
    reset: trickData.reset,
    difficulty: trickData.difficulty,
    angles: trickData.angles || [],
    notes: trickData.notes || "",
    photo_url: trickData.photo_url,
    effect_video_url: trickData.effect_video_url,
    secret_video_url: trickData.secret_video_url,
    is_public: trickData.is_public,
    status: trickData.status || "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_ids: categoryId ? [categoryId] : [],
    tag_ids: trickData.tags || [],
    is_favorite: false,
    photos: [],
  };

  // Guardar localmente (con flag de local-only)
  localDataService.addTrick(user.id, newTrick, true);

  // Si estamos offline, encolar
  if (!networkMonitorService.isOnline()) {
    await offlineQueueService.enqueue({
      userId: user.id,
      type: "create_trick",
      payload: {
        trick: newTrick,
        categoryId,
        tags: trickData.tags,
      },
    });

    console.log("[CreateTrick] Enqueued for offline sync");
    return newTrick;
  }

  // Si estamos online, crear en servidor inmediatamente
  try {
    const { data, error } = await supabase
      .from("magic_tricks")
      .insert({
        user_id: user.id,
        title: trickData.title,
        effect: trickData.effect,
        secret: trickData.secret,
        // ... resto de campos
      })
      .select()
      .single();

    if (error) throw error;

    // Reemplazar el truco temporal con el real
    localDataService.deleteTrick(user.id, tempId);
    localDataService.addTrick(user.id, {
      ...newTrick,
      id: data.id, // ID real del servidor
    });

    return data;
  } catch (error) {
    console.error("[CreateTrick] Error, enqueueing:", error);

    // Si falla, encolar para retry
    await offlineQueueService.enqueue({
      userId: user.id,
      type: "create_trick",
      payload: {
        trick: newTrick,
        categoryId,
        tags: trickData.tags,
      },
    });

    return newTrick; // Retornar el truco temporal
  }
}
```

## Debugging y Monitoreo

### Ver información de debug

```typescript
import { localDataService } from "../services/LocalDataService";
import { offlineQueueService } from "../lib/offlineQueue";

// Ver estado del cache local
const debugInfo = localDataService.getDebugInfo(userId);
console.log("Cache debug info:", debugInfo);
// Output:
// {
//   tricksCount: 45,
//   categoriesCount: 8,
//   pendingTricksCount: 3,  // Trucos pendientes de sync
//   pendingCategoriesCount: 0,
//   lastSync: "2025-10-06T10:30:00Z"
// }

// Ver cola de sincronización
const queue = await offlineQueueService.getQueue(userId);
console.log("Sync queue:", queue);
// Output: Array de operaciones pendientes con estado

// Ver solo operaciones pendientes
const pending = await offlineQueueService.getPendingOperations(userId);
console.log("Pending operations:", pending);
```

### Forzar sincronización manual

```typescript
import { useOfflineSync } from "../context/OfflineSyncContext";

function DebugPanel() {
  const { syncNow, pendingOperations } = useOfflineSync();

  return (
    <View>
      <Text>Operaciones pendientes: {pendingOperations}</Text>
      <Button title="Forzar Sync" onPress={syncNow} />
    </View>
  );
}
```

### Limpiar cola (SOLO PARA DEBUG)

```typescript
// ⚠️ ADVERTENCIA: Esto eliminará todas las operaciones pendientes sin sincronizar
await offlineQueueService.clearQueue(userId);
```

## Testing del Sistema Offline

### Test Manual Básico

1. **Activar modo avión** en el dispositivo
2. **Crear un nuevo truco**
   - El truco debe aparecer inmediatamente en la lista
   - El `OfflineIndicator` debe aparecer mostrando "1 cambio pendiente"
3. **Editar el truco**
   - Los cambios deben aplicarse inmediatamente
   - El contador debe mostrar "2 cambios pendientes"
4. **Eliminar otro truco**
   - Debe desaparecer de la lista
   - El contador debe incrementar
5. **Desactivar modo avión**
   - El `OfflineIndicator` debe cambiar a "Sincronizando..."
   - Después de unos segundos, debe desaparecer
6. **Verificar en Supabase** que los cambios se aplicaron correctamente

### Test de Recuperación de Errores

1. Activar modo avión
2. Realizar varias operaciones
3. En el simulador, modificar manualmente la base de datos para crear un conflicto
4. Desactivar modo avión
5. Observar que las operaciones se reintentan y eventualmente fallan o se resuelven

## Notas Importantes

- **IDs Temporales**: Los trucos creados offline tienen IDs temporales que se reemplazan al sincronizar
- **Uploads de Media**: Los videos/fotos deben subirse ANTES de crear el truco, o manejar el upload offline por separado
- **Conflictos**: La estrategia actual es "last write wins" - la última escritura gana
- **Límite de Reintentos**: Las operaciones se reintentan máximo 3 veces antes de marcarse como fallidas

## Próximas Mejoras Sugeridas

1. **Manejo de media offline**: Guardar videos/fotos localmente y subirlos al reconectar
2. **Resolución de conflictos**: UI para resolver conflictos manualmente
3. **Sync selectivo**: Permitir al usuario elegir qué sincronizar
4. **Compresión de cola**: Fusionar operaciones redundantes (ej: múltiples updates al mismo trick)

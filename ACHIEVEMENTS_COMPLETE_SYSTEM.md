# Sistema Completo de Logros - ACTUALIZADO ✅

## 🎉 Implementación Completa con todas las Features

El sistema de logros ha sido completamente actualizado para incluir **todas** las características del diseño original:

---

## 📊 ¿Qué se Agregó?

### ✅ **Nuevas Features Implementadas:**

1. **Sistema de Puntos**
   - Campo `points` en cada logro
   - Acumulación de puntos por logros desbloqueados
   - Base para leaderboard global

2. **Sistema de Badges/Apodos**
   - Tabla `badges` con traducciones
   - Badges equip

ables que se muestran junto al nombre
   - 8 badges iniciales: Novato, Explorador, Coleccionista, Visionario, etc.
   - Colores y estilos personalizables

3. **Event Tracking System**
   - Tabla `user_achievement_events` para trackear todas las acciones
   - Triggers automáticos que procesan eventos
   - Desbloqueo automático de logros

4. **Login Streaks**
   - Tabla `user_login_streaks`
   - Función automática que actualiza rachas diarias
   - Tracking de racha actual y más larga

5. **Global Leaderboard**
   - Tabla `global_leaderboard`
   - Ranking por puntos totales
   - Percentiles (top 1%, top 5%, etc.)

6. **Logros Secretos**
   - Campo `is_secret` para logros ocultos
   - `secret_hint` en traducciones
   - Se revelan al desbloquearlos

7. **Cache Local**
   - AsyncStorage para performance
   - Sincronización en background
   - Invalidación inteligente

---

## 📁 Archivos Creados/Modificados

### **SQL Scripts:**
1. **`docs/supabase_achievements_setup.sql`** ✅ (original con traducciones)
2. **`docs/supabase_achievements_migration.sql`** ✅✅ **NUEVO - EJECUTAR ESTE**

### **Services:**
1. **`services/achievementsService.ts`** ✅ (actualizado con todas las features)
2. **`services/userStatsService.ts`** ✅ (sin cambios)

### **Components:**
1. **`components/profile/ProfileHeader.tsx`** ✅
2. **`components/profile/StatsCard.tsx`** ✅
3. **`components/profile/AchievementCard.tsx`** ✅
4. **`components/profile/CollapsibleAchievementGroup.tsx`** ✅

### **Screens:**
1. **`app/(app)/profile/index.tsx`** ✅ (con traducciones)
2. **`app/(app)/profile/edit/index.tsx`** ✅ (placeholder)

### **Translations:**
1. **`translations/es.json`** ✅ (sección profile agregada)
2. **`translations/en.json`** ✅ (sección profile agregada)

---

## 🔧 Estructura de Base de Datos Actualizada

### **Tablas Existentes (Modificadas):**

#### `achievements`
```sql
- id UUID
- key TEXT UNIQUE           -- ⭐ NUEVO
- category TEXT
- type TEXT                 -- ⭐ NUEVO: 'count', 'streak', 'milestone', 'secret'
- threshold INTEGER
- points INTEGER            -- ⭐ NUEVO
- requirement JSONB         -- ⭐ NUEVO: configuración flexible
- is_secret BOOLEAN         -- ⭐ NUEVO
- badge_key TEXT            -- ⭐ NUEVO: referencia a badge
- icon_name TEXT
- display_order INTEGER
- created_at, updated_at
```

#### `achievement_translations`
```sql
- id UUID
- achievement_id UUID
- language_code TEXT
- title TEXT
- description TEXT
- secret_hint TEXT          -- ⭐ NUEVO: pista para logros secretos
- created_at
```

#### `user_achievements`
```sql
- id UUID
- user_id UUID
- achievement_id UUID
- progress INTEGER
- is_unlocked BOOLEAN
- unlocked_at TIMESTAMPTZ
- notified BOOLEAN          -- ⭐ NUEVO: para notificaciones
- created_at, updated_at
```

#### `profiles`
```sql
-- ... campos existentes ...
- equipped_badge_id UUID    -- ⭐ NUEVO: badge equipado
```

### **Tablas Nuevas:**

#### `badges`
```sql
- id UUID
- key TEXT UNIQUE
- icon TEXT
- color TEXT                -- Color del texto del badge
- font_family TEXT          -- 'regular', 'medium', 'semibold', 'bold'
- font_size INTEGER         -- Tamaño relativo
- created_at
```

#### `badge_translations`
```sql
- id UUID
- badge_id UUID
- language_code TEXT
- text TEXT                 -- "El Visionario", "The Visionary"
- created_at
```

#### `user_achievement_events`
```sql
- id UUID
- user_id UUID
- event_type TEXT           -- 'trick_created', 'photo_added', etc.
- event_data JSONB          -- Datos adicionales del evento
- created_at
```

#### `user_login_streaks`
```sql
- user_id UUID PRIMARY KEY
- current_streak INTEGER
- longest_streak INTEGER
- last_login_date DATE
- updated_at
```

#### `global_leaderboard`
```sql
- user_id UUID PRIMARY KEY
- username TEXT
- total_points INTEGER
- achievements_unlocked INTEGER
- rank INTEGER
- percentile NUMERIC(5,2)   -- 0-100 (top %)
- updated_at
```

---

## 🚀 Pasos para Actualizar

### 1. ⚠️ **IMPORTANTE: Ejecutar Script de Migración**

Ya ejecutaste `supabase_achievements_setup.sql`. Ahora ejecuta:

```bash
# Archivo: docs/supabase_achievements_migration.sql
# 1. Ve a Supabase Dashboard → SQL Editor
# 2. Copia y pega TODO el contenido del archivo
# 3. Ejecuta
```

**Este script:**
- ✅ Actualiza tablas existentes (NO las elimina)
- ✅ Agrega columnas nuevas a `achievements` y `achievement_translations`
- ✅ Actualiza los logros existentes con keys, points, requirements
- ✅ Crea las 5 tablas nuevas
- ✅ Inserta 8 badges con traducciones ES/EN
- ✅ Crea 4 funciones de Supabase
- ✅ Crea triggers automáticos

### 2. ✅ **Verificar Migración**

Después de ejecutar, verifica:

```sql
-- 1. Verificar que achievements tiene las nuevas columnas
SELECT key, points, type, is_secret FROM achievements LIMIT 5;

-- 2. Verificar que badges existen
SELECT * FROM badges;

-- 3. Verificar funciones
SELECT proname FROM pg_proc WHERE proname LIKE '%achievement%';
```

### 3. 🔄 **Actualizar la App**

Los archivos de código ya están listos. Solo necesitas:

```bash
npm start
```

---

## 🎮 Cómo Usar el Sistema

### **1. Track Events (en tus servicios existentes)**

Agrega tracking a las acciones del usuario:

```typescript
// En trickService.ts
import { achievementsService } from './achievementsService';

export async function createTrick(trickData, userId) {
  // ... crear truco ...

  // Track event para logros
  await achievementsService.trackEvent(
    userId,
    'tricks_created',
    { trick_id: newTrick.id }
  );

  return newTrick;
}
```

**Eventos disponibles:**
- `tricks_created` - Al crear un truco
- `categories_created` - Al crear una categoría
- `favorites_created` - Al marcar favorito
- `daily_login` - Al abrir la app (se hace automático)

### **2. Update Login Streak (en app startup)**

```typescript
// En app/_layout.tsx o donde inicializas auth
import { achievementsService } from './services/achievementsService';

useEffect(() => {
  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Actualizar streak automáticamente
      await achievementsService.updateLoginStreak(user.id);
    }
  };

  initUser();
}, []);
```

### **3. Mostrar Badges en UI**

```typescript
// Ejemplo: Componente de nombre de usuario con badge

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function UserDisplayName({ userId, username }) {
  const [badge, setBadge] = useState(null);

  useEffect(() => {
    fetchBadge();
  }, [userId]);

  const fetchBadge = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        equipped_badge_id,
        badge:badges (
          color,
          font_family,
          font_size,
          badge_translations!inner (
            text,
            language_code
          )
        )
      `)
      .eq('id', userId)
      .eq('badge.badge_translations.language_code', i18n.language)
      .single();

    if (data?.badge) {
      setBadge({
        text: data.badge.badge_translations[0].text,
        color: data.badge.color,
        fontFamily: data.badge.font_family,
        fontSize: data.badge.font_size
      });
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ fontSize: 18, color: '#FFF' }}>
        {username}
      </Text>
      {badge && (
        <Text style={{
          fontSize: badge.fontSize,
          color: badge.color,
          fontFamily: fontNames[badge.fontFamily],
          marginLeft: 6
        }}>
          {badge.text}
        </Text>
      )}
    </View>
  );
}
```

### **4. Equipar/Desequipar Badge**

```typescript
// Equipar badge
async function equipBadge(badgeId: string, userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ equipped_badge_id: badgeId })
    .eq('id', userId);

  if (error) console.error('Error equipping badge:', error);
}

// Desequipar badge
async function unequipBadge(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ equipped_badge_id: null })
    .eq('id', userId);

  if (error) console.error('Error unequipping badge:', error);
}
```

### **5. Ver Logros No Notificados**

```typescript
// Al abrir la app o periódicamente
const checkNewAchievements = async (userId: string) => {
  const unnotified = await achievementsService.getUnnotifiedAchievements(userId);

  if (unnotified.length > 0) {
    // Mostrar modal de celebración
    unnotified.forEach(achievement => {
      showAchievementModal(achievement);
    });

    // Marcar como notificados
    await achievementsService.markAsNotified(
      unnotified.map(a => a.user_achievement_id!),
      userId
    );
  }
};
```

---

## 🎨 Badges Iniciales

| Badge | Color | Cómo Desbloquear | ES | EN |
|-------|-------|------------------|----|----|
| `novato_badge` | #10B981 (verde) | Crear 1 truco | El Novato | The Rookie |
| `explorador_badge` | #F59E0B (naranja) | Crear 25 trucos | El Explorador | The Explorer |
| `coleccionista_badge` | #8B5CF6 (morado) | Crear 50 trucos | El Coleccionista | The Collector |
| `visionario_badge` | #EF4444 (rojo) | Crear 100 trucos | El Visionario | The Visionary |
| `dedicado_badge` | #3B82F6 (azul) | 4 semanas consecutivas | El Dedicado | The Dedicated |
| `imparable_badge` | #EC4899 (rosa) | 12 semanas consecutivas | El Imparable | The Unstoppable |
| `curador_badge` | #14B8A6 (teal) | Crear 10 categorías | El Curador | The Curator |
| `apasionado_badge` | #F43F5E (rosa oscuro) | 25 favoritos | El Apasionado | The Passionate |

---

## 📊 Funciones de Supabase Creadas

### 1. `update_login_streak(p_user_id UUID)`
- Actualiza la racha de login diaria
- Crea evento `daily_login`
- Incrementa o resetea streak automáticamente

### 2. `process_achievement_event()`
- Trigger que se ejecuta al insertar en `user_achievement_events`
- Actualiza progreso de logros automáticamente
- Desbloquea logros cuando se alcanza el threshold

### 3. `update_global_leaderboard()`
- Recalcula el ranking global
- Ejecutar periódicamente (cada hora con cron job)

### 4. `verify_user_achievements(p_user_id UUID)`
- Verifica todos los logros de un usuario
- Útil para sincronización inicial o retroactiva

---

## 🔄 Flujo de Desbloqueo Automático

```
Usuario crea un truco
  ↓
trickService.createTrick() llama a achievementsService.trackEvent()
  ↓
Se inserta evento en user_achievement_events
  ↓
Trigger process_achievement_event() se ejecuta automáticamente
  ↓
Busca logros que coincidan con event_type='tricks_created'
  ↓
Incrementa progress en user_achievements
  ↓
Si progress >= threshold, marca como unlocked
  ↓
La app detecta logro no notificado
  ↓
Muestra modal de celebración 🎉
```

---

## 📝 Próximos Pasos (Opcionales)

### **Features Avanzadas:**

1. **Modal de Logro Desbloqueado**
   - Crear componente AchievementUnlockedModal
   - Animación Lottie de celebración
   - Mostrar badge si se desbloqueó

2. **Pantalla de Badges**
   - Lista de todos los badges disponibles
   - Badges desbloqueados vs bloqueados
   - Botón para equipar/desequipar

3. **Leaderboard Screen**
   - Top 10 usuarios
   - Posición del usuario actual
   - Percentil (Top 1%, Top 5%, etc.)

4. **Notificaciones Push**
   - Push notification cuando se desbloquea logro
   - Solo si app en background

5. **Logros Secretos**
   - Mostrar "???" en lugar del título
   - Mostrar solo la pista (secret_hint)
   - Revelar al desbloquear

---

## ✅ Checklist de Implementación

- [x] Script SQL de migración creado
- [x] achievementsService.ts actualizado
- [x] Badges implementados
- [x] Event tracking implementado
- [x] Login streaks implementado
- [x] Leaderboard implementado
- [x] Traducciones ES/EN completadas
- [x] Cache local con AsyncStorage
- [ ] Ejecutar script de migración en Supabase ⚠️ **TU TAREA**
- [ ] Agregar tracking en trickService
- [ ] Agregar tracking en categoryService
- [ ] Modal de logro desbloqueado
- [ ] Pantalla de badges
- [ ] Pantalla de leaderboard

---

## 🐛 Troubleshooting

### **Si los logros no se desbloquean:**
1. Verifica que el trigger `trigger_process_achievement_event` existe
2. Revisa que `event_type` coincide con `requirement->>'type'` en achievements
3. Ejecuta `verify_user_achievements(userId)` para forzar verificación

### **Si los badges no aparecen:**
1. Verifica que la tabla `badges` tiene datos
2. Verifica que `badge_translations` tiene traducciones
3. Revisa que `equipped_badge_id` en profiles apunta a un badge válido

### **Si el streak no funciona:**
1. Verifica que la función `update_login_streak` existe
2. Llama manualmente: `SELECT update_login_streak('user-id');`
3. Revisa la tabla `user_login_streaks`

---

## 📞 Soporte

Si algo no funciona:
1. Verifica que ejecutaste `supabase_achievements_migration.sql`
2. Revisa la consola de Supabase para errores SQL
3. Chequea los logs de la app con `console.log` en achievementsService

---

**Status:** ✅ COMPLETO Y LISTO PARA EJECUTAR

Todo el código está implementado. Solo falta:
1. Ejecutar el script SQL de migración
2. Agregar tracking de eventos en los servicios existentes
3. (Opcional) Crear las pantallas de badges y leaderboard

¡El sistema de logros está listo para motivar a tus usuarios! 🎉🏆

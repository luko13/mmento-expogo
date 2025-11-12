# Sistema de Logros (Achievements System)

## Índice
1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Tipos de Logros](#tipos-de-logros)
5. [Flujo de Desbloqueo](#flujo-de-desbloqueo)
6. [Sistema de Badges](#sistema-de-badges)
7. [Leaderboard Global](#leaderboard-global)
8. [Implementación en el Cliente](#implementación-en-el-cliente)
9. [Notificaciones](#notificaciones)
10. [Consideraciones de Performance](#consideraciones-de-performance)

---

## Visión General

Sistema de gamificación para mmento que recompensa a los usuarios por su actividad y progreso en la app. Incluye:

- **Logros desbloqueables** con progreso trackeable
- **Badges/Apodos** equipables que se muestran junto al nombre de usuario
- **Sistema de puntos** para ranking global
- **Logros secretos** que añaden elemento sorpresa
- **Sincronización cross-device** vía Supabase
- **Notificaciones** in-app y push cuando se desbloquea un logro

---

## Arquitectura

### Enfoque Híbrido: Supabase + Local Cache

**Supabase (Source of Truth):**
- Definición de logros y traducciones
- Progreso de usuarios
- Eventos de tracking
- Leaderboard global

**Local Cache (Performance):**
- Estado de logros del usuario actual
- Progreso para mostrar sin latencia
- Sincronización periódica con servidor

**Flujo de datos:**
```
Acción del usuario → Evento guardado → Trigger/Function →
Actualización de progreso → Verificación de logros →
Notificación al cliente → Update cache local
```

---

## Estructura de Base de Datos

### 1. `achievements` - Catálogo global de logros

```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL, -- ej: "first_trick", "tricks_master_100", "tag_collector_50"
  type TEXT NOT NULL, -- "count", "streak", "milestone", "secret"
  category TEXT NOT NULL, -- "tricks", "organization", "engagement", "special"
  points INTEGER NOT NULL DEFAULT 10, -- puntos para leaderboard
  requirement JSONB NOT NULL, -- {"type": "tricks_completed", "count": 10}
  is_secret BOOLEAN DEFAULT false,
  badge_key TEXT UNIQUE, -- si este logro desbloquea un badge: "el_visionario"
  icon TEXT, -- nombre del icono para mostrar
  sort_order INTEGER DEFAULT 0, -- orden de visualización
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_achievements_type ON achievements(type);
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_is_secret ON achievements(is_secret);
```

**Ejemplos de `requirement` JSONB:**
```json
// Logro simple de cantidad
{"type": "tricks_completed", "count": 10}

// Logro de streak
{"type": "login_streak", "days": 7}

// Logro de tag específica
{"type": "tag_usage", "count": 5}

// Logro de usar múltiples tags
{"type": "tags_created", "count": 20}
```

### 2. `achievement_translations` - Traducciones

```sql
CREATE TABLE achievement_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  language TEXT NOT NULL, -- "en", "es"
  name TEXT NOT NULL, -- "El Visionario", "The Visionary"
  description TEXT NOT NULL, -- "Crea tu primer truco completo"
  secret_hint TEXT, -- "Algo relacionado con trucos..." (solo para logros secretos)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(achievement_id, language)
);

-- Índices
CREATE INDEX idx_achievement_translations_achievement ON achievement_translations(achievement_id);
CREATE INDEX idx_achievement_translations_language ON achievement_translations(language);
```

### 3. `user_achievements` - Progreso y desbloqueos

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{"current": 0}', -- {"current": 5, "required": 10}
  unlocked_at TIMESTAMPTZ, -- NULL = no desbloqueado
  notified BOOLEAN DEFAULT false, -- si ya se notificó al usuario
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Índices
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, unlocked_at) WHERE unlocked_at IS NOT NULL;
CREATE INDEX idx_user_achievements_pending_notification ON user_achievements(user_id, notified) WHERE unlocked_at IS NOT NULL AND notified = false;
```

### 4. `user_achievement_events` - Tracking de eventos

```sql
CREATE TABLE user_achievement_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- "trick_created", "trick_completed", "photo_added", etc.
  event_data JSONB, -- datos adicionales del evento
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_user_events_user_type ON user_achievement_events(user_id, event_type);
CREATE INDEX idx_user_events_created ON user_achievement_events(created_at);

-- Particionamiento por fecha (opcional, para escalar)
-- Particionar por mes si hay mucho volumen
```

**Eventos que se trackean:**

| Event Type | Cuándo se dispara | Event Data |
|-----------|------------------|------------|
| `trick_created` | Al crear un truco | `{"trick_id": "uuid"}` |
| `trick_completed` | Al completar todos los campos de un truco | `{"trick_id": "uuid"}` |
| `photo_added` | Al añadir foto a un truco | `{"trick_id": "uuid", "photo_count": 1}` |
| `video_added` | Al añadir video a un truco | `{"trick_id": "uuid", "video_type": "effect"}` |
| `tag_created` | Al crear una tag | `{"tag_id": "uuid", "tag_name": "text"}` |
| `tag_used` | Al aplicar una tag a un truco | `{"tag_id": "uuid", "trick_id": "uuid"}` |
| `category_created` | Al crear una categoría | `{"category_id": "uuid"}` |
| `daily_login` | Al abrir la app estando logueado | `{"login_date": "2025-01-15"}` |

### 5. `user_login_streaks` - Tracking de rachas

```sql
CREATE TABLE user_login_streaks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE, -- solo fecha, sin hora
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función para actualizar streak
CREATE OR REPLACE FUNCTION update_login_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_login DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_login_date, current_streak, longest_streak
  INTO v_last_login, v_current_streak, v_longest_streak
  FROM user_login_streaks
  WHERE user_id = p_user_id;

  -- Si no existe registro, crear uno
  IF NOT FOUND THEN
    INSERT INTO user_login_streaks (user_id, current_streak, longest_streak, last_login_date)
    VALUES (p_user_id, 1, 1, v_today);

    -- Registrar evento
    INSERT INTO user_achievement_events (user_id, event_type, event_data)
    VALUES (p_user_id, 'daily_login', jsonb_build_object('login_date', v_today));

    RETURN;
  END IF;

  -- Si ya se logueó hoy, no hacer nada
  IF v_last_login = v_today THEN
    RETURN;
  END IF;

  -- Si se logueó ayer, incrementar streak
  IF v_last_login = v_today - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  ELSE
    -- Si pasó más de un día, resetear streak
    v_current_streak := 1;
  END IF;

  -- Actualizar
  UPDATE user_login_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_login_date = v_today,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar evento
  INSERT INTO user_achievement_events (user_id, event_type, event_data)
  VALUES (p_user_id, 'daily_login', jsonb_build_object(
    'login_date', v_today,
    'current_streak', v_current_streak
  ));
END;
$$ LANGUAGE plpgsql;
```

### 6. `badges` - Definición de badges/apodos

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL, -- "el_visionario", "maestro_magia"
  achievement_id UUID REFERENCES achievements(id), -- logro que desbloquea este badge
  icon TEXT, -- icono del badge
  color TEXT DEFAULT '#5BB9A3', -- color del texto del badge
  font_family TEXT DEFAULT 'medium', -- "regular", "medium", "semibold"
  font_size INTEGER DEFAULT 14, -- tamaño de fuente relativo
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badge_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  text TEXT NOT NULL, -- "El Visionario", "The Visionary"
  UNIQUE(badge_id, language)
);
```

### 7. Actualización de `profiles` - Badge equipado

```sql
-- Añadir a la tabla profiles existente
ALTER TABLE profiles ADD COLUMN equipped_badge_id UUID REFERENCES badges(id);
CREATE INDEX idx_profiles_equipped_badge ON profiles(equipped_badge_id);
```

### 8. `global_leaderboard` - Ranking global (a futuro)

```sql
CREATE TABLE global_leaderboard (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  rank INTEGER,
  percentile NUMERIC(5,2), -- top 5%, top 10%, etc.
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_leaderboard_rank ON global_leaderboard(rank);
CREATE INDEX idx_leaderboard_points ON global_leaderboard(total_points DESC);

-- Función para actualizar leaderboard (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION update_global_leaderboard()
RETURNS void AS $$
BEGIN
  TRUNCATE global_leaderboard;

  INSERT INTO global_leaderboard (user_id, username, total_points, achievements_unlocked, rank, percentile)
  SELECT
    p.id,
    p.username,
    COALESCE(SUM(a.points), 0) as total_points,
    COUNT(ua.id) FILTER (WHERE ua.unlocked_at IS NOT NULL) as achievements_unlocked,
    RANK() OVER (ORDER BY COALESCE(SUM(a.points), 0) DESC) as rank,
    PERCENT_RANK() OVER (ORDER BY COALESCE(SUM(a.points), 0) DESC) * 100 as percentile
  FROM profiles p
  LEFT JOIN user_achievements ua ON ua.user_id = p.id AND ua.unlocked_at IS NOT NULL
  LEFT JOIN achievements a ON a.id = ua.achievement_id
  GROUP BY p.id, p.username;

  UPDATE global_leaderboard SET updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## Tipos de Logros

### Categorías

1. **tricks** - Relacionados con trucos
2. **organization** - Tags, categorías, organización
3. **engagement** - Logins, uso de la app
4. **special** - Logros secretos y especiales

### Ejemplos de Logros

#### 1. Logros de Trucos Completos

| Key | Nombre (ES) | Nombre (EN) | Requirement | Puntos | Badge |
|-----|-------------|-------------|-------------|--------|-------|
| `first_complete_trick` | "El Visionario" | "The Visionary" | 1 truco completo | 10 | ✓ |
| `tricks_complete_10` | "Aprendiz de Magia" | "Magic Apprentice" | 10 trucos completos | 20 | ✓ |
| `tricks_complete_50` | "Mago Profesional" | "Professional Magician" | 50 trucos completos | 50 | ✓ |
| `tricks_complete_100` | "Maestro de la Ilusión" | "Master of Illusion" | 100 trucos completos | 100 | ✓ |

**Criterios de truco completo:**
- Título ✓
- Categoría ✓
- Al menos 1 tag ✓
- Video de efecto ✓
- Video de secreto ✓
- Descripción de efecto ✓
- Descripción de secreto ✓
- Ángulo ✓
- Tiempo de duración ✓
- Tiempo de reset ✓
- Dificultad ✓
- Notas ✓

#### 2. Logros de Creación de Trucos (sin completar)

| Key | Nombre (ES) | Nombre (EN) | Requirement | Puntos |
|-----|-------------|-------------|-------------|--------|
| `tricks_created_25` | "Coleccionista" | "Collector" | 25 trucos creados | 15 |
| `tricks_created_100` | "Archivista" | "Archivist" | 100 trucos creados | 40 |

#### 3. Logros de Multimedia

| Key | Nombre (ES) | Nombre (EN) | Requirement | Puntos |
|-----|-------------|-------------|-------------|--------|
| `first_photo` | "Primera Imagen" | "First Image" | Añadir 1 foto | 5 |
| `photos_added_50` | "Fotógrafo Mágico" | "Magic Photographer" | Añadir 50 fotos | 25 |
| `first_video` | "Luces, Cámara, Magia" | "Lights, Camera, Magic" | Añadir 1 video | 10 |
| `videos_added_25` | "Cineasta de Ilusiones" | "Illusion Filmmaker" | Añadir 25 videos | 30 |

#### 4. Logros de Organización (Tags)

| Key | Nombre (ES) | Nombre (EN) | Requirement | Puntos | Badge |
|-----|-------------|-------------|-------------|--------|-------|
| `tags_created_10` | "Organizador Nato" | "Natural Organizer" | Crear 10 tags | 15 | - |
| `tags_created_50` | "Maestro del Orden" | "Master of Order" | Crear 50 tags | 40 | ✓ |
| `tag_used_10_times` | "Etiqueta Favorita" | "Favorite Tag" | Usar una tag 10 veces | 10 | - |
| `tags_total_100` | "Experto en Clasificación" | "Classification Expert" | Aplicar 100 tags en total | 35 | - |

#### 5. Logros de Categorías

| Key | Nombre (ES) | Nombre (EN) | Requirement | Puntos |
|-----|-------------|-------------|-------------|--------|
| `categories_created_5` | "Creador de Categorías" | "Category Creator" | Crear 5 categorías | 10 |
| `categories_created_20` | "Arquitecto de Biblioteca" | "Library Architect" | Crear 20 categorías | 30 |

#### 6. Logros de Engagement (Streaks)

| Key | Nombre (ES) | Nombre (EN) | Requirement | Puntos | Badge |
|-----|-------------|-------------|-------------|--------|-------|
| `streak_3_days` | "Constante" | "Consistent" | 3 días consecutivos | 10 | - |
| `streak_7_days` | "Dedicado" | "Dedicated" | 7 días consecutivos | 20 | ✓ |
| `streak_30_days` | "Disciplinado" | "Disciplined" | 30 días consecutivos | 50 | ✓ |
| `streak_100_days` | "Incansable" | "Relentless" | 100 días consecutivos | 150 | ✓ |
| `streak_365_days` | "Leyenda Viviente" | "Living Legend" | 365 días consecutivos | 500 | ✓ |

#### 7. Logros Secretos

| Key | Nombre (ES) | Nombre (EN) | Hint (ES) | Hint (EN) | Requirement | Puntos | Badge |
|-----|-------------|-------------|-----------|-----------|-------------|--------|-------|
| `secret_midnight_magic` | "Mago de Medianoche" | "Midnight Magician" | "La magia sucede a medianoche..." | "Magic happens at midnight..." | Crear truco entre 00:00-01:00 | 25 | ✓ |
| `secret_speed_creator` | "Velocista Mágico" | "Magic Speedster" | "¿Qué tan rápido puedes crear?" | "How fast can you create?" | Crear 5 trucos en 1 hora | 30 | - |
| `secret_perfectionist` | "El Perfeccionista" | "The Perfectionist" | "La perfección es clave..." | "Perfection is key..." | Crear 10 trucos completos sin errores | 40 | ✓ |

---

## Flujo de Desbloqueo

### 1. Evento del Usuario

```typescript
// Ejemplo: Usuario completa un truco
async function onTrickCompleted(trickId: string, userId: string) {
  // 1. Insertar evento
  await supabase.from('user_achievement_events').insert({
    user_id: userId,
    event_type: 'trick_completed',
    event_data: { trick_id: trickId }
  });

  // 2. El trigger/función de Supabase se encarga del resto
}
```

### 2. Función de Supabase que procesa eventos

```sql
-- Función que se ejecuta después de insertar un evento
CREATE OR REPLACE FUNCTION process_achievement_event()
RETURNS TRIGGER AS $$
DECLARE
  v_achievement RECORD;
  v_current_progress INTEGER;
  v_required INTEGER;
BEGIN
  -- Para cada logro activo del tipo correspondiente
  FOR v_achievement IN
    SELECT a.id, a.requirement, a.key
    FROM achievements a
    WHERE a.requirement->>'type' = NEW.event_type
      OR a.requirement->>'type' = 'all_events' -- para logros especiales
  LOOP
    -- Obtener progreso actual
    SELECT COALESCE((progress->>'current')::INTEGER, 0)
    INTO v_current_progress
    FROM user_achievements
    WHERE user_id = NEW.user_id
      AND achievement_id = v_achievement.id;

    -- Si no existe, crear registro
    IF NOT FOUND THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (
        NEW.user_id,
        v_achievement.id,
        jsonb_build_object('current', 1)
      );
      v_current_progress := 1;
    ELSE
      -- Incrementar progreso
      v_current_progress := v_current_progress + 1;

      UPDATE user_achievements
      SET progress = jsonb_build_object('current', v_current_progress),
          updated_at = NOW()
      WHERE user_id = NEW.user_id
        AND achievement_id = v_achievement.id;
    END IF;

    -- Verificar si se desbloqueó
    v_required := (v_achievement.requirement->>'count')::INTEGER;

    IF v_current_progress >= v_required THEN
      UPDATE user_achievements
      SET unlocked_at = NOW(),
          notified = false
      WHERE user_id = NEW.user_id
        AND achievement_id = v_achievement.id
        AND unlocked_at IS NULL; -- solo si no estaba desbloqueado
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trigger_process_achievement_event
AFTER INSERT ON user_achievement_events
FOR EACH ROW
EXECUTE FUNCTION process_achievement_event();
```

### 3. Verificación Batch (para logros retroactivos)

```sql
-- Función para verificar todos los logros de un usuario
CREATE OR REPLACE FUNCTION verify_user_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_achievement RECORD;
  v_count INTEGER;
BEGIN
  FOR v_achievement IN SELECT * FROM achievements
  LOOP
    -- Calcular progreso basado en el tipo de logro
    CASE v_achievement.requirement->>'type'
      WHEN 'tricks_completed' THEN
        SELECT COUNT(*) INTO v_count
        FROM magic_tricks
        WHERE user_id = p_user_id
          AND title IS NOT NULL
          AND category IS NOT NULL
          AND tags IS NOT NULL AND jsonb_array_length(tags) > 0
          AND effect_video_url IS NOT NULL
          AND secret_video_url IS NOT NULL
          AND effect IS NOT NULL
          AND secret IS NOT NULL
          AND angle IS NOT NULL
          AND duration IS NOT NULL
          AND reset_time IS NOT NULL
          AND difficulty IS NOT NULL
          AND notes IS NOT NULL;

      WHEN 'tricks_created' THEN
        SELECT COUNT(*) INTO v_count
        FROM magic_tricks
        WHERE user_id = p_user_id;

      WHEN 'tags_created' THEN
        SELECT COUNT(*) INTO v_count
        FROM predefined_tags
        WHERE user_id = p_user_id;

      WHEN 'categories_created' THEN
        SELECT COUNT(*) INTO v_count
        FROM user_categories
        WHERE user_id = p_user_id;

      -- ... otros tipos

      ELSE
        CONTINUE; -- skip si no podemos calcular
    END CASE;

    -- Insertar o actualizar progreso
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
    VALUES (
      p_user_id,
      v_achievement.id,
      jsonb_build_object('current', v_count),
      CASE WHEN v_count >= (v_achievement.requirement->>'count')::INTEGER
           THEN NOW()
           ELSE NULL
      END
    )
    ON CONFLICT (user_id, achievement_id)
    DO UPDATE SET
      progress = jsonb_build_object('current', v_count),
      unlocked_at = CASE
        WHEN v_count >= (v_achievement.requirement->>'count')::INTEGER
             AND user_achievements.unlocked_at IS NULL
        THEN NOW()
        ELSE user_achievements.unlocked_at
      END,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## Sistema de Badges

### Equipar Badge

```typescript
// Cliente
async function equipBadge(badgeId: string, userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ equipped_badge_id: badgeId })
    .eq('id', userId);

  if (error) throw error;
}

// Desequipar badge
async function unequipBadge(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ equipped_badge_id: null })
    .eq('id', userId);

  if (error) throw error;
}
```

### Mostrar Badge en UI

```typescript
interface UserWithBadge {
  username: string;
  badge?: {
    text: string;
    color: string;
    fontFamily: string;
    fontSize: number;
  }
}

// Componente de nombre con badge
function UserDisplayName({ user }: { user: UserWithBadge }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{
        fontSize: 18,
        fontFamily: fontNames.semiBold,
        color: '#FFFFFF'
      }}>
        {user.username}
      </Text>

      {user.badge && (
        <Text style={{
          fontSize: user.badge.fontSize,
          fontFamily: fontNames[user.badge.fontFamily],
          color: user.badge.color,
          marginLeft: 6
        }}>
          {user.badge.text}
        </Text>
      )}
    </View>
  );
}
```

---

## Leaderboard Global

### Actualización Periódica

```typescript
// Edge Function o Cron Job que se ejecuta cada hora
export async function updateLeaderboard() {
  const { error } = await supabase.rpc('update_global_leaderboard');

  if (error) {
    console.error('Error updating leaderboard:', error);
  }
}
```

### Consultar Top 10 y Posición del Usuario

```typescript
async function getLeaderboard(userId: string) {
  // Top 10
  const { data: top10 } = await supabase
    .from('global_leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .limit(10);

  // Posición del usuario
  const { data: userPosition } = await supabase
    .from('global_leaderboard')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { top10, userPosition };
}
```

---

## Implementación en el Cliente

### Service: AchievementsService

```typescript
// services/AchievementsService.ts
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  points: integer;
  isSecret: boolean;
  progress: {
    current: number;
    required: number;
  };
  unlockedAt?: string;
  badge?: {
    id: string;
    text: string;
    color: string;
  };
}

class AchievementsService {
  private cacheKey = '@achievements_cache';
  private cache: Achievement[] | null = null;

  // Obtener logros del usuario (con cache)
  async getUserAchievements(userId: string, language: string = 'es'): Promise<Achievement[]> {
    // 1. Intentar cargar de cache
    if (this.cache) {
      return this.cache;
    }

    // 2. Intentar cargar de AsyncStorage
    const cached = await AsyncStorage.getItem(`${this.cacheKey}_${userId}`);
    if (cached) {
      this.cache = JSON.parse(cached);

      // Refresh en background
      this.refreshAchievements(userId, language);

      return this.cache;
    }

    // 3. Cargar de Supabase
    return this.refreshAchievements(userId, language);
  }

  // Refrescar desde servidor
  private async refreshAchievements(userId: string, language: string): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        id,
        progress,
        unlocked_at,
        achievement:achievements (
          id,
          key,
          points,
          is_secret,
          requirement,
          translations:achievement_translations!inner (
            name,
            description,
            secret_hint
          ),
          badge:badges (
            id,
            translations:badge_translations!inner (
              text
            ),
            color,
            font_family,
            font_size
          )
        )
      `)
      .eq('user_id', userId)
      .eq('achievement.translations.language', language)
      .eq('achievement.badge.translations.language', language);

    if (error) throw error;

    // Mapear a formato limpio
    const achievements: Achievement[] = data.map(ua => ({
      id: ua.achievement.id,
      key: ua.achievement.key,
      name: ua.achievement.translations[0].name,
      description: ua.achievement.is_secret && !ua.unlocked_at
        ? ua.achievement.translations[0].secret_hint
        : ua.achievement.translations[0].description,
      points: ua.achievement.points,
      isSecret: ua.achievement.is_secret,
      progress: {
        current: ua.progress.current || 0,
        required: ua.achievement.requirement.count || 1
      },
      unlockedAt: ua.unlocked_at,
      badge: ua.achievement.badge ? {
        id: ua.achievement.badge.id,
        text: ua.achievement.badge.translations[0].text,
        color: ua.achievement.badge.color
      } : undefined
    }));

    // Guardar en cache
    this.cache = achievements;
    await AsyncStorage.setItem(
      `${this.cacheKey}_${userId}`,
      JSON.stringify(achievements)
    );

    return achievements;
  }

  // Obtener logros no notificados
  async getUnnotifiedAchievements(userId: string): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', userId)
      .eq('notified', false)
      .not('unlocked_at', 'is', null);

    if (error) throw error;

    return data || [];
  }

  // Marcar logros como notificados
  async markAsNotified(achievementIds: string[], userId: string) {
    const { error } = await supabase
      .from('user_achievements')
      .update({ notified: true })
      .in('achievement_id', achievementIds)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Registrar evento
  async trackEvent(
    userId: string,
    eventType: string,
    eventData?: any
  ) {
    const { error } = await supabase
      .from('user_achievement_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData || {}
      });

    if (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Actualizar login streak
  async updateLoginStreak(userId: string) {
    const { error } = await supabase.rpc('update_login_streak', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error updating login streak:', error);
    }
  }

  // Verificar logros en batch
  async verifyAllAchievements(userId: string) {
    const { error } = await supabase.rpc('verify_user_achievements', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error verifying achievements:', error);
    }
  }

  // Limpiar cache
  clearCache() {
    this.cache = null;
  }
}

export const achievementsService = new AchievementsService();
```

### Context: AchievementsContext

```typescript
// context/AchievementsContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { achievementsService } from '../services/AchievementsService';
import { supabase } from '../lib/supabase';

interface AchievementsContextType {
  achievements: Achievement[];
  unlockedCount: number;
  totalPoints: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextType | undefined>(undefined);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadAchievements();
      checkForNewUnlocks();

      // Suscripción real-time a cambios
      const subscription = supabase
        .channel(`achievements_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_achievements',
            filter: `user_id=eq.${userId}`
          },
          () => {
            loadAchievements();
            checkForNewUnlocks();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userId]);

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);

      // Actualizar login streak
      await achievementsService.updateLoginStreak(user.id);
    }
  };

  const loadAchievements = async () => {
    if (!userId) return;

    try {
      const data = await achievementsService.getUserAchievements(userId);
      setAchievements(data);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForNewUnlocks = async () => {
    if (!userId) return;

    const unnotified = await achievementsService.getUnnotifiedAchievements(userId);

    if (unnotified.length > 0) {
      // Mostrar notificaciones
      unnotified.forEach(achievement => {
        showAchievementNotification(achievement);
      });

      // Marcar como notificados
      await achievementsService.markAsNotified(
        unnotified.map(a => a.id),
        userId
      );
    }
  };

  const refresh = async () => {
    achievementsService.clearCache();
    await loadAchievements();
  };

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const totalPoints = achievements
    .filter(a => a.unlockedAt)
    .reduce((sum, a) => sum + a.points, 0);

  return (
    <AchievementsContext.Provider
      value={{
        achievements,
        unlockedCount,
        totalPoints,
        loading,
        refresh
      }}
    >
      {children}
    </AchievementsContext.Provider>
  );
}

export const useAchievements = () => {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error('useAchievements must be used within AchievementsProvider');
  }
  return context;
};
```

### Tracking de Eventos

```typescript
// Integrar en las acciones existentes

// En trickService.ts
export async function createTrick(trickData: any, userId: string) {
  // ... crear truco

  // Track evento
  await achievementsService.trackEvent(
    userId,
    'trick_created',
    { trick_id: newTrick.id }
  );

  // Si el truco está completo
  if (isTrickComplete(newTrick)) {
    await achievementsService.trackEvent(
      userId,
      'trick_completed',
      { trick_id: newTrick.id }
    );
  }

  return newTrick;
}

// Helper para verificar si un truco está completo
function isTrickComplete(trick: MagicTrick): boolean {
  return !!(
    trick.title &&
    trick.category &&
    trick.tags && trick.tags.length > 0 &&
    trick.effect_video_url &&
    trick.secret_video_url &&
    trick.effect &&
    trick.secret &&
    trick.angle &&
    trick.duration &&
    trick.reset_time &&
    trick.difficulty !== null &&
    trick.notes
  );
}

// Al añadir foto
export async function addPhotoToTrick(trickId: string, photoUrl: string, userId: string) {
  // ... añadir foto

  await achievementsService.trackEvent(
    userId,
    'photo_added',
    { trick_id: trickId, photo_count: 1 }
  );
}

// Al crear tag
export async function createTag(tagData: any, userId: string) {
  // ... crear tag

  await achievementsService.trackEvent(
    userId,
    'tag_created',
    { tag_id: newTag.id, tag_name: newTag.name }
  );
}

// Al aplicar tag a un truco
export async function addTagToTrick(trickId: string, tagId: string, userId: string) {
  // ... aplicar tag

  await achievementsService.trackEvent(
    userId,
    'tag_used',
    { trick_id: trickId, tag_id: tagId }
  );
}
```

---

## Notificaciones

### In-App Notifications

```typescript
// components/AchievementUnlockedModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

interface Props {
  visible: boolean;
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementUnlockedModal({ visible, achievement, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <View style={{
          backgroundColor: '#15322C',
          borderRadius: 20,
          padding: 30,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#5BB9A3',
          maxWidth: 400
        }}>
          {/* Animación de celebración */}
          <LottieView
            source={require('../assets/animations/achievement-unlock.json')}
            autoPlay
            loop={false}
            style={{ width: 150, height: 150 }}
          />

          <Text style={{
            fontSize: 24,
            fontFamily: fontNames.bold,
            color: '#5BB9A3',
            marginTop: 20,
            textAlign: 'center'
          }}>
            ¡Logro Desbloqueado!
          </Text>

          <Text style={{
            fontSize: 20,
            fontFamily: fontNames.semiBold,
            color: '#FFFFFF',
            marginTop: 10,
            textAlign: 'center'
          }}>
            {achievement.name}
          </Text>

          <Text style={{
            fontSize: 14,
            fontFamily: fontNames.regular,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 10,
            textAlign: 'center'
          }}>
            {achievement.description}
          </Text>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 20,
            backgroundColor: 'rgba(91,185,163,0.2)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20
          }}>
            <Ionicons name="star" size={20} color="#5BB9A3" />
            <Text style={{
              fontSize: 16,
              fontFamily: fontNames.medium,
              color: '#5BB9A3',
              marginLeft: 8
            }}>
              +{achievement.points} puntos
            </Text>
          </View>

          {achievement.badge && (
            <View style={{
              marginTop: 20,
              padding: 12,
              backgroundColor: 'rgba(91,185,163,0.1)',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(91,185,163,0.3)'
            }}>
              <Text style={{
                fontSize: 12,
                fontFamily: fontNames.regular,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 4
              }}>
                Badge desbloqueado:
              </Text>
              <Text style={{
                fontSize: 16,
                fontFamily: fontNames.medium,
                color: achievement.badge.color
              }}>
                {achievement.badge.text}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 30,
              backgroundColor: '#5BB9A3',
              paddingHorizontal: 40,
              paddingVertical: 12,
              borderRadius: 25
            }}
          >
            <Text style={{
              fontSize: 16,
              fontFamily: fontNames.semiBold,
              color: '#FFFFFF'
            }}>
              ¡Genial!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
```

### Push Notifications

```typescript
// services/PushNotificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function sendAchievementPushNotification(achievement: Achievement) {
  // Solo si la app está en background
  const appState = await Notifications.getBackgroundPermissionStatusAsync();

  if (appState.granted) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏆 ¡Logro Desbloqueado!',
        body: achievement.name,
        data: {
          type: 'achievement_unlocked',
          achievementId: achievement.id
        },
        sound: 'achievement.wav',
      },
      trigger: null, // enviar inmediatamente
    });
  }
}

// Solicitar permisos
export async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Logros',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'achievement.wav',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions not granted');
    return false;
  }

  return true;
}
```

---

## Consideraciones de Performance

### 1. Índices en Base de Datos
- Ya definidos en las tablas de arriba
- Monitorear queries lentas con `pg_stat_statements`

### 2. Cache Local
- Usar AsyncStorage para estado offline
- Cache en memoria para lecturas frecuentes
- Invalidar cache cuando hay cambios

### 3. Real-time Subscriptions
- Suscribirse solo a cambios del usuario actual
- Desuscribirse cuando el componente se desmonta
- Throttle de actualizaciones si es necesario

### 4. Batch Processing
- Verificación de logros en batch al:
  - Login del usuario
  - Añadir nuevos logros
  - Sincronización periódica
- Usar `verify_user_achievements()` con cuidado (es intensivo)

### 5. Event Queue
- Los eventos se insertan de forma asíncrona
- No bloquean la UI del usuario
- Si falla, reintentar en background

### 6. Leaderboard
- Actualizar cada hora (no real-time)
- Cachear resultados
- Particionar si crece mucho

### 7. Imágenes y Assets
- Pre-cargar iconos de logros
- Usar sprites si hay muchos iconos
- Comprimir animaciones Lottie

---

## Roadmap de Implementación

### Fase 1: Fundamentos (Sprint 1-2)
- [ ] Crear todas las tablas en Supabase
- [ ] Crear funciones y triggers básicos
- [ ] Poblar catálogo inicial de logros
- [ ] Añadir traducciones (ES/EN)
- [ ] Implementar AchievementsService
- [ ] Tracking básico de eventos

### Fase 2: UI Básica (Sprint 3)
- [ ] Pantalla de logros en perfil
- [ ] Mostrar progreso de logros
- [ ] Modal de logro desbloqueado
- [ ] Sistema de badges (equipar/desequipar)

### Fase 3: Notificaciones (Sprint 4)
- [ ] Notificaciones in-app
- [ ] Push notifications
- [ ] Verificación periódica de logros

### Fase 4: Features Avanzadas (Sprint 5+)
- [ ] Logros secretos
- [ ] Animaciones y efectos visuales
- [ ] Sistema de puntos y leaderboard
- [ ] Compartir logros (si hay social)

### Fase 5: Optimización (Ongoing)
- [ ] Monitoreo de performance
- [ ] Ajuste de índices
- [ ] Caché strategy
- [ ] A/B testing de gamificación

---

## Mantenimiento y Monitoreo

### Métricas a trackear:
- Tasa de desbloqueo de logros
- Logros más populares
- Logros nunca desbloqueados (revisar dificultad)
- Tiempo promedio para desbloquear
- Engagement después de desbloquear logros

### Queries útiles:

```sql
-- Logros más desbloqueados
SELECT a.key, at.name, COUNT(*) as unlock_count
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
JOIN achievement_translations at ON at.achievement_id = a.id
WHERE ua.unlocked_at IS NOT NULL
  AND at.language = 'es'
GROUP BY a.key, at.name
ORDER BY unlock_count DESC;

-- Usuarios más activos (por puntos)
SELECT p.username, SUM(a.points) as total_points
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
JOIN profiles p ON p.id = ua.user_id
WHERE ua.unlocked_at IS NOT NULL
GROUP BY p.username
ORDER BY total_points DESC
LIMIT 10;

-- Logros nunca desbloqueados
SELECT a.key, at.name
FROM achievements a
JOIN achievement_translations at ON at.achievement_id = a.id
WHERE NOT EXISTS (
  SELECT 1 FROM user_achievements ua
  WHERE ua.achievement_id = a.id
    AND ua.unlocked_at IS NOT NULL
)
AND at.language = 'es';
```

---

## Notas Finales

- **Escalabilidad**: Sistema diseñado para crecer con la app
- **Flexibilidad**: Fácil añadir nuevos tipos de logros
- **Performance**: Cache local + batch processing
- **UX**: Notificaciones no intrusivas pero satisfactorias
- **Motivación**: Balance entre logros fáciles y desafiantes
- **Internacionalización**: Soporte multi-idioma desde el inicio

**Siguiente paso**: Validar con stakeholders y comenzar implementación por fases.

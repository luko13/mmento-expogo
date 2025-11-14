# Event Tracking Integration Guide

## Overview

This guide explains how to integrate achievement event tracking throughout the application. The event tracking system automatically unlocks achievements based on user actions.

---

## How It Works

### 1. Event Flow

```
User Action → trackEvent() → Database Insert → Trigger → Auto-unlock Achievement → Update Cache
```

### 2. Database Trigger

When an event is inserted into `user_achievement_events`, a PostgreSQL trigger (`trigger_process_achievement_event`) automatically:
- Finds all achievements matching the event type
- Updates progress in `user_achievements`
- Unlocks achievements when progress >= threshold
- Sets `notified = false` for newly unlocked achievements

---

## Integration Points

### Required Events to Track

Based on the migration script, these are the event types that need tracking:

| Event Type | When to Track | Where to Integrate |
|------------|---------------|-------------------|
| `tricks_created` | When a new trick is created | After successful insert in `magic_tricks` |
| `categories_created` | When a new category is created | After successful insert in `user_categories` |
| `favorites_created` | When a trick is favorited | After successful insert in `user_favorites` |
| `daily_login` | On app startup | `app/(app)/_layout.tsx` or auth initialization |

---

## Implementation Examples

### 1. Tracking Trick Creation

**File:** `components/add-magic/AddMagicWizard.tsx` (or wherever tricks are created)

```typescript
import { achievementsService } from "@/services/achievementsService";

// After successfully inserting trick
const handleSaveTrick = async () => {
  try {
    // ... existing trick creation logic ...
    const { data: newTrick, error } = await supabase
      .from("magic_tricks")
      .insert([trickData])
      .select()
      .single();

    if (error) throw error;

    // Track event for achievements
    await achievementsService.trackEvent(
      user.id,
      "tricks_created",
      { trick_id: newTrick.id }
    );

    // ... rest of the logic ...
  } catch (error) {
    console.error("Error creating trick:", error);
  }
};
```

### 2. Tracking Category Creation

**File:** Wherever categories are created (likely `LibraryDataContext.tsx` or a category service)

```typescript
import { achievementsService } from "@/services/achievementsService";

const createCategory = async (categoryData: any) => {
  try {
    const { data: newCategory, error } = await supabase
      .from("user_categories")
      .insert([categoryData])
      .select()
      .single();

    if (error) throw error;

    // Track event for achievements
    await achievementsService.trackEvent(
      user.id,
      "categories_created",
      { category_id: newCategory.id }
    );

    return newCategory;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
};
```

### 3. Tracking Favorites

**File:** Wherever favorites are toggled (likely in `LibraryDataContext.tsx`)

```typescript
import { achievementsService } from "@/services/achievementsService";

const toggleFavorite = async (trickId: string, isFavorite: boolean) => {
  try {
    if (isFavorite) {
      // Removing favorite
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("trick_id", trickId);

      if (error) throw error;
    } else {
      // Adding favorite
      const { error } = await supabase
        .from("user_favorites")
        .insert({
          user_id: user.id,
          trick_id: trickId,
          favorited_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Track event for achievements (only when adding)
      await achievementsService.trackEvent(
        user.id,
        "favorites_created",
        { trick_id: trickId }
      );
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    throw error;
  }
};
```

### 4. Tracking Daily Login

**File:** `app/(app)/_layout.tsx` or wherever auth state is initialized

```typescript
import { achievementsService } from "@/services/achievementsService";
import { streaksService } from "@/services/streaksService";
import { useEffect } from "react";

export default function AppLayout() {
  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Update login streak (includes event tracking)
        const needsUpdate = await streaksService.needsStreakUpdate(user.id);

        if (needsUpdate) {
          await streaksService.updateStreak(user.id);
          // The database function update_login_streak already creates the daily_login event
        }
      }
    };

    initializeUser();
  }, []);

  // ... rest of the layout
}
```

---

## Finding Integration Points

### Step 1: Search for Database Inserts

Search your codebase for these patterns:

```bash
# Search for trick creation
grep -r "\.from(\"magic_tricks\")\.insert" .

# Search for category creation
grep -r "\.from(\"user_categories\")\.insert" .

# Search for favorite creation
grep -r "\.from(\"user_favorites\")\.insert" .
```

### Step 2: Check LibraryDataContext

The `LibraryDataContext.tsx` likely contains most CRUD operations:

```typescript
// Look for functions like:
- createTrick()
- createCategory()
- toggleFavorite()
- addToFavorites()
```

### Step 3: Check SupabaseDataService

```typescript
// Look for insert methods in:
services/SupabaseDataService.ts
```

---

## Important Notes

### 1. Offline Handling

Event tracking works with the offline queue system:

```typescript
import { networkMonitorService } from "@/services/NetworkMonitorService";
import { achievementsService } from "@/services/achievementsService";

// Track event (works both online and offline)
await achievementsService.trackEvent(userId, eventType, eventData);

// The trackEvent function already handles cache clearing
// No need to manually clear cache
```

### 2. Error Handling

```typescript
try {
  // Main operation (e.g., create trick)
  const result = await performMainOperation();

  // Track event (non-blocking, errors logged)
  achievementsService.trackEvent(userId, eventType, eventData)
    .catch(err => console.error("Failed to track event:", err));

  return result;
} catch (error) {
  // Handle main operation error
  console.error("Operation failed:", error);
  throw error;
}
```

### 3. Don't Track Edits

Only track **creation** events, not updates:

```typescript
// ❌ DON'T track on update
await achievementsService.trackEvent(userId, "tricks_updated", {...}); // NO

// ✅ DO track on creation
await achievementsService.trackEvent(userId, "tricks_created", {...}); // YES
```

### 4. Event Data (Optional)

The `event_data` parameter is optional but useful for debugging:

```typescript
// Minimal (just track the event)
await achievementsService.trackEvent(userId, "tricks_created");

// With context (recommended)
await achievementsService.trackEvent(userId, "tricks_created", {
  trick_id: newTrick.id,
  trick_title: newTrick.title,
  timestamp: new Date().toISOString(),
});
```

---

## Verification

### 1. Check Events in Database

```sql
-- See recent events for a user
SELECT * FROM user_achievement_events
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Check Achievement Progress

```sql
-- See achievement progress for a user
SELECT a.key, a.threshold, ua.progress, ua.is_unlocked
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.user_id = 'USER_ID';
```

### 3. Test in App

```typescript
// In your profile screen or a debug screen
const testTracking = async () => {
  // Track a test event
  await achievementsService.trackEvent(userId, "tricks_created", {
    test: true,
  });

  // Wait a moment for trigger to process
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Fetch updated achievements
  const achievements = await achievementsService.getUserAchievementProgress(userId, undefined, false);
  console.log("Updated achievements:", achievements);
};
```

---

## Checklist

Use this checklist to ensure complete integration:

- [ ] **Trick Creation**: Event tracking added after successful `magic_tricks` insert
- [ ] **Category Creation**: Event tracking added after successful `user_categories` insert
- [ ] **Favorite Creation**: Event tracking added after successful `user_favorites` insert
- [ ] **Daily Login**: Streak update called on app initialization
- [ ] **Error Handling**: Event tracking wrapped in try-catch or `.catch()`
- [ ] **Offline Support**: Event tracking works with offline queue
- [ ] **Cache Clearing**: No manual cache clearing needed (handled by `trackEvent`)
- [ ] **Testing**: Verified events appear in `user_achievement_events` table
- [ ] **Progress Updates**: Verified `user_achievements` progress increments
- [ ] **Unlocking**: Verified achievements unlock when threshold is reached

---

## Debugging

### Common Issues

**1. Events tracked but progress not updating:**
- Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_process_achievement_event';`
- Check function exists: `SELECT proname FROM pg_proc WHERE proname = 'process_achievement_event';`
- Check event_type matches achievement requirement:
  ```sql
  SELECT key, requirement->>'type' as event_type FROM achievements;
  ```

**2. Achievements not unlocking:**
- Verify progress >= threshold:
  ```sql
  SELECT ua.progress, a.threshold, ua.is_unlocked
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.user_id = 'USER_ID';
  ```
- Run manual verification:
  ```sql
  SELECT verify_user_achievements('USER_ID');
  ```

**3. Cache not updating:**
- Event tracking automatically clears cache
- If issues persist, manually clear:
  ```typescript
  await achievementsService.clearCache(userId);
  ```

---

## Next Steps

After integrating event tracking:

1. **Test Each Event Type**: Create tricks, categories, favorites, and login to verify tracking
2. **Check Notifications**: Implement `getUnnotifiedAchievements()` check on app startup
3. **Show Celebration Modal**: Display newly unlocked achievements to users
4. **Add Badge Management**: Allow users to equip unlocked badges
5. **Implement Leaderboard**: Show global rankings and user position

---

## API Reference

### achievementsService.trackEvent()

```typescript
trackEvent(
  userId: string,
  eventType: string,
  eventData?: any
): Promise<void>
```

**Parameters:**
- `userId` - The user ID
- `eventType` - One of: `tricks_created`, `categories_created`, `favorites_created`, `daily_login`
- `eventData` - Optional JSONB data for debugging/context

**Returns:** Promise that resolves when event is tracked (or logs error)

**Side Effects:**
- Inserts row in `user_achievement_events`
- Clears achievement cache for user
- Triggers automatic achievement processing

**Example:**
```typescript
await achievementsService.trackEvent(
  user.id,
  "tricks_created",
  { trick_id: "123", timestamp: new Date().toISOString() }
);
```

---

## Additional Resources

- **Database Migration**: `docs/supabase_achievements_migration.sql`
- **Complete System Docs**: `ACHIEVEMENTS_COMPLETE_SYSTEM.md`
- **Services**:
  - `services/achievementsService.ts` - Main achievement operations
  - `services/badgesService.ts` - Badge management
  - `services/streaksService.ts` - Login streak tracking
  - `services/userStatsService.ts` - User statistics

---

**Status:** ✅ READY FOR INTEGRATION

Follow this guide to add event tracking throughout your application. The database triggers will handle the rest automatically!

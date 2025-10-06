# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mmento** is a React Native mobile application built with Expo for managing and organizing magic tricks. It allows magicians to create, store, and organize their tricks with multimedia content (photos, videos), categorization, and detailed performance metadata.

## Technology Stack

- **Framework**: React Native 0.79.4 with Expo SDK 53
- **Router**: expo-router (file-based routing)
- **Backend**: Supabase (authentication, database, storage)
- **Styling**: NativeWind (TailwindCSS for React Native)
- **Language**: TypeScript with strict mode
- **State Management**: React Context (LibraryDataContext, SearchContext, TrickDeletionContext)
- **Local Storage**: AsyncStorage with in-memory cache for performance
- **Media**: expo-camera, expo-image-picker, expo-video, react-native-compressor
- **AI Integration**: OpenAI API for chat/assistance features

## Essential Commands

### Development
```bash
npm start                    # Start Expo dev server with dev client
npm run android             # Run on Android device/emulator
npm run ios                 # Run on iOS device/simulator
npm run web                 # Run web version
```

### Building
```bash
npm run build:dev:android   # Build development client for Android (EAS)
npm run build:dev:ios       # Build development client for iOS (EAS)
```

### Environment Setup
- Copy `.env` and configure:
  - `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
  - `OPENAI_API_KEY`: OpenAI API key for AI features

## Architecture

### File-Based Routing Structure
```
app/
├── index.tsx                    # Landing/auth check screen
├── _layout.tsx                  # Root layout with i18n, fonts, background
├── auth/                        # Authentication flows
│   ├── login.tsx
│   ├── register.tsx
│   └── password-recover.tsx
└── (app)/                       # Main authenticated app
    ├── _layout.tsx              # Tab navigation layout
    ├── home/                    # Library/tricks list
    ├── add-magic/               # Add new trick flow
    ├── edit-trick/              # Edit existing trick
    ├── trick/                   # View trick details
    ├── profile/                 # User profile
    ├── mmento-ai/              # AI assistant chat
    └── notifications/           # Notifications
```

### Data Architecture

**Dual-Layer Data System:**
1. **Supabase (Source of Truth)**: Real-time database with PostgreSQL
   - Tables: `magic_tricks`, `user_categories`, `user_favorites`, `trick_photos`, `trick_categories`, `trick_tags`
   - Real-time subscriptions for instant updates across devices

2. **Local Cache (Performance Layer)**: AsyncStorage + in-memory cache
   - Implemented in `services/LocalDataService.ts`
   - Hydrates memory cache on app start for synchronous reads
   - Writes to memory immediately, persists to AsyncStorage asynchronously
   - Cache invalidation via real-time subscriptions

**Key Services:**
- `services/LocalDataService.ts`: Local caching and offline data management
- `services/SupabaseDataService.ts`: Supabase CRUD operations
- `services/trickService.ts`: Business logic for trick operations
- `services/fileUploadService.ts`: Media upload with progress tracking
- `services/videoService.ts`: Video compression and processing
- `services/audioService.ts`: Audio handling
- `services/openAIService.ts`: AI chat integration

### Context Providers

**LibraryDataContext** (`context/LibraryDataContext.tsx`):
- Central state management for user's trick library
- Manages categories, tricks, favorites, and filtering
- Implements cache-first strategy with network sync
- Real-time updates via Supabase subscriptions
- Search and filter functionality

**SearchContext** (`context/SearchContext.tsx`):
- Search query and filter state management

**TrickDeletionContext** (`context/TrickDeletionContext.tsx`):
- Handles trick deletion with confirmation and cleanup

### Type Definitions

Primary types in `types/magicTrick.ts`:
- `MagicTrick`: Client-side trick representation with local file handling
- `MagicTrickDBRecord`: Database schema mapping
- `LocalTrick`: Cached trick format with normalized relations
- `LocalCategory`: Cached category format

### Styling System

**Background Handling:**
- Conditional backgrounds in `app/_layout.tsx` based on route
- Green gradient (`#15322C`) for add/edit/view trick screens
- Custom background image for home/other screens
- Auth-specific background for login/register

**Fonts:**
- Custom Outfit font family loaded from `assets/fonts/`
- Font weights: Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black
- Access via exported `fontNames` from `app/_layout.tsx`

**NativeWind:**
- TailwindCSS classes via `className` prop
- Config in `tailwind.config.js`

### Media Handling

**Video Processing:**
- Compression with `react-native-compressor`
- Thumbnail generation with `expo-video-thumbnails`
- Support for both effect and secret videos per trick
- Upload progress tracking callbacks

**Photo Management:**
- Multiple photos per trick via `trick_photos` table
- Image manipulation with `expo-image-manipulator`
- Camera capture and gallery selection
- Compression before upload

### Internationalization

- `i18next` with `react-i18next`
- Translations in `translations/en.json` and `translations/es.json`
- Auto-detection of device language on app start
- Configured in `i18n.ts`

## Common Patterns

### Adding a New Screen
1. Create file in appropriate `app/` directory
2. Screen automatically available via expo-router
3. Add background handling in `app/_layout.tsx` if needed
4. Wrap with appropriate Context providers if needed

### Data Fetching Pattern
```typescript
// 1. Check local cache first (synchronous)
const cachedData = await localDataService.getUserData(userId);
if (cachedData) {
  // Use cached data immediately
}

// 2. Fetch from network
const networkData = await supabaseDataService.fetchAllUserData(userId);

// 3. Update cache
localDataService.saveUserData(networkData);
```

### Real-time Updates
```typescript
// Subscribe to table changes
const channel = supabase
  .channel(`user_library_${userId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'magic_tricks',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Handle update
  })
  .subscribe();
```

### File Upload with Progress
```typescript
// Use fileUploadService with progress callback
await fileUploadService.uploadVideo(
  localUri,
  userId,
  (progress, fileName) => {
    // Update UI with progress
  }
);
```

## Critical Implementation Details

### Android Status/Navigation Bar
- Transparent status bar configured in `App.tsx` and `app.json`
- Navigation bar color: `#00000001` (nearly transparent)
- StatusBar: `translucent: true`, `backgroundColor: transparent`

### New Architecture
- React Native New Architecture enabled (`newArchEnabled: true` in app.json)
- Ensure native modules are New Arch compatible

### Hermes Engine
- Hermes is enabled by default with Expo
- Check `global.HermesInternal` for runtime detection (see App.tsx)

### Category Management
- Virtual "Favorites" category with ID `favorites-virtual`
- Real categories from `user_categories` table
- Tricks can belong to multiple categories via `trick_categories` junction table

### Search & Filtering
- Search across trick title, effect, and secret fields
- Filters: categories, difficulty (1-5), duration range
- Applied via `LibraryDataContext.applyFilters()`

## Security Considerations

- Supabase Row Level Security (RLS) enforces user data isolation
- AsyncStorage used for non-sensitive cached data
- expo-secure-store available for sensitive data (auth tokens handled by Supabase SDK)
- OpenAI API key in environment variables (not committed)

## Performance Optimizations

- In-memory cache for synchronous data access
- FlashList instead of FlatList for large lists
- Video compression before upload
- Optimized base64 encoding/decoding in `utils/optimizedBase64.ts`
- Pagination service for large content (`utils/paginatedContentService.ts`)
- Performance optimizer utilities in `utils/performanceOptimizer.ts`

## Offline-First Architecture

The app implements a comprehensive offline-first system that allows full functionality without network connection, with automatic background synchronization when connectivity is restored.

### System Components

**1. Network Monitor Service** (`services/NetworkMonitorService.ts`)
- Monitors network connectivity in real-time
- Provides connection status to entire app
- Triggers sync operations when connection is restored

**2. Offline Queue Service** (`lib/offlineQueue.ts`)
- Queues operations performed offline
- Automatic retry with exponential backoff (max 3 attempts)
- Supports operations:
  - `create_trick`: Create new tricks offline
  - `update_trick`: Edit existing tricks
  - `delete_trick`: Delete tricks
  - `toggle_favorite`: Toggle favorite status
  - `create_category`, `update_category`, `delete_category`

**3. Local Data Service** (`services/LocalDataService.ts`)
- AsyncStorage + in-memory cache for instant access
- Tracks pending changes with `_pendingSync` and `_isLocalOnly` flags
- Provides `getPendingTricks()` and `getPendingCategories()` methods

**4. Offline Sync Context** (`context/OfflineSyncContext.tsx`)
- Global state for offline/sync status
- Automatic sync on:
  - Network reconnection
  - App foreground transition
  - Manual trigger via `syncNow()`
- Provides: `isOnline`, `isSyncing`, `pendingOperations`, `lastSyncTime`

**5. Offline Indicator UI** (`components/ui/OfflineIndicator.tsx`)
- Visual indicator at top of screen
- Shows offline status, pending operations, sync progress
- Tap to manually trigger sync

### Implementation Pattern

When performing operations that modify data:

```typescript
// 1. Update local cache immediately (optimistic update)
localDataService.updateTrick(userId, trickId, updates, !networkMonitorService.isOnline());

// 2. If offline, queue for later
if (!networkMonitorService.isOnline()) {
  await offlineQueueService.enqueue({
    userId,
    type: "update_trick",
    payload: { trickId, data: updates }
  });
  return true; // User sees immediate feedback
}

// 3. If online, try server update
try {
  await supabase.from("magic_tricks").update(updates).eq("id", trickId);
  return true;
} catch (error) {
  // Queue for retry if server fails
  await offlineQueueService.enqueue({
    userId,
    type: "update_trick",
    payload: { trickId, data: updates }
  });
  return false;
}
```

### Integration Instructions

**1. Wrap app with OfflineSyncProvider:**
```typescript
// app/_layout.tsx or App.tsx
import { OfflineSyncProvider } from './context/OfflineSyncContext';

<OfflineSyncProvider>
  <YourApp />
</OfflineSyncProvider>
```

**2. Add OfflineIndicator to layout:**
```typescript
import { OfflineIndicator } from './components/ui/OfflineIndicator';

<View style={{ flex: 1 }}>
  <OfflineIndicator />
  <YourContent />
</View>
```

**3. Use in components:**
```typescript
import { useOfflineSync } from './context/OfflineSyncContext';

const { isOnline, syncNow, pendingOperations } = useOfflineSync();

// Check if online before sensitive operations
if (!isOnline) {
  alert("Esta operación requiere conexión a internet");
  return;
}
```

### Conflict Resolution

Currently implements "last write wins" strategy:
- Operations are executed in chronological order (timestamp-based)
- Server state is considered authoritative after sync
- Failed operations after 3 retries are marked as `failed` status

### Testing Offline Mode

1. Enable airplane mode on device
2. Perform operations (create/edit/delete tricks)
3. Observe OfflineIndicator showing pending operations
4. Disable airplane mode
5. Automatic sync occurs within seconds
6. Verify changes appear in Supabase database

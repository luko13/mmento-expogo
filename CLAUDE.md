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
1. **Supabase (Source of Truth)**: Real-time database with PostgreSQL (30+ tables)
   - Real-time subscriptions for instant updates across devices
   - Full-Text Search optimized with GIN indexes (`search_vector` column)
   - Row Level Security (RLS) for data isolation

2. **Local Cache (Performance Layer)**: AsyncStorage + in-memory cache
   - Implemented in `services/LocalDataService.ts`
   - Hydrates memory cache on app start for synchronous reads
   - Writes to memory immediately, persists to AsyncStorage asynchronously
   - Cache invalidation via real-time subscriptions

**Database Tables (30+ tables organized by feature):**

### Core Magic Tricks (8 tables)
- **`magic_tricks`**: Main tricks table with title, effect, secret, videos, photos, difficulty, duration, reset, angles (JSONB), status, `search_vector` (tsvector for FTS)
- **`trick_categories`**: Junction table connecting tricks ↔ user categories (many-to-many)
- **`trick_tags`**: Tags associated with tricks (many-to-many)
- **`trick_photos`**: Multiple photos per trick (one-to-many)
- **`trick_gimmicks`**: Junction table connecting tricks ↔ gimmicks (many-to-many)
- **`trick_techniques`**: Junction table connecting tricks ↔ techniques (many-to-many)
- **`user_categories`**: User's custom categories for organizing tricks
- **`user_category_order`**: Custom ordering of categories per user

### Gimmicks & Techniques (5 tables)
- **`gimmicks`**: Catalog of gimmicks (e.g., Invisible Deck, Loops, etc.)
- **`gimmick_categories`**: Categories for organizing gimmicks
- **`techniques`**: Catalog of techniques (e.g., Double Lift, Palm, False Shuffle)
- **`technique_categories`**: Categories for organizing techniques
- **`technique_tags`**: Tags for techniques (many-to-many)

### Scripts (1 table)
- **`scripts`**: Performance scripts and patter for tricks

### AI Assistant - Mmento AI (4 tables)
- **`ai_conversations`**: Chat conversations with AI assistant
- **`ai_messages`**: Individual messages within conversations
- **`ai_folders`**: Folders for organizing AI conversations
- **`ai_usage_tracking`**: Token usage tracking for OpenAI API

### Social & Sharing (4 tables)
- **`shared_content`**: Tricks and content shared publicly between users
- **`messages`**: Direct messages between users
- **`chat_groups`**: Group chat rooms
- **`group_members`**: Junction table for group membership (many-to-many)

### User Management (6 tables)
- **`profiles`**: User profiles (username, email, avatar_url, subscription_type)
- **`user_favorites`**: User's favorited content (tricks, gimmicks, techniques)
- **`roles`**: User roles and permissions system
- **`bans`**: Banned users tracking
- **`reports`**: Content reports and moderation
- **`purchases`**: Purchase history and subscriptions

### Predefined Content (2 tables)
- **`predefined_categories`**: System-defined categories
- **`predefined_tags`**: System-defined tags for tricks and techniques

**Database Optimizations:**
- ✅ **Full-Text Search (FTS)**: `magic_tricks.search_vector` column with GIN index for ultra-fast multi-language search
- ✅ **Trigger**: `tsvector_update_trigger` automatically updates `search_vector` on INSERT/UPDATE
- ✅ **Hybrid Search**: Client-side search for <500 tricks, server-side FTS for ≥500 tricks
- ✅ **JSONB Indexes**: GIN index on `magic_tricks.angles` for efficient array queries
- ✅ **Composite Indexes**: Optimized for common queries (user_id + created_at, user_id + difficulty)

**Key Services:**
- `services/LocalDataService.ts`: Local caching and offline data management
- `services/SupabaseDataService.ts`: Supabase CRUD operations
- `services/trickService.ts`: Business logic for trick operations
- `services/HybridSearchService.ts`: Intelligent search (client-side <500 tricks, server-side FTS ≥500 tricks)
- `services/fileUploadService.ts`: Media upload with progress tracking to Cloudflare R2/Stream
- `services/videoService.ts`: Video compression and processing
- `services/videoAnalysisService.ts`: Intelligent video compression based on content analysis
- `services/audioService.ts`: Audio handling
- `services/openAIService.ts`: AI chat integration with GPT-4
- `services/chatService.ts`: Chat conversation management for Mmento AI
- `services/cloudflare/CloudflareStreamService.ts`: Video streaming via Cloudflare Stream

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


## Database Reference

For a complete database schema with all tables, indexes, triggers, and relationships, refer to:
- **`docs/SUPABASE_DATABASE_SNAPSHOT.md`** - Complete snapshot of database structure with real data
- **`docs/DATABASE_ANALYSIS.md`** - Detailed analysis and recommendations
- **`docs/SUPABASE_DATABASE_MAP.sql`** - SQL queries to regenerate snapshot

### Database Schema Quick Reference

**Primary Tables:**
- `magic_tricks` (28 columns including `search_vector` for FTS)
- `profiles` (user profiles with subscription info)
- `user_categories` (custom trick categories)
- `user_favorites` (favorited content)

**Junction Tables (Many-to-Many):**
- `trick_categories` (tricks ↔ categories)
- `trick_tags` (tricks ↔ tags)
- `trick_gimmicks` (tricks ↔ gimmicks)
- `trick_techniques` (tricks ↔ techniques)
- `technique_tags` (techniques ↔ tags)
- `group_members` (users ↔ chat groups)

**Key Indexes:**
- `idx_magic_tricks_search_vector` (GIN) - Full-Text Search
- `idx_magic_tricks_user_created` (BTREE) - User queries with date sorting
- `idx_magic_tricks_angles` (GIN) - JSONB array queries
- `idx_magic_tricks_user_difficulty` (BTREE) - Difficulty filtering

**Active Triggers:**
- `tsvector_update_trigger` - Auto-updates `search_vector` on INSERT/UPDATE of magic_tricks
- `update_conversation_on_new_message` - Updates AI conversation timestamps
- `update_profiles_updated_at` - Updates profile timestamps

**Row Level Security (RLS):**
- All tables with `user_id` have RLS enabled
- Policy pattern: `auth.uid() = user_id`
- Ensures users only access their own data

### Search System Architecture

**HybridSearchService** (`services/HybridSearchService.ts`):
- **< 500 tricks**: Client-side JavaScript search (fast enough for small datasets)
- **≥ 500 tricks**: Server-side PostgreSQL Full-Text Search with GIN index
- **Threshold**: Configurable via `HYBRID_THRESHOLD` constant (default: 500)

**Full-Text Search Configuration:**
- **Language**: `'simple'` (multi-language support: Spanish, English, and others)
- **Index**: `idx_magic_tricks_search_vector` (GIN)
- **Search Fields**: title, effect, secret
- **Query Syntax**: `websearch_to_tsquery` (Google-like syntax: OR, -, "exact phrases")
- **Performance**: ~0.5-2ms for searches with index

**Search Flow:**
1. User types query in `CompactSearchBar`
2. `SearchContext` updates state
3. `LibraryDataContext` detects change
4. `HybridSearchService.shouldUseServerSearch()` checks trick count
5. If ≥500: `searchOnServer()` uses FTS with GIN index
6. If <500: `buildSections()` filters in JavaScript
7. Results displayed in `LibrariesSection`

### Media Storage Architecture

**Cloudflare Integration:**
- **R2**: Object storage for photos and general files
- **Stream**: Optimized video streaming with adaptive bitrate
- **CDN**: Global edge network for fast content delivery

**Video Processing Pipeline:**
1. User selects video → `videoService.ts` compresses based on resolution
2. `videoAnalysisService.ts` analyzes content for intelligent compression
3. `fileUploadService.ts` uploads to Cloudflare Stream with progress tracking
4. Cloudflare generates thumbnail and adaptive streams
5. Video URL stored in `magic_tricks.effect_video_url` or `secret_video_url`

**Upload Progress:**
```typescript
await fileUploadService.uploadVideo(
  localUri,
  userId,
  (progress, fileName) => {
    console.log(`${fileName}: ${progress}%`);
  }
);
```

### AI Assistant (Mmento AI)

**Tables:**
- `ai_conversations` - Chat threads
- `ai_messages` - Individual messages (user + assistant)
- `ai_folders` - Organization folders
- `ai_usage_tracking` - Token consumption tracking

**Architecture:**
- OpenAI GPT-4 via `services/openAIService.ts`
- Context-aware conversations with message history
- Token usage tracking for billing
- Folder organization for conversation management

### Social Features

**Content Sharing:**
- `shared_content` - Public tricks shared by users
- Users can mark tricks as `is_public = true`
- Shared tricks appear in community feed

**Messaging:**
- `messages` - Direct messages between users
- `chat_groups` - Group conversations
- `group_members` - Many-to-many user ↔ group relationship

**Moderation:**
- `reports` - User-submitted content reports
- `bans` - Banned users tracking
- `roles` - Permission system (admin, moderator, user)

### Performance Optimizations

**Implemented:**
- ✅ In-memory cache for instant data access
- ✅ AsyncStorage for offline persistence
- ✅ Full-Text Search with GIN indexes
- ✅ JSONB indexes for array queries
- ✅ Composite indexes for common queries
- ✅ Hybrid search (client/server based on data size)
- ✅ Video compression before upload
- ✅ Cloudflare CDN for global content delivery
- ✅ FlashList instead of FlatList for large lists
- ✅ Real-time subscriptions for instant updates

**Monitoring:**
- Index usage stats in `SUPABASE_DATABASE_SNAPSHOT.md` (Section 3.4)
- Query performance via `EXPLAIN ANALYZE` in SQL docs
- Unused indexes tracked in Section 3.5


## Application Structure & Implementation Status

### Routing Architecture (expo-router File-Based)

**Auth Flow:**
- `app/index.tsx` - Landing screen with data preload
- `app/auth/login.tsx` - Login with Apple SignIn integration
- `app/auth/register.tsx` - User registration
- `app/auth/password-recover.tsx` - Password recovery

**Main App (Tab Navigation):**
- `app/(app)/_layout.tsx` - Root layout with contexts (Library, Search, TrickDeletion, OfflineSync)
- **Home Tab** (`app/(app)/home/index.tsx`):
  - Library with categories
  - Search and filters
  - CollapsibleCategories with FlashList optimization
- **Add Magic Tab** (`app/(app)/add-magic/index.tsx`):
  - 3-step wizard (Title/Category → Effect/Video → Secret/Extras)
  - Media upload with progress tracking
  - Validation at each step
- **MMENTO AI Tab** (`app/(app)/mmento-ai/index.tsx`):
  - Chat with OpenAI GPT-4
  - Conversation history
  - Audio recorder (prepared for voice input)
  - Usage limits (free: 2/day, plus: unlimited)

**Other Routes:**
- `app/(app)/edit-trick/index.tsx` - Edit wizard (same structure as add)
- `app/(app)/trick/[id].tsx` - Detailed trick view with tabs
- `app/(app)/profile/index.tsx` - User profile and stats
- `app/(app)/profile-options/index.tsx` - Profile settings
- `app/(app)/tags/index.tsx` - Tag management (CRUD)
- `app/(app)/plans/index.tsx` - Subscription plans

**Coming Soon Screens:**
- `app/(app)/settings/index.tsx` - App settings
- `app/(app)/reminders/index.tsx` - Reminder system
- `app/(app)/notifications/index.tsx` - Notifications
- `app/(app)/videos/index.tsx` - Video gallery

### Component Architecture

**Core Components (80+ total):**

#### Home Section (7 components)
- `UserProfile.tsx` - User info card with greeting
- `CompactSearchBar.tsx` - Search bar with filter button
- `LibrariesSection.tsx` - Main list container (FlashList optimized)
- `CollapsibleCategoryOptimized.tsx` - Expandable category with tricks
- `TrickCompletionProgress.tsx` - Progress indicator for trick completeness
- `DraggableTrick.tsx` - Drag & drop support for tricks
- `CustomRefreshControl.tsx` - Pull-to-refresh with custom styling

#### Trick Viewer (6 components)
- `TrickViewScreen.tsx` - Main viewer (400+ lines - needs refactor)
- `TopNavigationBar.tsx` - Header with back/favorite/share
- `TrickViewerBottomSection.tsx` - Tab switcher (Effect, Secret, Stats)
- `StageInfoSection.tsx` - Effect/Secret content display
- `StatsPanel.tsx` - Statistics and metadata
- `videoProgressBar.tsx` - Video playback controls

#### Add/Edit Wizard (5 components)
- `AddMagicWizard.tsx` - Create wizard (600+ lines)
- `EditMagicWizard.tsx` - Edit wizard (similar to add)
- `TitleCategoryStep.tsx` - Step 0: Title, Category, Tags
- `EffectStep.tsx` - Step 1: Effect description, video, angles
- `ExtrasStep.tsx` - Step 2: Secret, video, materials, notes

#### UI Components (32 components)
**Modals:**
- DeleteModal, MakePublicModal, TrickActionsModal
- CategoryActionsModal, TagActionsModal
- FilterModal, SortModal
- TimePickerModal, DifficultySlider
- UploadProgressModal, LargeFileWarningModal

**Inputs & Selectors:**
- TextField, TextDirect, CharacterCounter
- CategorySelector, TagSelector, MediaSelector
- ColorPicker, Tooltip

**Visual:**
- FavoriteButton, MagicLoader, OfflineIndicator
- MediaSourceModal, MediaPreview

**Drag & Drop (prepared for future):**
- DragPortal, DragOverlay, DragArea
- DraggableItem, DraggableTrick, DragDropIndicator

#### MMENTO AI (4 components)
- `AudioRecorder.tsx` - Voice input (prepared, not fully integrated)
- `MessageBubble.tsx` - Chat message display
- `ConversationList.tsx` - Chat history
- `ChatInput.tsx` - Text input with send button

### Service Layer (16 services)

**Data Services:**
- `LocalDataService.ts` - Cache layer (AsyncStorage + in-memory)
  - Methods: getUserData(), updateTrick(), toggleFavorite(), addCategory()
  - Tracks _pendingSync, _isLocalOnly flags for offline support
- `SupabaseDataService.ts` - Database CRUD
  - Methods: fetchAllUserData(), createCategory(), updateCategory(), deleteCategory()
- `trickService.ts` - Business logic
  - Methods: getCompleteTrick(), updateIsPublic()

**Search & Sync:**
- `HybridSearchService.ts` - Intelligent search (client <500, server ≥500)
  - Uses Full-Text Search with GIN indexes for large datasets
- `NetworkMonitorService.ts` - Connectivity monitor
  - Methods: initialize(), isOnline(), subscribe(), waitForConnection()
- `lib/offlineQueue.ts` - Offline operation queue
  - Operations: create_trick, update_trick, delete_trick, toggle_favorite
  - Retry logic: 3 attempts with exponential backoff

**Media Services:**
- `fileUploadService.ts` - Media upload orchestrator
  - Supports Cloudflare R2, Stream, and Images
  - Progress tracking callbacks
- `videoService.ts` - Video compression
  - Method: compressVideo() with configurable quality
- `videoAnalysisService.ts` - Intelligent compression analysis
  - Method: analyzeVideo() - decides if compression needed
- `cloudflare/CloudflareStreamService.ts` - Video streaming upload (TUS protocol)
- `cloudflare/CloudflareImagesService.ts` - Image optimization upload
- `cloudflare/CloudflareStorageService.ts` - R2 object storage
- `audioService.ts` - Audio processing (for voice input)

**AI & Chat:**
- `chatService.ts` - Conversation management
  - Methods: checkUserLimit(), getConversations(), sendMessage()
- `openAIService.ts` - OpenAI GPT-4 integration
  - Method: chat() with streaming support

**Other:**
- `authService.ts` - Authentication helpers
- `orderService.ts` - Purchase/order management

### Context Providers (4 contexts)

**LibraryDataContext** (`context/LibraryDataContext.tsx`):
- **State:** sections, allCategories, loading, initializing, error, userName, avatarUrl
- **Methods:** refresh(), toggleFavorite(), createCategory(), updateCategory(), deleteCategory(), applyFilters()
- **Real-time subscriptions:** magic_tricks, user_categories, trick_categories, user_favorites
- **Optimization:** buildSections() combines all filters in single pass

**SearchContext** (`context/SearchContext.tsx`):
- **State:** searchQuery, debouncedSearchQuery (300ms), searchFilters
- **Filters:** categories, tags (AND/OR mode), difficulties, durations, resetTimes, angles, isPublic, sortOrder

**TrickDeletionContext** (`context/TrickDeletionContext.tsx`):
- **State:** deletedTrickId (temporary notification)
- **Purpose:** Notify components of trick deletion for cleanup

**OfflineSyncContext** (`context/OfflineSyncContext.tsx`):
- **State:** isOnline, isSyncing, pendingOperations, lastSyncTime, syncError
- **Methods:** syncNow(), getPendingOperations(), clearSyncError()
- **Triggers:** Network reconnection, app foreground, manual sync

### Implemented Features ✅

**CRUD Operations:**
- ✅ Create tricks with 3-step wizard
- ✅ Read tricks with categories and search
- ✅ Update tricks with same wizard UI
- ✅ Delete tricks with confirmation modal
- ✅ Optimistic updates with offline support

**Categories & Organization:**
- ✅ Create/Edit/Delete custom categories
- ✅ Virtual "Favorites" category (ID: favorites-virtual)
- ✅ Assign trick to category during creation
- ✅ Multi-category support per trick (junction table)
- ✅ Empty categories always visible

**Search & Filtering:**
- ✅ Full-Text Search (FTS) with GIN index
- ✅ Hybrid search (client <500 tricks, server ≥500)
- ✅ Multi-language support (Spanish, English via 'simple' config)
- ✅ Debounced search (300ms)
- ✅ Filter by: categories, tags (AND/OR), difficulty, duration, reset time, angles, visibility
- ✅ Sort: recent, last modified

**Media Management:**
- ✅ Photo upload with Cloudflare Images
- ✅ Video upload with Cloudflare Stream
- ✅ Multiple photos per trick (trick_photos table)
- ✅ Intelligent video analysis (decides compression)
- ✅ Automatic compression for large videos
- ✅ Progress tracking during upload
- ✅ Warning for large files (>100MB)
- ✅ Permissions handling (camera, media library)

**Offline Mode:**
- ✅ Full offline support with queue system
- ✅ Network monitoring (NetInfo)
- ✅ Operation queue with retry (max 3 attempts)
- ✅ Automatic sync on reconnection
- ✅ Visual indicator (OfflineIndicator component)
- ✅ Local cache (AsyncStorage + in-memory)
- ✅ Optimistic UI updates

**AI Assistant (MMENTO AI):**
- ✅ Chat with OpenAI GPT-4
- ✅ Context-aware (user's trick library)
- ✅ Conversation history
- ✅ Usage limits (free: 2/day, plus: unlimited)
- ✅ Token tracking (ai_usage_tracking table)
- ✅ Security: Encrypted prompts
- ✅ Conversation folders (prepared for MVP 2.0)
- ⚠️ Audio input (component ready, not fully integrated)

**User Management:**
- ✅ Authentication with Supabase Auth
- ✅ Apple SignIn integration
- ✅ Profile management
- ✅ Subscription tiers (free, plus, developer)
- ✅ Profile picture upload

**Internationalization:**
- ✅ i18next with English and Spanish
- ✅ Auto-detection of device language
- ✅ Fallback to English if translation missing

**Performance Optimizations:**
- ✅ In-memory cache for instant access
- ✅ AsyncStorage for persistence
- ✅ FlashList instead of FlatList
- ✅ Real-time subscriptions with debounce
- ✅ Video compression before upload
- ✅ Cloudflare CDN for media delivery
- ✅ Optimized base64 encoding (utils/optimizedBase64.ts)

### Incomplete Features & TODOs ⚠️

**High Priority:**
- ⚠️ Make trick public/private (UI exists, needs backend integration)
- ⚠️ Report content system (button exists, no implementation)
- ⚠️ Stripe payment integration for subscription plans
- ⚠️ External links in profile options (not opening)

**Medium Priority:**
- ⚠️ Settings screen (coming soon)
- ⚠️ Reminders system (coming soon)
- ⚠️ Notifications (coming soon)
- ⚠️ Video gallery (coming soon)

**Low Priority / Future:**
- ⚠️ Audio recorder full integration in AI
- ⚠️ Migrate to expo-video-metadata (SDK 54+)
- ⚠️ Trick versioning (parent_trick_id field exists)
- ⚠️ Advanced drag & drop (components prepared)

**Code-Level TODOs:**
```
TrickActionsModal.tsx:104 - Descomentar make public/private (MVP 2.0)
TrickActionsModal.tsx:161 - Implementar funcionalidad de report
PlansScreen.tsx:100 - Implementar lógica de cambio de plan con Stripe
ProfileOptionsScreen.tsx:77 - Implementar apertura de links externos
VideoService.ts:201 - Migrar a expo-video-metadata (SDK 54+)
```

### Areas for Improvement 🔧

**Code Structure:**
- **Large Components:**
  - TrickViewScreen.tsx (400+ lines) - Split into sub-components
  - AddMagicWizard.tsx (600+ lines) - Extract upload logic
  - EditMagicWizard.tsx - Duplicates AddMagicWizard, needs refactor
  - LibrariesSection.tsx - Complex state management

- **Code Duplication:**
  - Wizard steps used in both Add and Edit
  - Modal styles repeated across components
  - CategoryActionsModal & TagActionsModal have similar logic

**Performance:**
- buildSections() in LibraryDataContext runs frequently (consider more aggressive memoization)
- TrickViewScreen could benefit from lazy loading of tabs
- Media compression is synchronous (native, but UI could show better feedback)

**Testing:**
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests
- **Recommendation:** Add Jest for unit tests, Detox for E2E

**Security:**
- SecurityManager exists but limited usage
- Consider encrypting sensitive data in local cache
- Implement key rotation for API keys

**Accessibility:**
- Some components lack a11y labels
- Focus management in modals needs improvement
- Color contrast verification (WCAG compliance)

**Documentation:**
- Missing JSDoc comments in many functions
- Some complex logic lacks inline comments

### Key Files Reference

**Core Contexts:**
- `context/LibraryDataContext.tsx` (450+ lines)
- `context/OfflineSyncContext.tsx` (200+ lines)

**Core Services:**
- `services/LocalDataService.ts` (600+ lines)
- `services/SupabaseDataService.ts` (400+ lines)
- `services/fileUploadService.ts` (300+ lines)

**Main Routes:**
- `app/(app)/_layout.tsx` - Root layout with providers
- `app/(app)/home/index.tsx` - Main library screen
- `app/(app)/trick/[id].tsx` - Trick viewer

**Wizards:**
- `components/add-magic/AddMagicWizard.tsx` (600+ lines)
- `components/edit-magic/EditMagicWizard.tsx` (similar)

**Type Definitions:**
- `types/magicTrick.ts` - MagicTrick, LocalTrick, MagicTrickDBRecord
- `types/categoryService.ts` - Category types

### Codebase Statistics

| Category | Count | Est. Lines |
|----------|-------|-----------|
| Routes (app/) | 16 | ~1,200 |
| Components | 80+ | ~12,000 |
| Services | 16 | ~4,000 |
| Contexts | 4 | ~1,500 |
| Hooks | 10 | ~2,000 |
| Utils | 15 | ~2,500 |
| Types | 3 | ~300 |
| **Total** | **~144 files** | **~23,500 lines** |

### Development Workflow

**Adding a New Feature:**
1. Define types in `types/` if needed
2. Create service in `services/` for business logic
3. Add context in `context/` if global state needed
4. Create component in `components/`
5. Add route in `app/` if new screen
6. Update CLAUDE.md with feature documentation

**Testing Flow (when implemented):**
1. Unit tests for services and utils
2. Integration tests for contexts
3. E2E tests for critical user flows

**Performance Monitoring:**
- Check index usage in database snapshot
- Monitor FlashList performance
- Track upload times and compression ratios
- Measure search response times

### Recommendations for Next Steps

**MVP 2.0 Priorities:**
1. ✅ Complete payment integration (Stripe)
2. ✅ Implement make public/private functionality
3. ✅ Add notification system
4. ✅ Complete settings screen
5. ✅ Implement reminders
6. ✅ Add social features (share, like, comment)

**Technical Debt:**
1. Refactor large components (TrickViewScreen, Wizards)
2. Add comprehensive test suite
3. Improve error handling across services
4. Add JSDoc documentation
5. Implement proper logging system

**Performance Targets:**
- Home load: <500ms (with cache)
- Trick view: <300ms
- Search: <100ms (debounced)
- Upload: <30s for average video (with compression)
- Sync: <5s for small operations

# CLAUDE.md

This file provides critical guidance to Claude Code when working with this repository.

## Project Overview

**mmento** is a React Native mobile app (Expo SDK 53) for magicians to manage tricks with multimedia, categories, and offline-first architecture.

**Core Flow:**
1. User authenticates → Supabase Auth
2. Data loads → LocalDataService (cache) + SupabaseDataService (network) via LibraryDataContext
3. User creates/edits tricks → 3-step wizard with media upload
4. Search → HybridSearchService (client <500 tricks, server FTS ≥500)
5. Offline → Operations queue → sync on reconnect

**Key Architecture:**
- **Offline-first**: Local cache (AsyncStorage + memory) with optimistic updates
- **Context-based state**: LibraryDataContext, SearchContext, OfflineSyncContext
- **Service layer**: 16 services (data, media, AI, auth, networking)
- **Database**: Supabase PostgreSQL (30+ tables) with FTS, RLS, real-time

📖 **Full Documentation:** See `docs/APP_ARCHITECTURE_DETAILED.md` (6000+ lines, 50+ sections)

## When Things Fail ⚠️

**If you encounter errors 2-3 times on the same task:**

1. **Check package.json dependencies** and identify relevant libraries
2. **Search official documentation**:
   - `expo-*` → docs.expo.dev (we use **Expo SDK 53**)
   - `react-native-*` → React Native docs
   - `@supabase/*` → Supabase docs
   - Native modules → May not work in Expo Go (need dev client)
3. **Investigate alternatives** if current approach isn't working
4. **Check compatibility issues** between dependencies

**Common Issues:**
- Video compression failing → Check `react-native-compressor` docs, verify dev client
- Supabase queries failing → Check Supabase JS SDK docs
- Expo modules not found → Verify SDK 53 compatibility

## Quick Reference

| Task | Where to Look |
|------|---------------|
| Add new screen | `app/` (expo-router auto-routing) |
| Fix authentication | `services/authService.ts`, `utils/auth.ts` |
| Modify data fetch | `services/SupabaseDataService.ts`, `services/LocalDataService.ts` |
| Change search logic | `services/HybridSearchService.ts`, `context/LibraryDataContext.tsx` |
| Upload media | `services/fileUploadService.ts`, `services/videoService.ts` |
| Update offline sync | `context/OfflineSyncContext.tsx`, `lib/offlineQueue.ts` |
| Fix UI component | `components/` (organized by feature) |
| Add database table | Supabase dashboard → Enable RLS → Update types in `types/` |
| Modify AI chat | `services/openAIService.ts`, `services/chatService.ts` |
| Update cache | `services/LocalDataService.ts` (memory + AsyncStorage) |

**Key Contexts:**
- **LibraryDataContext**: Trick/category CRUD, favorites, filters, search
- **SearchContext**: Search query state and filters
- **OfflineSyncContext**: Online status, pending operations, manual sync
- **TrickDeletionContext**: Notify components of trick deletion

## Critical Pitfalls 🚨

### 1. Expo Go vs Dev Client
- `react-native-compressor` **DOES NOT work in Expo Go**
- Must use: `npm run build:dev:android` or `npm run build:dev:ios`
- Fallback: `videoService.ts` returns uncompressed video in Expo Go

### 2. Row Level Security (RLS)
- ALL new tables MUST have RLS enabled with `auth.uid() = user_id` policy
- Forgetting RLS = users can see all data (security breach)

### 3. Cache Invalidation
- LocalDataService updates memory immediately BUT AsyncStorage is async
- Check `_pendingSync` flag for offline changes
- Real-time subscriptions trigger cache refresh

### 4. Offline Queue
- Operations fail after 3 retries and are marked `failed`
- Large media uploads NOT queued (require online)

### 5. Full-Text Search
- FTS triggers at ≥500 tricks (HybridSearchService threshold)
- Uses `'simple'` language config (multi-language)
- `search_vector` column auto-updates via trigger

### 6. Context Provider Order
- OfflineSyncProvider MUST wrap LibraryDataContext
- Order in `app/(app)/_layout.tsx`: OfflineSync → Library → Search → TrickDeletion

## Environment Variables

**Required:**
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

**Optional:**
- `OPENAI_API_KEY` - AI chat (degrades gracefully)
- `CLOUDFLARE_ACCOUNT_ID` - Video streaming (falls back to Supabase)
- `CLOUDFLARE_API_TOKEN` - Cloudflare uploads

**Setup:** Copy `.env.example` to `.env` → Fill credentials → `npm start`

## Code Conventions

**File Naming:**
- Components: `PascalCase.tsx` (`TrickViewScreen.tsx`)
- Services: `camelCase.ts` (`trickService.ts`)
- Contexts: `PascalCase.tsx` (`LibraryDataContext.tsx`)

**Import Order:**
```typescript
// 1. React/React Native
// 2. Third-party libraries
// 3. Services
// 4. Contexts
// 5. Components
// 6. Types
// 7. Utils
```

**Component Structure:**
```typescript
// 1. Props interface
// 2. Component
// 3. Hooks
// 4. State
// 5. Effects
// 6. Handlers
// 7. Render
```

## Service Usage Guidelines

### Decision Tree

**Fetching Data:**
```typescript
// ✅ DO: Use LibraryDataContext (cached)
const { sections, allCategories } = useLibraryData();

// ❌ DON'T: Call SupabaseDataService directly (bypasses cache)
```

**Creating/Updating Tricks:**
```typescript
// ✅ DO: Use trickService.ts (orchestrates cache + network)
await trickService.createTrick(trickData, userId);

// ❌ DON'T: Call Supabase directly (skips cache, offline queue)
```

**Uploading Media:**
```typescript
// ✅ DO: Use fileUploadService (compression + progress + Cloudflare)
await fileUploadService.uploadVideo(uri, userId, progressCallback);

// ❌ DON'T: Use Supabase storage directly (no optimization)
```

**Offline Operations:**
```typescript
// ✅ DO: Update cache first, then queue if offline
localDataService.updateTrick(userId, trickId, data, !networkMonitor.isOnline());
if (!networkMonitor.isOnline()) {
  await offlineQueue.enqueue({ type: 'update_trick', payload: {...} });
}
```

**Service Responsibilities:**
| Service | Purpose |
|---------|---------|
| `LocalDataService` | Cache layer (AsyncStorage + memory) |
| `SupabaseDataService` | Database CRUD operations |
| `trickService` | Business logic (orchestrates above) |
| `HybridSearchService` | Client (<500) / Server (≥500) search |
| `fileUploadService` | Media upload (compression + Cloudflare) |
| `authService` | Authentication |
| `openAIService` | GPT-4 chat |

## Technology Stack

- **Framework**: React Native 0.79.4 + Expo SDK 53
- **Router**: expo-router (file-based)
- **Backend**: Supabase (auth, database, storage)
- **Styling**: NativeWind (TailwindCSS)
- **Language**: TypeScript (strict mode)
- **State**: React Context
- **Storage**: AsyncStorage + in-memory cache
- **Media**: expo-camera, expo-image-picker, expo-video, react-native-compressor
- **AI**: OpenAI API (GPT-4)

## Essential Commands

```bash
# Development
npm start                    # Start dev server
npm run android             # Android device/emulator
npm run ios                 # iOS device/simulator

# Building (Dev Client)
npm run build:dev:android   # Android dev client (EAS)
npm run build:dev:ios       # iOS dev client (EAS)
```

## Database Reference

**See detailed docs:**
- `docs/SUPABASE_DATABASE_SNAPSHOT.md` - Complete schema (30+ tables)
- `docs/DATABASE_ANALYSIS.md` - Analysis and recommendations

**Key Tables:**
- `magic_tricks` - Main tricks (28 columns, `search_vector` for FTS)
- `user_categories` - Custom categories
- `trick_categories` - Junction (tricks ↔ categories)
- `user_favorites` - Favorited content
- `profiles` - User profiles + subscriptions

**Key Indexes:**
- `idx_magic_tricks_search_vector` (GIN) - Full-Text Search
- `idx_magic_tricks_user_created` (BTREE) - User queries + date sort
- `idx_magic_tricks_angles` (GIN) - JSONB array queries

**RLS Policy Pattern:** All tables use `auth.uid() = user_id`

## Architecture Patterns

### Data Flow
1. **Read**: Cache first (LocalDataService) → Network if miss (SupabaseDataService)
2. **Write**: Update cache immediately → Network if online → Queue if offline
3. **Sync**: Real-time subscriptions invalidate cache → Offline queue processes on reconnect

### Search Flow
1. User types → SearchContext (debounced 300ms)
2. LibraryDataContext detects change
3. HybridSearchService checks trick count:
   - < 500: Client-side JS filter
   - ≥ 500: Server-side FTS with GIN index
4. Results displayed in LibrariesSection

### Media Upload Flow
1. User selects media → Permissions check
2. videoAnalysisService analyzes (compression needed?)
3. videoService compresses if needed
4. fileUploadService uploads:
   - Photos → Cloudflare Images
   - Videos → Cloudflare Stream (TUS protocol)
   - Fallback → Supabase Storage
5. Progress callbacks update UI

### Offline Flow
1. Operation attempted → Network check
2. If offline:
   - Update LocalDataService cache immediately
   - Enqueue in OfflineQueue
   - Show OfflineIndicator
3. On reconnect:
   - OfflineSyncContext triggers sync
   - Process queue (3 retry attempts)
   - Update cache from server

## File Structure

```
app/                         # expo-router screens
├── index.tsx                # Landing/auth check
├── auth/                    # Login, register, password recovery
└── (app)/                   # Main app (tab navigation)
    ├── home/                # Library with categories
    ├── add-magic/           # 3-step wizard
    ├── edit-trick/          # Edit wizard
    ├── trick/[id].tsx       # Trick viewer
    ├── profile/             # User profile
    └── mmento-ai/          # AI assistant

components/                  # 80+ components
├── home/                    # UserProfile, CompactSearchBar, LibrariesSection
├── add-magic/               # AddMagicWizard, wizard steps
├── edit-magic/              # EditMagicWizard
├── trick-viewer/            # TrickViewScreen, TopNavigationBar
└── ui/                      # Modals, inputs, selectors

services/                    # 16 services
├── LocalDataService.ts      # Cache layer
├── SupabaseDataService.ts   # Database CRUD
├── trickService.ts          # Business logic
├── HybridSearchService.ts   # Search
├── fileUploadService.ts     # Media upload
├── NetworkMonitorService.ts # Connectivity
├── authService.ts           # Authentication
└── cloudflare/              # Cloudflare services

context/                     # 4 contexts
├── LibraryDataContext.tsx   # Main data state
├── SearchContext.tsx        # Search state
├── OfflineSyncContext.tsx   # Offline/sync state
└── TrickDeletionContext.tsx # Deletion notifications

types/                       # Type definitions
├── magicTrick.ts            # MagicTrick, LocalTrick, MagicTrickDBRecord
└── categoryService.ts       # Category types
```

## Known TODOs

**High Priority:**
- Make trick public/private (UI exists, needs backend)
- Report content system (button exists, no implementation)
- Stripe payment integration
- External links in profile (not opening)

**Components Needing Refactor:**
- `TrickViewScreen.tsx` (400+ lines)
- `AddMagicWizard.tsx` (600+ lines)
- `EditMagicWizard.tsx` (duplicates Add)

## Performance Notes

- In-memory cache for instant access
- FlashList for large lists
- Video compression before upload
- FTS with GIN indexes (≥500 tricks)
- Real-time subscriptions with debounce
- Cloudflare CDN for media

**Targets:**
- Home load: <500ms (with cache)
- Search: <100ms (debounced)
- Sync: <5s for small operations

## Additional Documentation

- 📖 `docs/APP_ARCHITECTURE_DETAILED.md` - Complete architecture (6000+ lines)
- 📊 `docs/SUPABASE_DATABASE_SNAPSHOT.md` - Database schema + data
- 🔍 `docs/DATABASE_ANALYSIS.md` - Performance analysis
- 🛠️ `docs/DEVELOPER_GUIDE.md` - Implementation details (see this for component details)

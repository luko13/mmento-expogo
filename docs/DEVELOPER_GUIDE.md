# Developer Guide

Complete implementation details for the mmento React Native application.

**For quick start:** See `CLAUDE.md` in the root directory.
**For architecture:** See `APP_ARCHITECTURE_DETAILED.md` in this folder.
**For database:** See `SUPABASE_DATABASE_SNAPSHOT.md` in this folder.

---

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Context Providers](#context-providers)
3. [Service Layer](#service-layer)
4. [Implemented Features](#implemented-features)
5. [Incomplete Features](#incomplete-features)
6. [Areas for Improvement](#areas-for-improvement)
7. [Development Workflow](#development-workflow)
8. [Offline-First Implementation](#offline-first-implementation)

---

## Component Architecture

### Core Components (80+ total)

#### Home Section (7 components)

**`UserProfile.tsx`** - User info card with greeting
- Displays user avatar, name, subscription tier
- Shows personalized greeting based on time of day
- Taps to navigate to profile screen

**`CompactSearchBar.tsx`** - Search bar with filter button
- Debounced search input (300ms)
- Filter button opens FilterModal
- Clear button to reset search

**`LibrariesSection.tsx`** - Main list container (FlashList optimized)
- Renders categories with tricks using FlashList for performance
- Pull-to-refresh functionality
- Empty state handling

**`CollapsibleCategoryOptimized.tsx`** - Expandable category with tricks
- Animated expand/collapse transitions
- Shows trick count
- Long-press for category actions (edit, delete)
- Horizontal scroll for tricks
- Empty category placeholder

**`TrickCompletionProgress.tsx`** - Progress indicator for trick completeness
- Circular progress bar showing % complete
- Checks: title, effect, secret, photos, videos
- Color-coded: red (<50%), yellow (50-80%), green (>80%)

**`DraggableTrick.tsx`** - Drag & drop support for tricks
- Prepared for future drag & drop reordering
- Currently used for swipe actions
- Long-press to initiate drag

**`CustomRefreshControl.tsx`** - Pull-to-refresh with custom styling
- Custom colors matching app theme
- Loading indicator
- Triggers data refresh from LibraryDataContext

---

#### Trick Viewer (6 components)

**`TrickViewScreen.tsx`** - Main viewer (⚠️ 400+ lines - needs refactor)
- Displays complete trick details
- Tab switcher: Effect, Secret, Stats
- Video playback for effect/secret videos
- Photo gallery
- Favorite toggle
- Share functionality
- Edit/Delete actions

**Current issues:**
- Too many responsibilities (needs split into sub-components)
- Complex state management
- Video player logic mixed with UI logic

**`TopNavigationBar.tsx`** - Header with back/favorite/share
- Back button
- Trick title
- Favorite toggle (animated heart)
- Share button (opens native share sheet)
- Three-dot menu for actions (edit, delete, make public)

**`TrickViewerBottomSection.tsx`** - Tab switcher (Effect, Secret, Stats)
- Animated tab transitions
- Swipe gesture support (future)
- Active tab indicator

**`StageInfoSection.tsx`** - Effect/Secret content display
- Displays description text
- Video player with controls
- Photo gallery with lightbox
- Angles indicator
- Materials list
- Notes section

**`StatsPanel.tsx`** - Statistics and metadata
- Difficulty rating (1-5 stars)
- Duration (prep time)
- Reset time
- Angles (front, sides, back, surrounded)
- Created/Modified timestamps
- Category tags
- Gimmicks/Techniques used

**`videoProgressBar.tsx`** - Video playback controls
- Play/Pause button
- Seek bar
- Current time / Total duration
- Fullscreen toggle
- Volume control

---

#### Add/Edit Wizard (5 components)

**`AddMagicWizard.tsx`** - Create wizard (⚠️ 600+ lines - needs refactor)
- 3-step wizard: Title/Category → Effect/Video → Secret/Extras
- Progress indicator (0/3, 1/3, 2/3, 3/3)
- Form validation at each step
- Media upload with progress tracking
- Cancel confirmation modal
- Auto-save draft (future)

**Current issues:**
- Too large (should extract upload logic to separate service/component)
- Form state management complex
- Media handling mixed with UI logic

**`EditMagicWizard.tsx`** - Edit wizard (⚠️ duplicates AddMagicWizard)
- Same structure as AddMagicWizard
- Pre-fills existing trick data
- Allows partial updates (doesn't require all fields)

**Refactor opportunity:** Extract shared logic to `useTrickWizard` hook

**`TitleCategoryStep.tsx`** - Step 0: Title, Category, Tags
- TextField for trick title (required, min 3 chars)
- CategorySelector (single or multiple categories)
- TagSelector (custom tags or predefined)
- Character counter for title (max 100 chars)

**`EffectStep.tsx`** - Step 1: Effect description, video, angles
- TextArea for effect description (min 10 chars)
- MediaSelector for effect video (optional)
- AngleSelector (front, sides, back, surrounded)
- Video upload with progress modal
- Video thumbnail generation

**`ExtrasStep.tsx`** - Step 2: Secret, video, materials, notes
- TextArea for secret description (min 10 chars)
- MediaSelector for secret video (optional)
- TextField for materials (comma-separated)
- TextArea for notes (optional)
- DifficultySlider (1-5)
- TimePickerModal for duration and reset time

---

#### UI Components (32 components)

##### Modals

**`DeleteModal.tsx`** - Confirm trick deletion
- Warning message
- Confirm/Cancel buttons
- Red theme for danger action

**`MakePublicModal.tsx`** - Confirm making trick public
- ⚠️ Feature incomplete (MVP 2.0)
- Explains what "public" means (visible to community)
- Privacy warning

**`TrickActionsModal.tsx`** - Trick actions menu
- Edit trick
- Delete trick
- Make public/private (commented out for MVP 2.0)
- Share trick
- Report trick (not implemented)

**`CategoryActionsModal.tsx`** - Category actions menu
- Edit category (name, color)
- Delete category (confirms if has tricks)
- Cancel

**`TagActionsModal.tsx`** - Tag actions menu
- Edit tag (name)
- Delete tag (confirms if used by tricks)
- Cancel

**`FilterModal.tsx`** - Advanced search filters
- Category filter (multi-select)
- Tag filter (AND/OR mode)
- Difficulty range (slider)
- Duration range (min/max pickers)
- Reset time range
- Angles filter
- Public/Private filter
- Clear all filters button

**`SortModal.tsx`** - Sort options
- Recent (created_at DESC)
- Last modified (updated_at DESC)
- A-Z (title ASC)
- Difficulty (difficulty ASC)

**`TimePickerModal.tsx`** - Time picker for duration/reset
- Hours/Minutes/Seconds pickers
- Formatted display (e.g., "5m 30s")
- Confirm/Cancel buttons

**`DifficultySlider.tsx`** - Difficulty selector (1-5)
- Visual slider with star icons
- Labels: Beginner, Easy, Intermediate, Advanced, Expert
- Haptic feedback on change

**`UploadProgressModal.tsx`** - Media upload progress
- File name
- Progress bar (0-100%)
- Cancel upload button
- Shows compression phase vs upload phase

**`LargeFileWarningModal.tsx`** - Warns about large files
- Triggered for files >100MB
- Explains upload may take time
- Suggests compression
- Continue/Cancel buttons

##### Inputs & Selectors

**`TextField.tsx`** - Text input with label
- Label above input
- Character counter (optional)
- Error message display
- Required indicator (*)
- Custom styling for different themes

**`TextDirect.tsx`** - Lightweight text input
- No label or wrapper
- Used for inline editing
- Auto-focus support

**`CharacterCounter.tsx`** - Character count display
- Shows current/max characters
- Color changes when approaching limit (yellow at 90%, red at 100%)
- Used in TextField and TextArea components

**`CategorySelector.tsx`** - Category picker
- Horizontal scrollable chips
- Add new category button
- Multi-select support
- Color-coded categories
- Empty state (create first category)

**`TagSelector.tsx`** - Tag picker
- Similar to CategorySelector
- Shows predefined tags + custom tags
- Create new tag inline
- Tag autocomplete (future)

**`MediaSelector.tsx`** - Photo/Video picker
- Camera button (opens camera)
- Gallery button (opens photo library)
- Permission handling (camera, photos)
- File type filtering (images, videos)
- Multiple selection for photos

**`ColorPicker.tsx`** - Color selector for categories
- Predefined color palette (10 colors)
- Active color indicator
- Custom color picker (future)

**`Tooltip.tsx`** - Info tooltip
- Info icon (ⓘ)
- Shows on tap
- Dismisses after 3 seconds or on tap outside
- Used for explaining fields in forms

##### Visual Components

**`FavoriteButton.tsx`** - Animated favorite toggle
- Heart icon (outline when not favorited, filled when favorited)
- Scale animation on tap
- Haptic feedback
- Updates LibraryDataContext

**`MagicLoader.tsx`** - Loading spinner
- Custom animated magic wand icon
- Used throughout app for loading states
- Color matches app theme

**`OfflineIndicator.tsx`** - Offline status banner
- Shows at top of screen when offline
- Displays pending operations count
- Tap to manually trigger sync
- Auto-hides when online

**`MediaSourceModal.tsx`** - Choose media source
- Camera option
- Photo Library option
- Cancel button
- Permission status display

**`MediaPreview.tsx`** - Media preview component
- Shows photo or video thumbnail
- Play button overlay for videos
- Delete button (X) to remove
- Full-screen view on tap

##### Drag & Drop (prepared for future)

**`DragPortal.tsx`** - Portal for drag overlay
- Renders dragged item above all content
- Future: reordering tricks, categories

**`DragOverlay.tsx`** - Visual feedback during drag
- Shows semi-transparent preview of dragged item
- Future feature

**`DragArea.tsx`** - Drop zone for dragged items
- Highlights on drag over
- Future feature

**`DraggableItem.tsx`** - Generic draggable item wrapper
- Long-press to initiate drag
- Future feature

**`DragDropIndicator.tsx`** - Visual indicator for drop location
- Line showing where item will drop
- Future feature

---

#### MMENTO AI (4 components)

**`AudioRecorder.tsx`** - Voice input (⚠️ prepared, not fully integrated)
- Record button with animated waveform
- Recording duration display
- Playback preview
- Send recorded audio to OpenAI Whisper (future)
- Permission handling (microphone)

**`MessageBubble.tsx`** - Chat message display
- User messages (right-aligned, green)
- Assistant messages (left-aligned, gray)
- Timestamp
- Markdown rendering for code blocks, bold, italic
- Copy message button

**`ConversationList.tsx`** - Chat history
- List of conversations
- Shows last message preview
- Conversation date
- Swipe to delete (future)
- Search conversations (future)

**`ChatInput.tsx`** - Text input with send button
- Auto-expanding text input (1-5 lines)
- Send button (disabled when empty)
- Character limit (4000 chars)
- Loading indicator while waiting for response

---

## Context Providers

### 1. LibraryDataContext (`context/LibraryDataContext.tsx`)

**Purpose:** Central state management for user's trick library

**State:**
```typescript
{
  sections: CategorySection[]           // All tricks organized by category
  allCategories: LocalCategory[]        // All user categories (for selectors)
  loading: boolean                      // True during data fetch
  initializing: boolean                 // True on first load
  error: string | null                  // Error message if fetch fails
  userName: string | null               // User display name
  avatarUrl: string | null              // User profile picture URL
}
```

**Methods:**
- `refresh()` - Force refresh from network + cache
- `toggleFavorite(trickId)` - Add/remove from favorites
- `createCategory(name, color)` - Create new category
- `updateCategory(id, name, color)` - Update category
- `deleteCategory(id)` - Delete category (removes from all tricks)
- `applyFilters()` - Internal: rebuilds sections based on SearchContext filters

**Real-time Subscriptions:**
Listens to Supabase real-time events:
- `magic_tricks` table (INSERT, UPDATE, DELETE)
- `user_categories` table (INSERT, UPDATE, DELETE)
- `trick_categories` junction table (INSERT, DELETE)
- `user_favorites` table (INSERT, DELETE)

**Optimization:**
- `buildSections()` combines all filters in single pass (search, difficulty, duration, tags, categories)
- Memoized sections to avoid unnecessary re-renders
- Debounced search (300ms)

**Usage:**
```typescript
const { sections, allCategories, loading, refresh, toggleFavorite } = useLibraryData();
```

---

### 2. SearchContext (`context/SearchContext.tsx`)

**Purpose:** Search query and filter state management

**State:**
```typescript
{
  searchQuery: string                   // Raw search query
  debouncedSearchQuery: string          // Debounced (300ms)
  searchFilters: {
    categories: string[]                // Category IDs to filter by
    tags: string[]                      // Tag names to filter by
    tagMode: 'AND' | 'OR'               // Tag matching mode
    difficulties: number[]              // Difficulty levels (1-5)
    durations: { min: number, max: number }  // Duration range (seconds)
    resetTimes: { min: number, max: number } // Reset time range (seconds)
    angles: string[]                    // Angles (front, sides, back, surrounded)
    isPublic: boolean | null            // Public/Private filter (null = all)
    sortOrder: 'recent' | 'modified' | 'title' | 'difficulty'
  }
}
```

**Methods:**
- `setSearchQuery(query)` - Update search query (debounced)
- `setSearchFilters(filters)` - Update filters
- `clearFilters()` - Reset all filters

**Usage:**
```typescript
const { searchQuery, setSearchQuery, searchFilters, setSearchFilters, clearFilters } = useSearch();
```

---

### 3. TrickDeletionContext (`context/TrickDeletionContext.tsx`)

**Purpose:** Notify components of trick deletion for cleanup

**State:**
```typescript
{
  deletedTrickId: string | null         // ID of last deleted trick (temporary)
}
```

**Methods:**
- `notifyDeletion(trickId)` - Notify components of deletion
- Internal: Clears `deletedTrickId` after 2 seconds

**Usage:**
```typescript
const { deletedTrickId } = useTrickDeletion();

useEffect(() => {
  if (deletedTrickId === currentTrickId) {
    // Navigate away or close modal
  }
}, [deletedTrickId]);
```

---

### 4. OfflineSyncContext (`context/OfflineSyncContext.tsx`)

**Purpose:** Global state for offline/sync status

**State:**
```typescript
{
  isOnline: boolean                     // Network connectivity status
  isSyncing: boolean                    // True during sync operation
  pendingOperations: OfflineOperation[] // Operations waiting to sync
  lastSyncTime: Date | null             // Last successful sync timestamp
  syncError: string | null              // Error message if sync fails
}
```

**Methods:**
- `syncNow()` - Manually trigger sync
- `getPendingOperations()` - Get list of pending operations
- `clearSyncError()` - Clear sync error message

**Automatic Sync Triggers:**
1. Network reconnection (NetInfo listener)
2. App foreground transition (AppState listener)
3. Manual trigger via `syncNow()`

**Usage:**
```typescript
const { isOnline, isSyncing, pendingOperations, syncNow } = useOfflineSync();
```

---

## Service Layer

### Data Services

**`LocalDataService.ts`** - Cache layer (AsyncStorage + in-memory)

**Methods:**
- `getUserData(userId)` - Get cached user data (sync from memory)
- `saveUserData(userId, data)` - Save to cache (memory + AsyncStorage)
- `updateTrick(userId, trickId, updates, isPending)` - Update trick in cache
- `addTrick(userId, trick, isPending)` - Add trick to cache
- `removeTrick(userId, trickId)` - Remove trick from cache
- `toggleFavorite(userId, trickId, isFavorite)` - Toggle favorite in cache
- `addCategory(userId, category)` - Add category to cache
- `updateCategory(userId, categoryId, updates)` - Update category in cache
- `removeCategory(userId, categoryId)` - Remove category from cache
- `getPendingTricks(userId)` - Get tricks with `_pendingSync` flag
- `getPendingCategories(userId)` - Get categories with `_pendingSync` flag
- `clearUserData(userId)` - Clear cache for user (logout)

**Cache Structure:**
```typescript
{
  [userId]: {
    tricks: LocalTrick[]           // All tricks with _pendingSync, _isLocalOnly flags
    categories: LocalCategory[]    // All categories with _pendingSync flag
    favorites: string[]            // Favorited trick IDs
    profile: Profile               // User profile
  }
}
```

---

**`SupabaseDataService.ts`** - Database CRUD

**Methods:**
- `fetchAllUserData(userId)` - Fetch complete user data from Supabase
- `createCategory(userId, name, color)` - Insert category in database
- `updateCategory(userId, categoryId, name, color)` - Update category in database
- `deleteCategory(userId, categoryId)` - Delete category from database
- `createTrick(userId, trickData)` - Insert trick in database
- `updateTrick(userId, trickId, updates)` - Update trick in database
- `deleteTrick(userId, trickId)` - Delete trick from database
- `toggleFavorite(userId, trickId, isFavorite)` - Insert/delete favorite in database

**Error Handling:**
- Throws errors with descriptive messages
- Caller responsible for retry logic
- RLS policies enforced by Supabase

---

**`trickService.ts`** - Business logic

**Methods:**
- `getCompleteTrick(trickId, userId)` - Fetch trick with all relations (categories, tags, photos)
- `updateIsPublic(trickId, userId, isPublic)` - Toggle trick public/private (MVP 2.0)

**Orchestration:**
- Coordinates between LocalDataService and SupabaseDataService
- Implements business rules (e.g., can't delete category if has tricks)
- Validation logic

---

### Search & Sync Services

**`HybridSearchService.ts`** - Intelligent search

**Methods:**
- `shouldUseServerSearch(trickCount)` - Returns true if ≥500 tricks
- `searchOnServer(userId, query, filters)` - Server-side FTS search
- `searchOnClient(tricks, query, filters)` - Client-side JS filter

**Algorithm:**
1. Check trick count in LibraryDataContext
2. If < 500: Use client-side filter (fast enough)
3. If ≥ 500: Use server-side FTS with GIN index
4. Return filtered tricks

**Server Search (FTS):**
```sql
SELECT * FROM magic_tricks
WHERE user_id = $1
  AND search_vector @@ websearch_to_tsquery('simple', $2)
ORDER BY ts_rank(search_vector, websearch_to_tsquery('simple', $2)) DESC
```

---

**`NetworkMonitorService.ts`** - Connectivity monitor

**Methods:**
- `initialize()` - Setup NetInfo listener
- `isOnline()` - Get current connectivity status
- `subscribe(callback)` - Subscribe to connectivity changes
- `unsubscribe(callback)` - Unsubscribe from connectivity changes
- `waitForConnection()` - Promise that resolves when online

**Events:**
- Emits `online` event when connectivity restored
- Emits `offline` event when connectivity lost

---

**`lib/offlineQueue.ts`** - Offline operation queue

**Operations:**
- `create_trick` - Create new trick
- `update_trick` - Update existing trick
- `delete_trick` - Delete trick
- `toggle_favorite` - Toggle favorite status
- `create_category` - Create category
- `update_category` - Update category
- `delete_category` - Delete category

**Methods:**
- `enqueue(operation)` - Add operation to queue
- `processQueue(userId)` - Process all pending operations
- `clearQueue()` - Clear all operations (logout)
- `getQueueSize()` - Get number of pending operations

**Retry Logic:**
- Max 3 attempts per operation
- Exponential backoff: 1s, 2s, 4s
- After 3 failures: mark as `failed` status (manual intervention required)

---

### Media Services

**`fileUploadService.ts`** - Media upload orchestrator

**Methods:**
- `uploadPhoto(uri, userId, progressCallback)` - Upload photo to Cloudflare Images
- `uploadVideo(uri, userId, progressCallback)` - Upload video to Cloudflare Stream
- `uploadFile(uri, userId, path, progressCallback)` - Upload generic file to Cloudflare R2

**Flow:**
1. Check file size (warn if >100MB)
2. Generate unique filename
3. For videos: Analyze and compress if needed
4. Upload to Cloudflare (or fallback to Supabase)
5. Call progressCallback with 0-100%
6. Return public URL

---

**`videoService.ts`** - Video compression

**Methods:**
- `compressVideo(uri, options)` - Compress video using react-native-compressor
- `getVideoMetadata(uri)` - Get video duration, resolution, codec (⚠️ TODO: migrate to expo-video-metadata in SDK 54)
- `generateThumbnail(uri, time)` - Generate video thumbnail at specific time

**Compression Settings:**
- Resolution: 720p for videos >1080p
- Bitrate: 2 Mbps (good quality, reasonable size)
- Codec: H.264 (maximum compatibility)

**Expo Go Limitation:**
- `react-native-compressor` does NOT work in Expo Go
- Falls back to uncompressed video in Expo Go
- Must use dev client for compression

---

**`videoAnalysisService.ts`** - Intelligent compression analysis

**Methods:**
- `analyzeVideo(uri)` - Decide if compression needed

**Algorithm:**
1. Get video metadata (resolution, bitrate, duration)
2. If resolution >1080p: recommend compression
3. If bitrate >5 Mbps: recommend compression
4. If duration >5 minutes: recommend compression
5. Return decision: { shouldCompress: boolean, reason: string }

---

**Cloudflare Services:**

**`cloudflare/CloudflareStreamService.ts`** - Video streaming upload (TUS protocol)
- Uploads videos to Cloudflare Stream
- Generates adaptive bitrate streams
- Returns playback URL

**`cloudflare/CloudflareImagesService.ts`** - Image optimization upload
- Uploads images to Cloudflare Images
- Automatic optimization and resizing
- Returns CDN URL with variants

**`cloudflare/CloudflareStorageService.ts`** - R2 object storage
- Generic file uploads to Cloudflare R2
- Used for PDFs, documents, etc.
- Returns public URL

---

### AI & Chat Services

**`chatService.ts`** - Conversation management

**Methods:**
- `checkUserLimit(userId)` - Check if user has reached daily limit (free: 2/day, plus: unlimited)
- `getConversations(userId)` - Fetch user's conversation history
- `sendMessage(userId, conversationId, message)` - Send message to GPT-4 and save to database
- `createConversation(userId, title)` - Create new conversation
- `deleteConversation(userId, conversationId)` - Delete conversation

**Usage Tracking:**
- Tracks tokens used per conversation (ai_usage_tracking table)
- Enforces daily limits for free users
- Billing integration (future)

---

**`openAIService.ts`** - OpenAI GPT-4 integration

**Methods:**
- `chat(messages, systemPrompt, options)` - Send messages to GPT-4
- `streamChat(messages, systemPrompt, onChunk, options)` - Stream GPT-4 response (future)

**System Prompt:**
```
You are Mmento AI, a helpful assistant for magicians. You have access to the user's trick library and can help them organize, improve, and create new magic tricks. Be creative, supportive, and knowledgeable about magic.
```

**Security:**
- API key stored in environment variable
- Prompts encrypted before sending (MVP 2.0)
- No PII sent to OpenAI

---

### Other Services

**`authService.ts`** - Authentication helpers

**Methods:**
- `signIn(email, password)` - Sign in with email/password
- `signUp(email, password, username)` - Create new account
- `signOut()` - Sign out current user
- `resetPassword(email)` - Send password reset email
- `getCurrentUser()` - Get current session user

---

**`orderService.ts`** - Purchase/order management

**Methods:**
- `createOrder(userId, planId)` - Create Stripe payment intent (⚠️ TODO: integrate Stripe)
- `getOrders(userId)` - Fetch user's order history
- `updateSubscription(userId, planId)` - Change subscription plan

---

## Implemented Features

### CRUD Operations ✅

- ✅ Create tricks with 3-step wizard
- ✅ Read tricks with categories and search
- ✅ Update tricks with same wizard UI
- ✅ Delete tricks with confirmation modal
- ✅ Optimistic updates with offline support

### Categories & Organization ✅

- ✅ Create/Edit/Delete custom categories
- ✅ Virtual "Favorites" category (ID: favorites-virtual)
- ✅ Assign trick to category during creation
- ✅ Multi-category support per trick (junction table)
- ✅ Empty categories always visible

### Search & Filtering ✅

- ✅ Full-Text Search (FTS) with GIN index
- ✅ Hybrid search (client <500 tricks, server ≥500)
- ✅ Multi-language support (Spanish, English via 'simple' config)
- ✅ Debounced search (300ms)
- ✅ Filter by: categories, tags (AND/OR), difficulty, duration, reset time, angles, visibility
- ✅ Sort: recent, last modified

### Media Management ✅

- ✅ Photo upload with Cloudflare Images
- ✅ Video upload with Cloudflare Stream
- ✅ Multiple photos per trick (trick_photos table)
- ✅ Intelligent video analysis (decides compression)
- ✅ Automatic compression for large videos
- ✅ Progress tracking during upload
- ✅ Warning for large files (>100MB)
- ✅ Permissions handling (camera, media library)

### Offline Mode ✅

- ✅ Full offline support with queue system
- ✅ Network monitoring (NetInfo)
- ✅ Operation queue with retry (max 3 attempts)
- ✅ Automatic sync on reconnection
- ✅ Visual indicator (OfflineIndicator component)
- ✅ Local cache (AsyncStorage + in-memory)
- ✅ Optimistic UI updates

### AI Assistant (MMENTO AI) ✅

- ✅ Chat with OpenAI GPT-4
- ✅ Context-aware (user's trick library)
- ✅ Conversation history
- ✅ Usage limits (free: 2/day, plus: unlimited)
- ✅ Token tracking (ai_usage_tracking table)
- ✅ Security: Encrypted prompts
- ✅ Conversation folders (prepared for MVP 2.0)
- ⚠️ Audio input (component ready, not fully integrated)

### User Management ✅

- ✅ Authentication with Supabase Auth
- ✅ Apple SignIn integration
- ✅ Profile management
- ✅ Subscription tiers (free, plus, developer)
- ✅ Profile picture upload

### Internationalization ✅

- ✅ i18next with English and Spanish
- ✅ Auto-detection of device language
- ✅ Fallback to English if translation missing

### Performance Optimizations ✅

- ✅ In-memory cache for instant access
- ✅ AsyncStorage for persistence
- ✅ FlashList instead of FlatList
- ✅ Real-time subscriptions with debounce
- ✅ Video compression before upload
- ✅ Cloudflare CDN for media delivery
- ✅ Optimized base64 encoding (utils/optimizedBase64.ts)

---

## Incomplete Features

### High Priority ⚠️

**Make Trick Public/Private**
- **Status:** UI exists (TrickActionsModal.tsx:104), backend incomplete
- **Required:**
  - Uncomment make public/private button in TrickActionsModal
  - Implement `trickService.updateIsPublic()`
  - Add RLS policy for public tricks (anyone can read if is_public = true)
  - Create community feed screen to browse public tricks
- **File:** `components/ui/TrickActionsModal.tsx:104`

**Report Content System**
- **Status:** Button exists (TrickActionsModal.tsx:161), no implementation
- **Required:**
  - Create ReportModal component
  - Add report reason dropdown (spam, inappropriate, copyright, etc.)
  - Save to `reports` table
  - Implement moderation dashboard (admin only)
- **File:** `components/ui/TrickActionsModal.tsx:161`

**Stripe Payment Integration**
- **Status:** Plans screen exists (PlansScreen.tsx:100), no payment logic
- **Required:**
  - Setup Stripe account and get API keys
  - Integrate @stripe/stripe-react-native
  - Implement checkout flow (PlansScreen.tsx)
  - Webhook handler for subscription updates
  - Update `profiles.subscription_type` on payment success
- **File:** `app/(app)/plans/index.tsx:100`

**External Links in Profile**
- **Status:** Links defined (ProfileOptionsScreen.tsx:77), not opening
- **Required:**
  - Use Linking.openURL() to open external links
  - Handle errors (invalid URL, no browser)
  - Test on iOS and Android
- **File:** `app/(app)/profile-options/index.tsx:77`

---

### Medium Priority ⚠️

**Settings Screen**
- **Status:** Coming soon placeholder
- **Required:**
  - Notification preferences
  - Language selection
  - Theme selection (light/dark mode - future)
  - Clear cache option
  - Export data option

**Reminders System**
- **Status:** Coming soon placeholder
- **Required:**
  - Set reminders for trick practice
  - Push notifications integration (expo-notifications)
  - Reminder list screen
  - Mark as complete/snooze options

**Notifications**
- **Status:** Coming soon placeholder
- **Required:**
  - Push notifications for reminders
  - In-app notifications for community interactions (likes, comments on public tricks)
  - Notification settings (sound, vibration, badge)

**Video Gallery**
- **Status:** Coming soon placeholder
- **Required:**
  - Browse all uploaded videos
  - Filter by trick
  - Play video in full-screen
  - Share video

---

### Low Priority / Future ⚠️

**Audio Recorder Full Integration in AI**
- **Status:** Component ready (AudioRecorder.tsx), not connected
- **Required:**
  - Integrate OpenAI Whisper for speech-to-text
  - Send transcription to GPT-4 chat
  - Voice response playback (text-to-speech)

**Migrate to expo-video-metadata**
- **Status:** TODO in VideoService.ts:201
- **Required:**
  - Wait for Expo SDK 54 (expo-video-metadata stabilizes)
  - Replace manual metadata extraction with expo-video-metadata
  - Test on all video formats

**Trick Versioning**
- **Status:** `parent_trick_id` field exists in magic_tricks table
- **Required:**
  - UI to create trick variation (duplicate + link to parent)
  - Show version history
  - Compare versions (diff view)

**Advanced Drag & Drop**
- **Status:** Components prepared (DragPortal, DragOverlay, etc.)
- **Required:**
  - Implement trick reordering within categories
  - Drag trick to different category
  - Visual feedback during drag

---

## Areas for Improvement

### Code Structure 🔧

**Large Components (need refactoring):**

1. **`TrickViewScreen.tsx`** (400+ lines)
   - **Issue:** Too many responsibilities (video player, photo gallery, actions, tabs)
   - **Solution:**
     - Extract VideoPlayer component
     - Extract PhotoGallery component
     - Extract TrickActions component
     - Use custom hooks: `useTrickViewer`, `useVideoPlayer`

2. **`AddMagicWizard.tsx`** (600+ lines)
   - **Issue:** Complex form state, media upload logic mixed with UI
   - **Solution:**
     - Extract upload logic to `useMediaUpload` hook
     - Extract form state to `useTrickForm` hook
     - Split wizard steps into separate components (already partially done)

3. **`EditMagicWizard.tsx`** (duplicates AddMagicWizard)
   - **Issue:** 90% duplicate code with AddMagicWizard
   - **Solution:**
     - Create shared `TrickWizard` component
     - Pass `mode: 'create' | 'edit'` prop
     - Conditional logic for pre-filling data

4. **`LibrariesSection.tsx`** (complex state management)
   - **Issue:** Multiple useEffects, complex filtering logic
   - **Solution:**
     - Move filtering logic to HybridSearchService
     - Use useMemo more aggressively
     - Extract list rendering to separate component

---

**Code Duplication:**

1. **Wizard Steps (Add vs Edit)**
   - Same components used in both wizards
   - Solution: Shared component library for wizard steps

2. **Modal Styles**
   - Repeated modal styling across 10+ modals
   - Solution: Create `BaseModal` component with shared styles

3. **CategoryActionsModal & TagActionsModal**
   - Very similar logic (edit, delete, cancel)
   - Solution: Generic `EntityActionsModal` component

---

### Performance 🚀

**Issues:**

1. **`buildSections()` in LibraryDataContext runs frequently**
   - Triggered on every search query change (even though debounced)
   - Solution: More aggressive memoization with useMemo dependencies

2. **TrickViewScreen could benefit from lazy loading of tabs**
   - All 3 tabs render on mount (Effect, Secret, Stats)
   - Solution: Lazy load tab content (render only active tab)

3. **Media compression is synchronous**
   - Native module blocks UI thread during compression
   - Solution: Better UI feedback (show compression progress, not just upload progress)

---

### Testing 🧪

**Current Status:**
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests

**Recommendations:**

1. **Unit Tests (Jest)**
   - Test services (LocalDataService, SupabaseDataService, HybridSearchService)
   - Test utility functions (formatters, validators)
   - Test custom hooks (useKeyboard, useDebounce)

2. **Integration Tests (React Native Testing Library)**
   - Test contexts (LibraryDataContext, SearchContext)
   - Test component interactions (CategorySelector + FilterModal)

3. **E2E Tests (Detox)**
   - Test critical user flows:
     - Sign up → Create trick → View trick → Edit trick → Delete trick
     - Search and filter tricks
     - Offline create → Online sync

---

### Security 🔒

**Issues:**

1. **SecurityManager exists but limited usage**
   - Only used for encrypting sensitive strings
   - Solution: Expand usage to all sensitive data (API keys, tokens)

2. **Local cache not encrypted**
   - AsyncStorage data is plaintext
   - Solution: Encrypt cache using expo-secure-store

3. **No key rotation**
   - OpenAI API key, Cloudflare tokens never rotate
   - Solution: Implement key rotation strategy

---

### Accessibility ♿

**Issues:**

1. **Missing a11y labels**
   - Many buttons lack accessibilityLabel
   - Solution: Audit all touchable components

2. **Focus management in modals**
   - Keyboard focus not properly managed when modals open/close
   - Solution: Use react-native-modal with proper focus trap

3. **Color contrast**
   - Some text/background combinations may not meet WCAG standards
   - Solution: Audit with contrast checker tool

---

### Documentation 📚

**Issues:**

1. **Missing JSDoc comments**
   - Many functions lack documentation
   - Solution: Add JSDoc to all exported functions

2. **Complex logic lacks inline comments**
   - buildSections(), processQueue(), etc. have no explanatory comments
   - Solution: Add inline comments explaining algorithm

---

## Development Workflow

### Adding a New Feature

1. **Define types** in `types/` if needed
   - Example: `types/reminder.ts` for reminders feature

2. **Create service** in `services/` for business logic
   - Example: `services/reminderService.ts`

3. **Add context** in `context/` if global state needed
   - Example: `context/ReminderContext.tsx`

4. **Create component** in `components/`
   - Example: `components/reminders/ReminderList.tsx`

5. **Add route** in `app/` if new screen
   - Example: `app/(app)/reminders/index.tsx`

6. **Update documentation**
   - Add to `DEVELOPER_GUIDE.md` (this file)
   - Update `CLAUDE.md` if critical for Claude Code

---

### Testing Flow (when implemented)

1. **Unit tests** for services and utils
   - `npm test -- services/reminderService.test.ts`

2. **Integration tests** for contexts
   - `npm test -- context/ReminderContext.test.tsx`

3. **E2E tests** for critical user flows
   - `npm run test:e2e -- reminders.e2e.ts`

---

### Performance Monitoring

1. **Check index usage** in database snapshot
   - `docs/SUPABASE_DATABASE_SNAPSHOT.md` Section 3.4

2. **Monitor FlashList performance**
   - Use React DevTools Profiler
   - Check for excessive re-renders

3. **Track upload times and compression ratios**
   - Log in fileUploadService.ts
   - Monitor Cloudflare Stream dashboard

4. **Measure search response times**
   - Log in HybridSearchService.ts
   - Compare client vs server search times

---

## Offline-First Implementation

### System Components

**1. Network Monitor Service** (`services/NetworkMonitorService.ts`)
- Monitors network connectivity in real-time using `@react-native-community/netinfo`
- Provides connection status to entire app via callbacks
- Triggers sync operations when connection is restored

**2. Offline Queue Service** (`lib/offlineQueue.ts`)
- Queues operations performed offline in AsyncStorage
- Automatic retry with exponential backoff (max 3 attempts)
- Operations: create_trick, update_trick, delete_trick, toggle_favorite, create_category, update_category, delete_category

**3. Local Data Service** (`services/LocalDataService.ts`)
- AsyncStorage + in-memory cache for instant access
- Tracks pending changes with `_pendingSync` and `_isLocalOnly` flags
- Methods: getPendingTricks(), getPendingCategories()

**4. Offline Sync Context** (`context/OfflineSyncContext.tsx`)
- Global state for offline/sync status
- Automatic sync on: network reconnection, app foreground transition, manual trigger via syncNow()
- Provides: isOnline, isSyncing, pendingOperations, lastSyncTime

**5. Offline Indicator UI** (`components/ui/OfflineIndicator.tsx`)
- Visual indicator at top of screen
- Shows offline status, pending operations count, sync progress
- Tap to manually trigger sync

---

### Implementation Pattern

**When performing operations that modify data:**

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

---

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

---

### Conflict Resolution

**Current Strategy: "Last Write Wins"**

- Operations are executed in chronological order (timestamp-based)
- Server state is considered authoritative after sync
- Failed operations after 3 retries are marked as `failed` status

**Future Improvements:**
- Implement operational transformation (OT) for concurrent edits
- Add conflict resolution UI (show both versions, let user choose)
- Version vector timestamps for causality detection

---

### Testing Offline Mode

1. **Enable airplane mode** on device
2. **Perform operations** (create/edit/delete tricks)
3. **Observe OfflineIndicator** showing pending operations
4. **Disable airplane mode**
5. **Automatic sync** occurs within seconds
6. **Verify changes** appear in Supabase database

---

## Codebase Statistics

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

---

## Recommendations for Next Steps

### MVP 2.0 Priorities

1. ✅ **Complete payment integration (Stripe)**
   - Setup Stripe account
   - Integrate @stripe/stripe-react-native
   - Implement checkout flow
   - Webhook handler for subscriptions

2. ✅ **Implement make public/private functionality**
   - Uncomment UI in TrickActionsModal
   - Add RLS policy for public tricks
   - Create community feed screen

3. ✅ **Add notification system**
   - Push notifications with expo-notifications
   - In-app notification center
   - Notification preferences in settings

4. ✅ **Complete settings screen**
   - Notification preferences
   - Language selection
   - Clear cache option

5. ✅ **Implement reminders**
   - Set practice reminders
   - Push notifications
   - Reminder list screen

6. ✅ **Add social features (share, like, comment)**
   - Like public tricks
   - Comment on public tricks
   - Share trick via native share sheet

---

### Technical Debt

1. **Refactor large components** (TrickViewScreen, Wizards)
2. **Add comprehensive test suite** (Jest + Detox)
3. **Improve error handling** across services
4. **Add JSDoc documentation**
5. **Implement proper logging system** (Sentry, LogRocket)

---

### Performance Targets

- Home load: **<500ms** (with cache)
- Trick view: **<300ms**
- Search: **<100ms** (debounced)
- Upload: **<30s** for average video (with compression)
- Sync: **<5s** for small operations

---

## Summary

This guide covers the complete implementation details of the mmento application. For quick reference, see `CLAUDE.md`. For architecture details, see `APP_ARCHITECTURE_DETAILED.md`. For database schema, see `SUPABASE_DATABASE_SNAPSHOT.md`.

**Last Updated:** 2025-01-13

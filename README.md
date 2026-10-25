# MOMO — Little moments, closer together. 🌸

MOMO is a privacy-first, intimate social moments mobile application for iOS and Android, inspired by the concept of quiet peer-to-peer photo sharing and real-time home-screen photo widgets.

---

## 📱 Features & Highlights

- **Warm Pastel Design System**: Crafted with custom tokens (`#FFF8F1` cream, `#FF806E` coral, `#F5C8D7` blush, `#292526` charcoal, `#B8C9B5` sage), soft rounded cards, and haptic feedback.
- **5 Primary Core Tabs**:
  1. **Moments Feed**: Private friend stories bar, group filters, double-tap heart interactions, emoji reaction bar, pull-to-refresh, and reporting.
  2. **Camera**: Real device camera access with front/rear flip, flash toggles, gallery selection, and warm pastel color filters.
  3. **Memories**: Chronological photo vault, weekly & monthly recaps, and customizable albums.
  4. **Friends & Circles**: Mutual friend requests, username lookup, and private shared circles (e.g., Besties, Coffee Club).
  5. **Profile**: Editable bio, custom avatar picker, circle stats, widget configuration shortcut, and privacy settings.
- **Native Home-Screen Widgets**:
  - Powered by `expo-widgets` configuration and shared snapshot caching.
  - Variants: Latest photo, Selected friend, Selected group, and Memory photo.
  - Deep linking into moments: `momo://moment/<id>`.
- **Supabase Backend & Row Level Security (RLS)**:
  - Strict isolation: users can only see moments shared directly with their circle or approved groups.
  - Private storage bucket (`moments`) with user-isolated upload paths.
  - Zero mock data in production; seamless graceful local preview fallback when offline.

---

## 🛠️ Technology Stack

- **Framework**: React Native with Expo SDK 58
- **Navigation**: Expo Router (Typed file-based routing)
- **Language**: TypeScript with strict mode
- **Backend**: Supabase Auth, PostgreSQL, Supabase Storage, Realtime
- **Widgets**: `expo-widgets` with snapshot cache
- **Camera & Media**: `expo-camera`, `expo-image-picker`, `expo-media-library`
- **Feedback & Notifications**: `expo-haptics`, `expo-notifications`
- **Validation**: Zod schema validation
- **Testing**: Jest with `jest-expo` and React Native Testing Library

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase project credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_APP_SCHEME=momo
EXPO_PUBLIC_BUNDLE_ID=com.momo.moments
```

### 3. Run Database Migrations
Execute the SQL migration located in `supabase/migrations/20261025000000_momo_initial_schema.sql` via the Supabase Dashboard SQL Editor or Supabase CLI:
```bash
npx supabase db push
```

### 4. Run the Development Server
```bash
npx expo start
```
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Press `w` for web preview

---

## 🧪 Testing & Code Quality

Run the test suite:
```bash
npm test
```

Run TypeScript strict type checking:
```bash
npm run typecheck
```

---

## 📲 Building Native Development Clients & Release (EAS)

Because MOMO includes native camera, haptics, notifications, and home-screen widgets, build native binaries using EAS:

```bash
# Install EAS CLI
npx eas-cli@latest login

# Configure project
npx eas-cli@latest project:init

# Build development client for iOS
npx eas-cli@latest build --profile development --platform ios

# Build development client for Android
npx eas-cli@latest build --profile development --platform android
```

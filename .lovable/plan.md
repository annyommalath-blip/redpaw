

# RedPaw 🐕 - Mobile App MVP

A pet-lover focused app for dog owners featuring profile management, health tracking, lost dog alerts, community features, and dog care requests.

---

## 🎨 Design System

**Visual Style:**
- Warm, friendly aesthetic with subtle paw accents and rounded corners
- Clean Gen-Z feel that's usable for all ages
- Large tap targets and clear typography for mobile

**Color Palette:**
- Neutral cream/white background
- Primary accent: Warm coral-red (#E57373 range) for CTAs and Lost Mode
- Secondary: Soft orange for highlights
- Success/Active states: Soft green
- Dark text on light backgrounds for readability

**UI Components:**
- Rounded cards with subtle shadows
- Large, friendly buttons
- Playful but minimal empty state illustrations
- Clear loading and error states

---

## 📱 Screens & Features

### 1. Onboarding & Authentication
- Welcome splash screen with app branding
- Sign up / Sign in with email & password
- Friendly onboarding flow for new users

### 2. Home Tab
- "My Dog" hero card showing:
  - Dog photo, name, breed
  - **Lost Mode toggle** (turns card RED when active)
- Quick action buttons:
  - Add Health Log
  - Toggle Lost Mode
  - Create Care Request
- Recent health logs list

### 3. Community Tab
- Segmented tabs: **Lost Dogs** | **Care Requests**
- Card-based feed with:
  - Lost dog alerts (photo, description, last seen location, contact button)
  - Care requests (type, time window, location, notes)
- Filters: Active/Open, Newest first
- Ability to respond to alerts or requests

### 4. Create Tab
- Central hub for creating content:
  - Add Health Log (type: walk, food, meds, mood, symptom)
  - Post Lost Alert (if dog is lost)
  - Post Care Request (walk, watch, overnight, check-in)

### 5. Messages Tab
- Conversation list with preview
- Individual chat screen
- Real-time messaging between dog owners and responders

### 6. Profile Tab
- User profile (name, photo)
- My Dogs section (currently 1 dog, structured for multiple)
- Edit dog profile
- Settings placeholders
- Sign out

---

## 🔧 Backend (Lovable Cloud)

**Database Tables:**
- `profiles` - User information
- `dogs` - Dog profiles with `is_lost` flag
- `health_logs` - Manual health event entries
- `lost_alerts` - Active lost dog posts
- `sightings` - Community sighting reports
- `care_requests` - Dog care job postings
- `conversations` - Chat threads
- `messages` - Individual messages

**Storage:**
- Dog photos bucket
- User avatar bucket

**Security:**
- Row-level security for data privacy
- Users can only edit their own dogs/logs/alerts
- Messages accessible only to conversation participants

---

## 🚀 Native App Deployment (Capacitor)

After the web app is built:
1. Export project to GitHub
2. Add iOS and Android platforms
3. Build and sync with Capacitor
4. Run on physical devices or emulators
5. Submit to App Store / Google Play

---

## 📋 Scope Notes

**Included:**
- Manual text input for locations (no GPS)
- Basic form validation
- Loading and error states
- Sample/seed data for testing

**Not included (future enhancements):**
- Live GPS tracking
- Hardware tracking devices
- AI features
- Push notifications (placeholder only)


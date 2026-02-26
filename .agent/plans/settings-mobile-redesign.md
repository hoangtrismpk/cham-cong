# Implementation Plan - Settings Page Mobile Layout Redesign (Option A)

## Goal
Redesign the Mobile view of the Settings page (`/settings`) to use a **stack navigation model** (similar to iOS Settings).
- **Level 1 (Main Menu):** Display a clean list of setting groups (Profile, Security, Notification, Preferences).
- **Level 2 (Detail View):** Clicking a group slides in the detailed form for that section, maximizing screen space.

## Architecture
We will modify `app/settings/settings-client.tsx`.
No new files are needed, but we will significantly refactor the JSX within the `activeTabMobile` logic.

### 1. State Management
We will use the existing `activeTabMobile` state (`string`) to track the current view.
- `'none'`: Shows the Level 1 Main Menu.
- `'general-mobile'`: Shows Profile form.
- `'security-mobile'`: Shows Security form.
- `'notifications-mobile'`: Shows Notification settings.
- `'preferences-mobile'`: Shows General Preferences.

### 2. Component Structure (Mobile Only)
The Desktop view (`hidden xl:flex`) remains **unchanged**.
The Mobile view (`xl:hidden`) will be refactored:

#### Level 1: Main Menu
- A list of `button` elements, each with an icon, title, and chevron-right.
- Grouped by relevance (e.g., Account vs. App Settings).
- Includes a logout button at the bottom.

#### Level 2: Detail View Overlay
- A full-screen `div` (`fixed inset-0 z-50 bg-background`) that slides in (`animate-in slide-in-from-right`).
- **Header:** Back button (`setActiveTabMobile('none')`) + Title of the current section.
- **Body:** The existing form content for that section (reused from the current code but properly containerized).

## Steps
1.  **Refactor Main Menu:** Replace the current hardcoded list with a cleaner, grouped list design.
    - Group 1: Account (Profile, Security).
    - Group 2: App Settings (Notifications, Preferences).
    - Group 3: Danger Zone (Logout).
2.  **Generic Detail View Wrapper:** Create a reusable wrapper or conditional rendering logic for the "Slide-in" pages to avoid code duplication.
3.  **Migrate Content:** Move the form inputs for Notifications and Preferences (currently inline in the main list) into their own detail views.
4.  **Polish:** Ensure smooth transitions and correct spacing/padding.

## Checklist
- [ ] Update `activeTabMobile` handling to support all 4 tabs.
- [ ] Design the Level 1 Menu with groups.
- [ ] implement the Slide-in view for 'Notifications' and 'Preferences' (currently missing in mobile detail logic).
- [ ] Verify 'Profile' and 'Security' forms still work in the new layout.
- [ ] Test "Back" functionality.

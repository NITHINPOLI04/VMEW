# PLAN-login-redesign

## Goal
Redesign the login page with the newly provided marine illustration as a background and a specific "Agent Login" card aligned to the right side of the screen.

## Project Type
WEB

## Success Criteria
- The login page features the new illustration running full bleed on the background or left half.
- The "Agent Login" card matches exactly the provided mock-up.
- The existing authentication logic works securely with the new UI.
- All verification checks pass.

## Tech Stack
- React
- React-Router (`useNavigate`)
- Tailwind CSS

## File Structure
- `src/pages/Login.tsx` (Layout and Component update)
- `/public/...` (New background image to be attached)

## Task Breakdown
- [x] Task 1: Reference the provided illustration in the `Login.tsx` root container styles, changing the layout style to accommodate the new look.
  - **Agent**: `frontend-specialist`, **Skill**: `frontend-design`
  - **Verify**: The new background image covers the screen or designated area correctly.
- [x] Task 2: Re-architect the `Login.tsx` layout to cleanly separate the background from the right-aligned designated login card container.
  - **Agent**: `frontend-specialist`, **Skill**: `tailwind-patterns`
  - **Verify**: The layout allows the right-aligned card to overlay the background seamlessly on large screens.
- [x] Task 3: Build the "Agent Login" card Component with precise styling (typography, rounded borders, specific placeholder texts) based on the second attached image.
  - **Agent**: `frontend-specialist`, **Skill**: `ui-ux-pro-max`
  - **Verify**: The UI has identical text ("Agent Login", "Enter Email / Phone No", "Passcode"), the distinct orange "Sign in" button, and specific border radius styles matching the mock-up perfectly.
- [x] Task 4: Wire the existing login state (`email`, `password`) and `handleSubmit` auth-store functions to the new UI inputs.
  - **Agent**: `frontend-specialist`, **Skill**: `react-best-practices`
  - **Verify**: Submitting correctly changes state and triggers `login()` with successful redirect to `/`.

## Done When
- [x] All 4 tasks completed.
- [x] Phase X completed.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security/UX: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-02-22

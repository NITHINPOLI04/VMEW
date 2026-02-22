# PLAN-flip-login

## Goal
Redesign the login page using an interactive 3D flip-card concept: the front displays a welcome view and a gear icon, while the back displays the login form. The transition should be triggered by the gear icon with a smooth professional animation against a static background.

## Project Type
WEB

## Success Criteria
- The login card has a smooth 3D flip animation.
- Front side shows a top image (approx 50% height, width slightly smaller than card, centered).
- Front side has "Welcome Back" text below the image.
- Front side has a rotatable gear/wheel icon below the text.
- Clicking the gear icon smoothly rotates it and flips the card to the back.
- Background remains completely static during the flip.
- Back side contains the functional login form (email, password, sign in, sign up) which exits now.
- Clean blue-and-white SaaS theme with a professional enterprise-grade animation feel.

## Tech Stack
- React
- Tailwind CSS
- Framer Motion (or pure CSS 3D transforms)
- React-Router-DOM

## File Structure
- `src/pages/Login.tsx` (Component redesign & animation logic)

## Task Breakdown
- [x] Task 1: Setup 3D Flip Card layout in `Login.tsx`. Create a wrapper with `perspective` and inner container with `transform-style: preserve-3d`.
  - **Agent**: `frontend-specialist`, **Skill**: `frontend-design`
  - **Verify**: Inspect DOM to ensure perspective structure renders without breaking the page layout.
- [x] Task 2: Implement the Front Side view. Add the top image placeholder, "Welcome Back" text, and the gear icon at the bottom. Apply the blue-and-white SaaS theme.
  - **Agent**: `frontend-specialist`, **Skill**: `tailwind-patterns`
  - **Verify**: Front side displays correctly. The top image takes ~50% of the card height.
- [x] Task 3: Develop the smooth flip and rotate animations. Bind click event to the gear icon to toggle state, rotating the gear and flipping the card 180 degrees (using `rotateY(180deg)`), keeping the background static.
  - **Agent**: `frontend-specialist`, **Skill**: `ui-ux-pro-max`
  - **Verify**: Clicking the gear triggers a visible 3D flip to the back, while the gear rotates. The rest of the page does not move.
- [x] Task 4: Move the existing login form logic (email, password, submit, store binding) to the back side (`[backface-visibility:hidden] [transform:rotateY(180deg)]`).
  - **Agent**: `frontend-specialist`, **Skill**: `react-best-practices`
  - **Verify**: Form inputs are clickable on the back side. Submitting the form successfully calls AuthStore logic and redirects.

## Done When
- [x] All 4 tasks completed.
- [x] Phase X completed.

## Phase X: Verification
- Lint: [x] Pass
- UX Audit: [x] Run `ux_audit` and verify 3D accessibility
- Build: [x] Run `npm run build`
- Runtime: [x] Manual test login logic and flip visual smoothness.

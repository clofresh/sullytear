 # Monster Debug Page Design

## Overview
The Monster Debug Page is a hidden diagnostic view designed to visually inspect all available monster models in the combat arena simultaneously. It provides a "ground truth" view of model scaling and positioning, leveraging the same rendering pipeline as the main game.

## Requirements
- **Access**: Accessible via a hidden route (URL hash `/#debug-monsters`).
- **Layout**: Models arranged in a linear row.
- **Camera**: Full free-camera movement (rotate, pan, zoom).
- **Visual Parity**: Must use existing lighting and model offset logic to match in-game appearance.

## Architecture

### Routing
The application uses a simple hash-based check in `App.tsx` to determine if the `DebugPage` should be rendered instead of the main game loop.

### Components
- **`DebugPage.tsx`**: Entry point. Sets up the R3F `Canvas` and provides the basic page layout.
- **`DebugArena.tsx`**: The 3D scene.
    - **Lighting**: Integrates `ArenaLighting.tsx`.
    - **Environment**: Includes a `THREE.GridHelper` for spatial reference.
    - **Model Rendering**: Iterates over `MODEL_MAP` from `MonsterModel.tsx`.
    - **Camera Control**: Implements `OrbitControls` for free movement.

### Data Flow
`App.tsx` (Hash Check) $ightarrow$ `DebugPage` $ightarrow$ `DebugArena` $ightarrow$ `MonsterModel` (x N)

## Technical Implementation Details

### Model Placement
Monsters are placed along the X-axis using a fixed interval:
`position = [index * SPACING, 0, 0]`
where `SPACING` is set to 4 units to prevent overlap.

### Camera Configuration
- **Default Target**: Centered on the middle of the rendered row.
- **OrbitControls**:
    - `enableDamping = true` for smooth movement.
    - Full support for rotation (left-click), panning (right-click), and zooming (wheel).

## Success Criteria
- Navigating to `/#debug-monsters` renders the debug page.
- All models defined in `MODEL_MAP` are visible and correctly grounded.
- Camera allows free inspection of any model from any angle.
- Lighting and shadows match the main game`s `CombatArena`.

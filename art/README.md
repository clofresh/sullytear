# Sullytear Art Pipeline

There are **two supported source formats** for character meshes and
animations, and both compile down to the same `public/models/<name>.glb`
that the engine loads:

| Source                  | Who authors it          | How it becomes a `.glb`                       |
|-------------------------|-------------------------|-----------------------------------------------|
| `art/<name>.blend`      | 3D artists, in Blender  | Manual export (File → Export → glTF Binary)   |
| `art/<name>.model.toml` | Claude, in text         | `npm run build:models` (auto in `npm build`)  |

**Exactly one source of truth per character.** If `<name>.model.toml` exists,
the compiler owns `<name>.glb` and CI will fail if the committed `.glb` is
stale. To hand a model off from Claude → an artist, delete the `.toml` and
commit a `<name>.blend` + freshly exported `<name>.glb`. To hand it back,
delete the `.blend` and add a `.model.toml`.

Either way, the final `.glb` is gated by the same validator
(`npm run validate:models`), so the contract below applies to both paths.

---

# Option A — Blender only

This is the complete workflow for contributing character meshes and animations
using **Blender 3.6+**. No coding, no command line except for a single `npm`
check before you push.

## 1. Files and folders

- **`art/<name>.blend`** — your working file. One per character. Commit this.
- **`public/models/<name>.glb`** — the exported game asset. Commit this too.

The character `name` must be one of the keys the game already knows about
(currently: `slime`, `goblin`, `skeleton`, `werewolf`, `lich`, `dragon`,
`knight`). Talk to engineering before adding new names.

## 2. Scene setup in Blender

1. Open Blender, delete the default cube.
2. **Units:** Scene Properties → Units → Metric, Unit Scale `1.0`.
3. **Orientation:** your character should face **-Y** (away from the default
   camera) and stand on the **Z = 0** plane. Its **feet must touch Z = 0** —
   the validator will reject the asset if the bottom of the mesh is more than
   10 cm below or above zero.
4. **Size:** total height must be between **0.3 and 4.0 Blender units**. The
   existing procedural knight is ~1.8 units tall — use that as a reference.
5. **Object scale:** with the mesh selected, `Ctrl+A → All Transforms` to
   apply scale/rotation. Non-applied scale breaks animation.

## 3. Rigging

1. Add an `Armature` and parent the mesh to it with
   **Automatic Weights** (`Ctrl+P`).
2. Weight-paint any joints that deform badly.
3. Keep the armature simple — the game does not care about bone names, only
   that a skinned mesh exists. If the validator reports
   `no skinned mesh found`, your mesh is not parented to the armature.

## 4. Animations (the naming contract)

The game looks up animations **by exact, lowercase name**. You must create
**all four** of these as separate Actions in the Dope Sheet / Action Editor:

| Action name | When it plays                        | Looping |
|-------------|--------------------------------------|---------|
| `idle`      | Default stance between actions       | Yes     |
| `attack`    | Character strikes an enemy           | No      |
| `hit`       | Character takes damage               | No      |
| `death`     | Character is defeated                | No      |

Steps:

1. Open the **Dope Sheet → Action Editor**.
2. Click **New**, rename the action to exactly `idle` (no capitals, no
   spaces, no prefix like `Armature|idle`).
3. Key your animation.
4. Click the shield icon (Fake User) so Blender keeps the action even when
   nothing references it.
5. Repeat for `attack`, `hit`, `death`.

> If you misspell an action name the build will fail with
> `missing required animation(s) [attack]; found: Attack` — that's the
> validator doing its job. Rename the action and re-export.

## 5. Materials

Use **Principled BSDF** only. The glTF exporter maps it cleanly to PBR.
Don't use Blender-only shaders (Toon BSDF, Volume Scatter, etc.) — they
will silently disappear in the game.

## 6. Export

`File → Export → glTF 2.0 (.glb/.gltf)` with these settings:

- **Format:** `glTF Binary (.glb)`
- **Include:**
  - Selected Objects: off (export everything in the scene)
  - Custom Properties: off
- **Transform:** `+Y Up` on
- **Data → Mesh:**
  - Apply Modifiers: on
  - UVs, Normals, Tangents: on
  - Attributes → **leave POSITION min/max enabled** (default). The
    validator needs this to check mesh bounds.
- **Data → Material:** Export (default)
- **Data → Shape Keys:** off unless you use them
- **Animation:**
  - Animation: on
  - **Group by NLA Track:** on
  - **Always Sample Animations:** on
  - Export Deformation Bones Only: on

Save to `public/models/<name>.glb`, overwriting the previous version.

## 7. Preview before committing

Drag-and-drop the exported `.glb` into
<https://gltf-viewer.donmccurdy.com/>. Check:

- The character appears at roughly the expected size.
- All four animations are listed in the Animations panel.
- Each animation plays without the mesh exploding or detaching from bones.
- Materials look right under default lighting.

## 8. Run the validator locally

From the repo root:

```
npm run validate:models
```

You should see `OK <your-file>.glb`. If it fails, the error message will
tell you exactly what to fix (missing animation, wrong scale, feet off the
ground, oversized file, etc.).

The same check runs automatically in CI on every pull request that touches
`public/models/**`, and as part of `npm run build`, so a broken asset
**cannot** be deployed.

## 9. Commit and push

Commit **both** the `.blend` source file and the exported `.glb`:

```
git add art/<name>.blend public/models/<name>.glb
git commit -m "art: update <name> mesh and animations"
git push
```

Open a pull request. CI will run the validator again and the engineer
reviewing your PR will see a green ✅ if the asset meets the contract.

## Troubleshooting

| Validator says...                                     | Fix                                                                              |
|-------------------------------------------------------|----------------------------------------------------------------------------------|
| `not a GLB (bad magic)`                               | You exported `.gltf` instead of `.glb`. Re-export with Format = glTF Binary.     |
| `no skinned mesh found`                               | Mesh isn't parented to the armature with weights. Re-do `Ctrl+P → Automatic Weights`. |
| `missing required animation(s) [...]`                 | Action name is wrong (case or typo) or the Fake User shield isn't enabled.       |
| `POSITION accessor missing min/max`                   | You turned off an export option. Reset to defaults.                              |
| `mesh height N outside allowed range`                 | Scale the whole rig in Object Mode, then `Ctrl+A → All Transforms`.              |
| `feet not at origin`                                  | Move the armature so the lowest mesh vertex sits on Z=0, apply transforms, re-export. |
| `file size N MB exceeds limit`                        | Reduce texture resolution or decimate the mesh.                                  |

---

# Option B — Editing a Claude-authored model in Blender

Some characters live in `art/<name>.model.toml` and are compiled to `.glb`
by `scripts/compile-models.mjs`. If you want to take one over:

1. Open the compiled asset: `File → Import → glTF 2.0` on
   `public/models/<name>.glb`. All bones, meshes, and the four actions come
   in intact.
2. Edit freely. Save as `art/<name>.blend`.
3. Export back to `public/models/<name>.glb` using the settings in
   **Option A → section 6**.
4. **Delete `art/<name>.model.toml`** in the same commit. This transfers
   ownership to you; from this point on the `.glb` is authored by hand and
   the compiler will ignore this character.
5. Run `npm run validate:models` and push.

The reverse direction (artist → Claude) is rare, but works the same way:
delete the `.blend`, add a hand-written `.model.toml`, run
`npm run build:models`, commit both the TOML and the regenerated `.glb`.

---

# Authoring a TOML model (Claude path, reference)

Artists can ignore this section. It exists so reviewers can read a TOML
diff without having to cross-reference the schema.

- Top-level keys: `name`, `description`, `bones`, `parts`, `animations`.
- `bones`: at least one, exactly one root (no `parent`). Each bone has a
  `head` position in metres.
- `parts`: each part is either a `sphere` (`radius`, optional per-axis
  `scale`) or a `box` (`size`), with a world-space `pos`, a `#rrggbb`
  `color`, and the `bone` it's skinned to.
- `animations.{idle,attack,hit,death}`: all four required. Each has
  `loop`, `duration`, and an array of `tracks`. Each track targets one
  `bone` and one `path` (`translation` | `rotation` | `scale`) with
  matching `times` (seconds) and `values` arrays. Rotations are
  quaternions `[x, y, z, w]`; everything else is 3-vectors.

Compile with `npm run build:models`. See `art/slime.model.toml` for a
working example.


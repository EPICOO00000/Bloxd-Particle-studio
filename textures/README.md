# Where these pictures come from

The studio uses these pictures only to preview particles. The exported code
never contains a picture: it only names a texture (`texture: "glint"`), and the
game draws its own.

The file names are the 13 texture names the Bloxd Code API accepts
(`api.playParticleEffect`, see <https://bloxd.io/docs/particles>).

## The 12 pictures taken from the game

| File | Size |
|---|---|
| `arrow.png` | 10×10 |
| `bubble.png`, `glint.png`, `scary_face.png`, `soul_0.png` | 16×16 |
| `critical_hit.png`, `drift.png`, `effect_5.png`, `generic_2.png`, `heart.png`, `square_particle.png` | 8×8 |
| `z-particle.png` | 7×7 |

These are the game's own particle pictures, unchanged. Bloxd does not publish
them as separate files: they sit inside the game's JavaScript. They were read
out of three public copies of that JavaScript on GitHub, retrieved on
11 November 2026:

| Repository | Commit | File dated |
|---|---|---|
| `vix-oss/bloxdshaderstest` | `9bfec33` | 31 August 2026 |
| `lowpowermode03-dev/BloxdShaderz` | `6a7c9a6` | 27 August 2026 |
| `tactical-turtle-bloxd/js-deob` | `3921bf1` | 1 September 2026 |

All three copies hold the same 12 pictures, byte for byte. `arrow.png` is also
the same file as `default/textures/arrow.png` in the official
[Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) repository.

Things worth knowing about them:

- Apart from `arrow`, they are white or grey shapes. The game multiplies them
  by the particle colour, and so does the studio.
- Every pixel is either fully solid or fully see-through.
- `generic_2` has four see-through pixels that are white underneath. Blend
  mode 0 ignores see-through, so they show up in that mode. `js/scene.js`
  lists them in `HIDDEN_TEXELS`, and a test checks the list against the file.

## The stand-in: `fishingFishSilhouette.png`

This one is **not** the game's picture. The texture name is newer than every
copy of the game code that could be found, so the real picture was not
available. The file here is a simple 16×16 fish drawn for this project, so that
the texture has something to show. The studio marks it with a `~`.

The exported name is still the official `fishingFishSilhouette`, so the game
shows its real picture. Only the preview differs. To fix the preview, replace
this file with the real picture (any small square PNG, white on see-through)
and remove the name from `PLACEHOLDER_TEXTURES` in `js/scene.js`.

## `ui/code_block.png`

The side of the code block shown in the middle of the 3D view. Unchanged from
`default/textures/code_block.png` in
[Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs),
commit `2e793bc` (9 November 2026).

## Rights

Everything in this folder except `fishingFishSilhouette.png` is Bloxd artwork.
It is not covered by this repository's Apache licence, and neither source
states a licence for it. It is included so that a fan tool can preview the
game's particles. Being publicly reachable does not mean it may be freely
reused, so check before using these files for anything else.

Bloxd Particle Studio is an unofficial fan project. It is not made, approved or
supported by Bloxd.

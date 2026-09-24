# Coach Kai Visual Demonstration Pipeline — Asset Production Specification

> **Phase 9.1 Status**: `ARCHITECTURE READY — VISUAL ASSETS NOT YET FINALIZED`  
> **Active Resolution Tier**: Tier 3 (Procedural Biomechanical SVG Fallback)  
> **All Pilot Assets Decision Gate Status**: `NEEDS_ASSET`

This document defines the production standards for rendering and deploying real visual assets for the 8 pilot exercises featuring **Coach Kai**, the fictional digital movement specialist for Kinetix.

---

## 1. Character Identity & Visual Consistency Standards

Coach Kai is an original, fictional digital coach designed specifically for biomechanical education.

| Parameter | Specification |
|---|---|
| **Identity / coachId** | `coach-kai` |
| **Name** | Coach Kai |
| **Presentation** | Athletic-neutral, minimalist technical presentation |
| **Visual Age** | 28–32 years |
| **Build & Proportions** | Balanced athletic build, natural human joint mechanics (no distortion) |
| **Apparel** | Matte Charcoal compression top and tights with Ember Red (`#FF542E`) seam piping |
| **Footwear** | Minimalist zero-drop black athletic shoes with amber sole accents |
| **Accessories** | None (bare wrists and neck to prevent visual distraction during joint movement) |
| **Studio Setting** | Dark minimalist graphite radial gradient (`#1A1A1E` at center to `#0E0E10` at perimeter) |
| **Lighting** | Three-point rim lighting with high contrast on active muscular insertions |
| **Camera Language** | 16:9 widescreen, fixed camera height 1.1m (athlete center of mass), 3.2m distance |

---

## 2. Technical Asset Delivery Requirements

For each of the 8 pilot exercises, the following 3 files must be rendered and placed in `assets/media/coach-kai/`:

### A. Video Asset (`.mp4`)
- **Format**: `video/mp4`
- **Codec**: H.264 (`avc1.4D401F`, High Profile Level 4.1)
- **Container**: MP4 (FastStart / `moov` atom at front of file)
- **Resolution**: 1920 × 1080 (1080p, 16:9 widescreen)
- **Framerate**: 60 fps (constant frame rate)
- **Color Space**: BT.709, YUV 4:2:0
- **Audio**: **NONE** (strictly no audio track to eliminate autoplay blocking and reduce payload)
- **Target Bitrate**: ≤ 2,500 kbps (CRF 22)
- **Target File Size**: 700 KB – 1,500 KB per exercise loop

### B. Poster Asset (`-poster.webp`)
- **Format**: WebP (`image/webp`)
- **Resolution**: 1920 × 1080 (16:9 widescreen)
- **Quality**: 85%
- **Target File Size**: 50 KB – 90 KB

### C. Library Thumbnail (`-thumb.webp`)
- **Format**: WebP (`image/webp`)
- **Resolution**: 256 × 256 (1:1 square crop centered on athlete)
- **Quality**: 80%
- **Target File Size**: 10 KB – 18 KB

---

## 3. The 8 Pilot Exercises & Demonstration Cues

| # | Exercise ID | Pattern | Target File | Keyframe Inflection | Primary Form Cue |
|---|---|---|---|---|---|
| 1 | `air-squat` | Squat | `air-squat.mp4` | 3.0s (crease below patella) | Track knees over middle toes; proud chest |
| 2 | `push-up` | Horizontal Push | `push-up.mp4` | 2.0s (chest hovers 1–2" floor) | Screw hands into ground; 45° tucked elbows |
| 3 | `pull-up` | Vertical Pull | `pull-up.mp4` | 2.0s (chin clears bar) | Drive elbows into back pockets; no kipping |
| 4 | `romanian-deadlift` | Hinge | `romanian-deadlift.mp4` | 3.0s (mid-shin barbell height) | Horizontal hip travel; brush thighs with bar |
| 5 | `walking-lunge` | Lunge | `walking-lunge.mp4` | 2.0s (rear knee 1" off floor) | Upright torso; 90° angles on both knees |
| 6 | `bicep-curl` | Isolation | `bicep-curl.mp4` | 1.8s (peak contraction) | Pin elbows to ribs; zero torso swing |
| 7 | `forearm-plank` | Core | `forearm-plank.mp4` | 2.0s (isometric peak) | Pull elbows to toes; active neutral spine |
| 8 | `jumping-jack` | Timed / Cardio | `jumping-jack.mp4` | 1.2s (overhead clap) | Soft landing on balls of feet; absorb impact |

---

## 4. Multi-Tier Resolution Chain Architecture

The Kinetix engine implements an automatic, fail-safe 4-tier resolution chain:

```
Tier 1: Coach Kai Motion Video (assets/media/coach-kai/<id>.mp4)
       ↓ (if 404, network error, or unsupported codec)
Tier 2: High-Resolution Poster (assets/media/coach-kai/<id>-poster.webp)
       ↓ (if poster fails to load or not on disk)
Tier 3: Procedural Biomechanical SVG Diagram (getBiomechanicalIllustration)
       ↓ (if browser SVG rendering encounters an exception)
Tier 4: Fail-Safe Base Structural Fallback
```

Under **no circumstances** does a missing media file interrupt:
- Workout session state machine
- Set completion & rep progression
- Rest timer countdown
- Performance data logging (PRs, weight, volume)
- Workout completion history recording

---

## 5. Provenance & Security Compliance

- **Creator**: Kinetix Digital Motion Lab
- **License**: Proprietary Kinetix Commercial Motion Asset
- **Commercial Use**: Certified True (`commercialUse: true`)
- **No Third-Party Scraping**: No YouTube, Vimeo, Instagram, or unlicensed stock footage allowed.
- **Sanitization**: All media URLs are passed through `sanitizeMediaUrl()`, enforcing strict protocol whitelists (`assets/`, `https://`, `images/`) and rejecting `javascript:`, data URIs, or arbitrary external domains.

# Default sound effects

Bundled classroom UI sound effects. Most files are from [Mixkit](https://mixkit.co/free-sound-effects/) under the **Mixkit Sound Effects Free License**; Duck Race ambient quack is a verified **CC0** natural duck recording (see below).

Playback is wired via `src/utils/sounds.ts` and respects `appSettings.soundEnabled` (default `true`).

`SoundInit` in `src/app/layout.tsx` calls `initSoundSystem()` on mount: preloads WAVs as **blob URLs** (explicit `audio/wav` MIME — needed for Tauri/WebView2 `asset:` URLs) and unlocks HTML audio on the first pointer/keyboard gesture so delayed SFX (wheel, recognition overlay) can play.

## License summary

Bundled UI cues are from [Mixkit](https://mixkit.co/free-sound-effects/) under the **Mixkit Sound Effects Free License**, except where a row below notes another license.

| Item | Detail |
|---|---|
| Mixkit License | [Mixkit Sound Effects Free License](https://mixkit.co/license/) |
| Duck Race `quack.wav` | [Creative Commons CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) — [DigPro120 / Freesound 558858](https://freesound.org/people/DigPro120/sounds/558858/) |
| Commercial use | Allowed for these bundled assets |
| Attribution | Not required for Mixkit or CC0 (appreciated by authors) |
| Redistribution | Do **not** sell or redistribute these files as a standalone SFX pack |
| Verification | Mixkit files from official download pages; Freesound CC0 verified on the sound page before bundling |

## Format note

Mixkit’s official download serves **WAV** (not MP3). Files are stored as `.wav` under `public/sounds/`. HTML `Audio` and Tauri static export both support WAV.

Future app paths: `/sounds/click.wav`, etc.

## Bundled assets

| Filename | Title | ID / license | Source | Duration | Intended event(s) |
|---|---|---|---|---|---|
| `click.wav` | Cool interface click tone | Mixkit 2568 | https://mixkit.co/free-sound-effects/download/2568/ | 0:01 | Generic UI click; Duck Race countdown (3/2/1) |
| `success.wav` | Instant win | Mixkit 2021 | https://mixkit.co/free-sound-effects/download/2021/ | 0:01 | Success; Duck Race start; alias: `points-added`, `correct-answer` |
| `wrong-answer.wav` | Negative tone interface tap | Mixkit 2569 | https://mixkit.co/free-sound-effects/download/2569/ | 0:01 | Wrong / failed answer (gentle, not a buzzer) |
| `wheel-tick.wav` | Game click | Mixkit 1114 | https://mixkit.co/free-sound-effects/download/1114/ | 0:01 | Lucky Wheel and Points Wheel tick during spin |
| `wheel-result.wav` | Melodic bonus collect | Mixkit 1938 | https://mixkit.co/free-sound-effects/download/1938/ | 0:02 | Lucky Wheel and Points Wheel result; Duck Race finish |
| `recognition.wav` | Achievement bell | Mixkit 600 | https://mixkit.co/free-sound-effects/download/600/ | 0:02 | Recognition ceremony; alias: `badge-awarded` |
| `applause.wav` | Animated small group applause | Mixkit 523 | https://mixkit.co/free-sound-effects/download/523/ | 0:04 | Recognition / ceremony; Duck Race winner celebration |
| `quack.wav` | Duck quacking.mp3 | Freesound 558858 / CC0 | https://freesound.org/people/DigPro120/sounds/558858/ | 0:01.75 | Duck Race ambient quack (volume 0.22) |

Category browse pages used during selection:

- Interface: https://mixkit.co/free-sound-effects/interface/
- Win: https://mixkit.co/free-sound-effects/win/
- Click: https://mixkit.co/free-sound-effects/click/
- Slot machine: https://mixkit.co/free-sound-effects/slot-machine/
- Applause: https://mixkit.co/free-sound-effects/applause/
- Duck vocalization (CC0): https://freesound.org/people/DigPro120/sounds/558858/

## Deferred filenames (aliases only)

These names are **not** separate files in v1. Map them to an bundled asset when wiring playback:

| Planned name | Use instead |
|---|---|
| `points-added.mp3` | `success.wav` |
| `correct-answer.mp3` | `success.wav` |
| `badge-awarded.mp3` | `recognition.wav` |
| `card-flip.mp3` | *(deferred — no bundled file yet)* |

## Rejected during curation

Skipped titles that were too loud, long, or off-tone for a classroom app: slot-machine alarms/sirens, stadium crowd beds, cartoon/character voices, weapon clicks, Mixkit rubber-duck toy squeaks (not a real quack).

## Adding more sounds

1. Confirm a commercial-friendly license (Mixkit Free License or verified CC0; avoid NC licenses).
2. Download from the official source only; document the page + license in this file.
3. Prefer short WAV (≈0.3–2s) that matches the intended classroom tone.
4. Do not use YouTube, TikTok, or unverified scrapes.

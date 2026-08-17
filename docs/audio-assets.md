# Default sound effects

Bundled classroom UI sound effects for future playback (not wired yet). All files are downloaded from [Mixkit](https://mixkit.co/free-sound-effects/) under the **Mixkit Sound Effects Free License**.

## License summary

| Item | Detail |
|---|---|
| License | [Mixkit Sound Effects Free License](https://mixkit.co/license/) |
| Commercial use | Allowed in this application |
| Attribution | Not required (appreciated by Mixkit) |
| Redistribution | Do **not** sell or redistribute these files as a standalone SFX pack |
| Verification | Each file was taken from an official Mixkit download page (`/free-sound-effects/download/{id}/`) before bundling |

Full license text: open **Sound Effects Free License** on [mixkit.co/license](https://mixkit.co/license/).

## Format note

Mixkit’s official download serves **WAV** (not MP3). Files are stored as `.wav` under `public/sounds/`. HTML `Audio` and Tauri static export both support WAV.

Future app paths: `/sounds/click.wav`, etc.

## Bundled assets

| Filename | Mixkit title | Mixkit ID | Source (download page) | Duration (Mixkit listing) | Intended event(s) |
|---|---|---:|---|---|---|
| `click.wav` | Cool interface click tone | 2568 | https://mixkit.co/free-sound-effects/download/2568/ | 0:01 | Generic UI click |
| `success.wav` | Instant win | 2021 | https://mixkit.co/free-sound-effects/download/2021/ | 0:01 | Success; alias: `points-added`, `correct-answer` |
| `wrong-answer.wav` | Negative tone interface tap | 2569 | https://mixkit.co/free-sound-effects/download/2569/ | 0:01 | Wrong / failed answer (gentle, not a buzzer) |
| `wheel-tick.wav` | Game click | 1114 | https://mixkit.co/free-sound-effects/download/1114/ | 0:01 | Lucky Wheel tick during spin |
| `wheel-result.wav` | Melodic bonus collect | 1938 | https://mixkit.co/free-sound-effects/download/1938/ | 0:02 | Lucky Wheel result (exciting, not a siren) |
| `recognition.wav` | Achievement bell | 600 | https://mixkit.co/free-sound-effects/download/600/ | 0:02 | Recognition ceremony; alias: `badge-awarded` |
| `applause.wav` | Animated small group applause | 523 | https://mixkit.co/free-sound-effects/download/523/ | 0:04 | Recognition / ceremony applause sting |

Category browse pages used during selection:

- Interface: https://mixkit.co/free-sound-effects/interface/
- Win: https://mixkit.co/free-sound-effects/win/
- Click: https://mixkit.co/free-sound-effects/click/
- Slot machine: https://mixkit.co/free-sound-effects/slot-machine/
- Applause: https://mixkit.co/free-sound-effects/applause/

## Deferred filenames (aliases only)

These names are **not** separate files in v1. Map them to an bundled asset when wiring playback:

| Planned name | Use instead |
|---|---|
| `points-added.mp3` | `success.wav` |
| `correct-answer.mp3` | `success.wav` |
| `badge-awarded.mp3` | `recognition.wav` |
| `card-flip.mp3` | *(deferred — no bundled file yet)* |

## Rejected during curation

Skipped Mixkit titles that were too loud, long, or off-tone for a classroom app: slot-machine alarms/sirens, stadium crowd beds, cartoon/character voices, weapon clicks.

## Adding more sounds

1. Confirm **Sound Effects Free License** on the Mixkit item page.
2. Download from the official Mixkit download page only.
3. Add a row to this file before committing the binary.
4. Do not use YouTube, TikTok, Freesound (unless license verified), or unverified sources.

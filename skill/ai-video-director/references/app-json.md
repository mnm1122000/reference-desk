# Reference Desk import JSON

The app at https://mnm1122000.github.io/reference-desk/ imports this JSON on the Story step ("Paste the answer") or the Shotlist step. Names must match exactly between assets and shots.

```json
{
  "project": { "title": "", "logline": "", "format": "", "length": "", "mood": "", "palette": "", "aspect": "16:9|9:16|4:5|1:1", "language": "" },
  "characters": [ { "name": "", "role": "main|secondary", "age": "", "gender": "", "ethnicity": "", "height": "", "build": "", "faceShape": "", "eyes": "", "hair": "", "features": "", "details": "", "outfit": "", "outfit2": "", "emotion": "", "voice": "", "want": "" } ],
  "places": [ { "name": "", "kind": "interior|exterior", "description": "", "time": "", "lightSource": "", "lightDir": "", "mainArea": "", "materials": "", "livedIn": "", "weather": "", "variant": "", "layout": "" } ],
  "props": [ { "name": "", "what": "", "size": "", "materials": "", "colors": "", "logoText": "", "detail": "", "wearable": "yes|no", "usage": "", "scaleObject": "", "surface": "" } ],
  "shots": [ { "code": "SC01_SH01", "scene": "SC01", "type": "action|dialogue|broll|transition", "style": "comedy|premium", "speed": "real|slow", "outfit": "main|second", "duration": 5, "screen": 2.5, "size": "WS|MS|MCU|CU|ECU|Insert", "angle": "", "lens": "50mm", "aperture": "2", "move": "", "characters": ["name"], "place": "name", "props": ["name"], "meme": "", "moment": "", "blocking": "", "beats": "0-2s: ...", "acting": "", "physics": "", "light": "", "speaker": "", "line": "", "delivery": "", "audio": "", "onscreen": "", "vo": "", "sfx": "", "music": "", "edit": "", "transition": "" } ]
}
```

- `duration` is the clip length to generate. `screen` is the seconds used in the edit.
- `outfit: "second"` switches the shot to the character's second look (outfit2).
- `acting` holds the acting task: direction, motive, goal, obstacle, tactic.
- Text, captions and CTAs go in `onscreen` or `edit`, never in `moment`.
- Unknown product facts are written as [VERIFY: ...].

# Shot and scene prompts

Two generations per shot: a **start frame** (image), then the **clip** (image-to-video). Strong video models (Seedance 2.5, Kling 3, Veo) can also do a **multi-segment clip**: several cuts inside one 10 to 30 s generation, which keeps the voice and continuity consistent across a dialogue exchange.

## Start-frame prompt (image)
- Name each attached image with its role: "Image 1 (@Lucy): face, hair and outfit 100% match."
- Location lock: "the exact room from Image 3, unchanged."
- A composition reference (storyboard panel or meme) is used for **composition only**: copy the framing, poses and placement, never its people, text or style.
- Moment, blocking in x/y screen %, shot size, angle, lens, light, and the film look.
- No text. Aspect ratio. For vertical 9:16, keep faces and the product in the central safe area.

## Clip spec prompt (labelled blocks)

```
SCENE CONTEXT
One paragraph: where, who, what happens, the emotional turn.

ACTIVE REFERENCES
@Image 1: LOCATION LOCK, the exact room, unchanged.
@Image 2 NAME: age, role, accent; where they are and their pose; personality in one line; "face, hair and outfit 100% match the reference".
(For extras: who is who, by position and clothing; who is NEVER in a given place.)

LOCATION MAP (compass as in Image 1)
What is on each wall; where everyone is; distances; the camera side rule; who is screen-left and screen-right; gaze directions.

FIRST FRAME AND SPATIAL BLOCKING
Exact positions as x/y %, everything already in place.

FORMAT MODE
Duration, number of segments, cut types (HARD CUT, MATCH CUT, REVERSE CUT), speed per segment (real-time, or 30% slow motion), dialogue clip or not, aspect ratio.

OPTICS
Per setup: field of view or lens character (84 degrees wide, 47 degrees normal, 29 degrees short telephoto), camera distance and height, what is sharp, what blooms or blurs. Lens lock for repeated setups.

CAMERA
Locked-off tripod with a level horizon, or handheld with breathing sway, or a Steadicam follow at walking pace. Repeated setups return to the identical frame.

ACTION TIMING
Time-coded beats per segment, with dialogue placed in timing windows:
0.0s to 2.2s: WIDE. ...
2.2s HARD CUT
2.2s to 3.8s: CLOSE-UP. ... "Line." (2.5s to 3.5s)

ACTING TASK (per character)
DIRECTION / MOTIVE / GOAL / OBSTACLE / TACTIC. Spell out the physical movement.

PHYSICS
Weight, balance, cloth, hair, paper, liquids, props behaving like real objects, and what stays where it was left.

LIGHTING
"Exactly the light of Image 1", then the named sources, the direction, the bounce, rim light on faces, exposed for skin, highlights allowed to bloom.

AUDIO
Room tone and specific foley. Voices: accent described sound by sound, volume and energy per line. Only the quoted lines are spoken; listeners' mouths stay closed. No music: the score is added in the edit.

POSITIVE LOCKS
What must never change: the room, faces and outfits, who stays where, who never speaks, who leaves when, props that stay moved. "Clean picture without on-screen text."

LOOK
Film stock and era (for example Kodak Vision2 or Vision3 grain, warm-timed print), lifted blacks, diffusion glow, rectilinear lenses, shallow depth of field with round bokeh, real 24 fps motion blur, "fully photoreal live action".
```

## Pacing rules inside clips
- **Speech rides on top of action.** Every line begins while its movement is still happening. No dead air, no gesture-then-pause-then-talk.
- **Change the shot size at every cut.**
- Repeated actions (one model after another) get **match cuts** in an identical frame. This creates rhythm and comedy.
- **Build anticipation before a big entrance**: show feet, hands or a back first, in slow motion, silent; then reveal the face.
- Keep the listener's face visible. Don't let key reactions turn away from camera.
- Slow motion is for emotional peaks (a fall, hair falling loose, glasses flying). Everything else is real-time.

## Camera language cheatsheet
- 84 degrees (about 24mm), wide: establishing shots and space.
- 47 degrees (about 50mm), normal: wides and two-shots with natural proportions.
- 29 degrees (about 85mm), short telephoto: close-ups, compression, bokeh.
- Height: seated eye level for seated characters; 0.6 to 0.8 m for floor action; hip height looking up to make someone tower.
- Moves: locked-off for drama and comedy timing; handheld for chaos; slider or dolly for product; Steadicam follow for entrances.

## Anti-slop guards (add to every prompt)
- Identity lock, real skin texture, five fingers, an exact logo.
- A real light source; no flat front light.
- A handheld camera that is never gimbal-floaty (unless it's a premium product move).
- Real-time speed unless slow motion is intended.
- Nothing pops in. The first frame already has everyone in place.
- No text, subtitles, watermarks or morphing.

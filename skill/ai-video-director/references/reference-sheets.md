# Reference sheets (characters, places, props)

## Characters: face, then outfit, then details, then the sheet

### Step 1: Face portrait (@NameFace)
Generate about 6 single-face portrait options and pick one. Reject washed-out faces, plastic skin and symmetrical "AI faces". Describe:
- Age, heritage, face structure (cheekbones, jaw, brows, nose, lips), skin with real texture (pores, freckles, fine lines), and hair colour, texture and style.
- A straight-on, tightly framed head-and-shoulders shot with a direct gaze and a neutral expression.
- One large diffused softbox at 45 degrees and slightly above, with fill two stops down. Gentle shadow under the nose and jaw, no harsh highlights.
- A plain neutral background, softly out of focus.
- A camera and lens (for example 105mm, f/4, about 3 m away), plus the film or era look of the world (for example early-2000s film grain). The world's look starts here, so the character belongs to the show.
- Optional: hex values for the palette.

### Step 2: Outfit reference (@NameOutfit)
Show the outfit only: shoulders to feet, **face out of frame** (crop below the nose or at the shoulders), against a plain wall. Hands empty, no bag, cards or props. Name every garment with colour, fabric, fit and length, plus the shoes. Use bright flash or even light so the fabrics read. You can also upload a real outfit photo and say which details to keep.

### Step 3: Detail close-ups
Make separate close-ups for anything small that must be exact: jewellery, glasses, a watch, rings, a logo on clothing, nails. Attach them with the face and outfit when you build the sheet.

### Step 4: The character sheet (@Name)
Combine the face, outfit and details with a reference-strong image model (GPT Image, Nano Banana, Seedream). The rules:
1. **Plain mid-grey seamless background**, cool or neutral (about #808080 to #8D8F91), never white or black. Grey reads best for the model, and nothing competes with the character.
2. **Three views in one 16:9 image**: full-body front and full-body back side by side in the left half, and one large head-and-shoulders portrait filling the right half. One continuous backdrop, with no gutters, borders, text or frames.
3. **Erase the face on the full-body front view**: a smooth, blank, softly blurred oval in a muted skin tone or neutral grey, with no eyes, nose or mouth. The hair stays visible around it. The portrait is the only face reference, so the video model can't take a different face from the small figure.
4. Neutral standing pose, weight even, arms relaxed, **hands open and empty**. The back view is the same stance turned 180 degrees.
5. Even, soft frontal light with gentle falloff and a soft contact shadow under the feet. No studio equipment visible anywhere.
6. Camera: the full-body panels at eye level with a normal lens about 3 m away. The portrait with a short telephoto at eye level.
7. Body facts: height in cm, build, neck length, head-to-body ratio. The same proportions in all panels.
8. Keep the colour grade of the world (for example the faded early-2000s film look of the outfit reference).
9. Say what to ignore in each reference ("take only the clothing from Image 2; ignore the bag, cards and props").

### Variants (@NameV2)
Edit the existing sheet: "let her hair down below the shoulders and remove her glasses; keep the face, outfit, proportions, grey backdrop and layout, with the face still erased on the front view." Never regenerate from scratch.

### Crowds and extras (@Models)
Generate the whole group in one image (different faces, skin tones, hair and poses, a shared dress code such as all in black), and use it for every scene with that crowd. In prompts, identify each one by position and clothing ("fourth standing figure from the left, black strapless romper"). Make sure no extra shares a face or outfit with a main character.

## Places (@Location)

- Describe the room as a working set: what must be in it for the story (a table for him, a clear path for the models, an entrance for her), materials, period details, clutter in the corners, windows and practical lights, and a palette.
- Generate it **empty**, at **eye level and a three-quarter angle**, with a normal lens and straight verticals, so the whole layout reads in one frame. A straight-on frame looks pretty, but on other angles the model has to guess the rest of the room.
- Fix the light: time of day, direction, and the mix of sources (for example warm low sun through west windows plus tungsten).
- Make a **layout map with a compass**: what is on each wall (N/E/S/W), where each character sits or stands, the distances (the mark is 4 m north of him), and where each camera stands. Keep all cameras on one side of the action line, and state who is screen-left and who is screen-right.
- A one-shot location doesn't need its own sheet. Use an existing location "for visual style only" and describe the new space in the prompt.

## Props and products (@Product)

- Use a 6-view sheet on the same grey: front, 3/4, side, back, top and a macro of the key detail. Exact logo spelling, materials (glass refraction, metal reflection), and the real size.
- A scale sheet: in a hand, in use, and next to an everyday object.
- A hero pack shot for the end card.
- Use GPT Image for logos and lettering. Check the label letter by letter.

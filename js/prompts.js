/* Reference Desk - prompt engine.
   Every builder returns { id, tag, title, note, attach:[{label, img}], text }.
   Empty fields become [PLACEHOLDERS] so you can see what is still missing. */
(function () {
  const t = (v) => (v == null ? '' : String(v)).trim();
  const F = (v, ph) => t(v) || `[${ph}]`;
  const L = (...a) => a.flat(Infinity).filter((x) => x !== null && x !== undefined && x !== false && x !== '').join('\n');
  const GREY = 'seamless mid-grey studio background (#808080, 18% grey, flat, no gradient)';

  /* ---------- Quality guards (the 07 FIX rules, built into every prompt) ---------- */
  const G = {
    person: [
      'Identity lock: the face matches the reference exactly. Same eye shape, nose, lips, jawline, skin tone, freckles, moles and hairline. Do not beautify, slim, de-age or "improve" the face.',
      'Skin: unretouched photographic skin. Visible pores, fine lines, slight redness around the nose and cheeks, peach fuzz catching the light, tiny natural blemishes, faint oil sheen on the forehead. No airbrushing, no makeup glow, no waxy or plastic surface.',
      'Hands: anatomically correct, five fingers each, natural knuckles, nails and skin creases. Hands stay relaxed and empty unless told otherwise.',
      'Photographic honesty: slight lens imperfections, natural light falloff, gentle halation on highlights, true-to-life and slightly muted color. No HDR, no glow, no oversharpening.',
      'Never: a different face between panels, extra or merged fingers, warped limbs, text, labels, logos, watermark, CGI, 3D-render or illustration look, perfect doll symmetry.'
    ],
    place: [
      'Layout lock: architecture, furniture, materials and colors match the reference exactly. Nothing is added, removed or moved.',
      'Light logic: every lit area has a visible, believable source. Light direction, color temperature and shadow softness stay identical across all views.',
      'Geometry: straight lines stay straight, verticals stay vertical. No fisheye bending, no melted, fused or duplicated furniture.',
      'Lived-in realism: small real-world mess such as dust in the light, scuffs, creases, fingerprints on glass and uneven wear. Slightly muted natural color, fine film grain.',
      'Never: people, gibberish lettering on signs, floating objects, showroom-perfect CGI cleanliness, oversaturated HDR.'
    ],
    prop: (logo) => [
      `Product lock: an identical replica with the same shape, proportions, colors, material finish, logo and label layout${t(logo) ? `. Label text is spelled exactly "${t(logo)}"` : ''}. Never redesign, simplify or invent parts.`,
      'Materials read correctly: glass refracts and shows thickness, metal reflects its surroundings, matte stays matte, leather shows grain.',
      'Scale: true real-world size relative to hands and surroundings.',
      'Micro realism: faint dust, subtle fingerprints on gloss, natural material grain, manufacturing seams.',
      'Never: warped, melted or misspelled lettering, a changed logo, extra parts, floating, CGI gloss, fake glow.'
    ],
    frame: (logo) => [
      'Identity lock: every person matches their character reference exactly (face, hair, skin tone, outfit). No beautifying, no face blending between characters.',
      'Skin and hands: real pores and fine lines, no airbrush. Five fingers per hand, realistic grip with slight skin compression where fingers press.',
      `Product lock: the product matches its reference exactly${t(logo) ? `, with label text "${t(logo)}" spelled correctly` : ''}, at correct real-world scale, lit by the same light as the scene.`,
      'Light match: key light direction, color temperature and shadow softness are consistent with the location reference. No flat front light, no unmotivated glow.',
      'Not too clean: small real-world mess, natural light falloff, soft lens corners, fine film grain, slightly muted color.',
      'Never: different faces, changed logo, extra fingers, plastic skin, HDR, glowing edges, perfect symmetry, text, watermark.'
    ],
    video: [
      'Camera: operated by a person. Subtle handheld breathing sway. Never gimbal-smooth floating, never digital jitter.',
      'Speed: real-time. No slow motion, no speed ramps.',
      'Identity lock: face, hair, outfit and product are identical in the first, middle and last frame. No morphing at any point, especially at the start and end of the shot.',
      'Action discipline: perform only the timed actions listed. No extra gestures, no random head turns, nobody walks out of frame.',
      'Product: label and logo stay rigid and never warp, melt, blur into gibberish or change.',
      'Hands: five fingers at all times, a real grip with weight.',
      'First frame: starts exactly on the provided image with everything already in place. Nothing pops in or appears.',
      'Physics: real weight, gravity and inertia. Cloth and hair react to movement and air.',
      'Never: cuts, transitions, on-screen text, subtitles, watermark, glow, morphing, melting objects.'
    ],
    dialogue: [
      'Lip-sync: mouth shapes match every syllable. Teeth and tongue stay consistent, the jaw moves naturally, and there is no mouth movement outside the spoken words.',
      'Only the named speaker talks. Any listener keeps their mouth closed.',
      'The face stays lit and in focus, and the head stays between front and three-quarter angle.',
      'Performance is understated and human: a breath before speaking, natural blinks, micro head movements. No exaggerated acting.'
    ]
  };

  function guards(S, ...sets) {
    if (S.settings.guards === false) return '';
    const items = sets.flat();
    return '\nQUALITY GUARDS (must follow):\n' + items.map((x) => '- ' + x).join('\n');
  }

  const film = (S) => t(S.settings.film) || 'Kodak Vision3 250D';
  const aspect = (S) => t(S.settings.aspect) || '16:9';

  /* ---------- image reference helpers ---------- */
  function attachList(items) {
    // items: [{label, img}] -> numbered
    return items.filter(Boolean).map((x, i) => ({ n: i + 1, label: x.label, img: x.img || null }));
  }
  const ref = (asset) => (asset && (asset.sheet || (asset.photos || [])[0])) || null;

  /* ================= CHARACTER ================= */
  function charDesc(c) {
    return `${F(c.age, 'AGE')}-year-old ${F(c.ethnicity, 'ETHNICITY')} ${F(c.gender, 'GENDER')}, ${F(c.height, 'HEIGHT')}, ${F(c.build, 'BUILD')} build`;
  }
  function charFace(c) {
    return L(
      `Face: ${F(c.faceShape, 'FACE SHAPE')} face, ${F(c.eyes, 'EYE COLOR AND SHAPE')} eyes${t(c.features) ? ', ' + t(c.features) : ''}.`,
      `Hair: ${F(c.hair, 'HAIR COLOR, LENGTH, TEXTURE, STYLE')}.`
    );
  }

  function character(c, S, all) {
    const name = F(c.name, 'NAME');
    const photos = c.photos || [];
    const others = (all || []).filter((x) => x.id !== c.id && t(x.name));
    const out = [];

    out.push({
      id: 'C0', tag: 'C0', title: 'Base portrait (only if you have no photo)',
      note: 'Skip this if you already uploaded a real face photo. Otherwise, generate this first and save the best result as this character\'s source photo.',
      attach: [],
      text: L(
        `Photorealistic head-and-shoulders portrait of ${name}, a ${charDesc(c)}.`,
        charFace(c),
        'Expression: neutral and relaxed, mouth closed, looking straight into the lens.',
        'Wearing a plain charcoal crew-neck t-shirt.',
        `Background: ${GREY}, evenly lit.`,
        'Lighting: large soft key light from camera-left at 45 degrees, gentle fill from the right, soft natural shadows under the chin and nose.',
        'Camera: 85mm lens, f/4, eye level, 1.5 m away, sharp focus on the eyes.',
        'Aspect ratio: 4:5.',
        guards(S, G.person)
      )
    });

    const a1 = attachList([
      { label: 'Face photo (front, clear)', img: photos[0] },
      photos[1] ? { label: 'Full body / outfit photo', img: photos[1] } : null
    ]);
    out.push({
      id: 'C1', tag: 'C1', title: 'Master character sheet (3 panels)', required: true,
      note: 'The most important image in the project. Generate 2 to 4 versions, keep the best one and upload it below as the finished sheet.',
      attach: a1,
      text: L(
        `Create a professional character reference sheet of the exact same person shown in Image 1${photos[1] ? ', wearing the outfit from Image 2' : ''}.`,
        `Character: ${name}, a ${charDesc(c)}.`,
        charFace(c),
        `Outfit: ${F(c.outfit, 'OUTFIT: TOP, BOTTOM, SHOES, ACCESSORIES WITH COLORS AND MATERIALS')}.`,
        'Preserve their identity exactly. Do not beautify or change the face.',
        ' ',
        `Layout: one single wide image (16:9) split into 3 clean side-by-side panels, all on the same ${GREY}. Even spacing, no borders, no text, no labels.`,
        'Panel 1 (left): FRONT FACE CLOSE-UP. Head and shoulders, straight-on, neutral expression, mouth closed, eyes to the lens. 85mm look, sharp eyes, skin pores and hair strands.',
        'Panel 2 (center): FRONT FULL BODY. Head to toe, relaxed neutral A-pose, arms slightly away from the body, hands open and empty, feet shoulder-width apart. Shoes fully visible.',
        'Panel 3 (right): BACK FULL BODY. Same person, head to toe, facing directly away from the camera, same pose, showing the back of the hairstyle, clothing and shoes.',
        ' ',
        'Lighting: identical in all panels. Soft even studio light from a large softbox front-left, gentle fill, soft contact shadow under the feet. Neutral white balance.',
        'Camera: full-frame, 50mm for the full-body panels, f/8 so everything is sharp, eye level, no distortion.',
        'Realism: fabric shows creases, seams, stitching and weave. Natural hair with flyaways.',
        'Consistency: same person, same outfit, same proportions and same height in every panel.',
        c.role === 'secondary' && others.length ? `This person must look clearly different from ${others.map((o) => o.name).join(', ')}.` : '',
        guards(S, G.person)
      )
    });

    const sheetRef = attachList([{ label: 'Finished C1 master sheet', img: c.sheet }]);
    out.push({
      id: 'C2', tag: 'C2', title: 'Turnaround sheet (5 angles)',
      note: 'Recommended when the camera moves around the character or there is action.',
      attach: sheetRef,
      text: L(
        `Using the exact character from Image 1 (${name}: same face, hair, body proportions and outfit), create a full-body turnaround reference sheet.`,
        `Layout: one wide image, 5 panels in a single row, ${GREY}, same scale and same floor line in every panel, no text.`,
        'Panel 1: front view, 0 degrees.',
        'Panel 2: three-quarter front, turned 45 degrees to the right.',
        'Panel 3: side profile, 90 degrees, facing right.',
        'Panel 4: three-quarter back, 135 degrees.',
        'Panel 5: back view, 180 degrees.',
        'Pose: identical relaxed A-pose in all panels, hands empty, neutral expression.',
        'Lighting: identical soft even studio light, soft contact shadows, neutral color.',
        'Camera: eye level, 50mm, f/8, no perspective distortion, whole body in frame with small margins.',
        guards(S, G.person)
      )
    });

    out.push({
      id: 'C3', tag: 'C3', title: 'Expression and face-angle sheet (3x3)',
      note: 'Needed for dialogue, close-ups and emotional beats.',
      attach: sheetRef,
      text: L(
        `Create a facial reference sheet of the exact same person from Image 1 (${name}). Identity, skin texture, hairstyle and hair color stay identical.`,
        `Layout: a 3x3 grid of head-and-shoulders close-ups, ${GREY}, identical soft studio lighting in every cell, no text, no borders.`,
        'Row 1 (neutral): left profile 90 degrees / three-quarter left 45 degrees / front.',
        'Row 2 (neutral): three-quarter right 45 degrees / right profile 90 degrees / looking slightly down, head tilted.',
        `Row 3 (front, expressions): genuine smile with teeth and eye crinkles / mid-sentence, mouth half open / ${F(c.emotion, 'KEY EMOTION IN THE STORY')}.`,
        'Camera: 85mm, f/5.6, eye level, sharp eyes.',
        'Expressions are natural, with real muscle movement and wrinkles. Nothing cartoonish.',
        guards(S, G.person)
      )
    });

    out.push({
      id: 'C4', tag: 'C4', title: 'Outfit variant sheet',
      note: t(c.outfit2) ? 'Use this when the character changes clothes in the story.' : 'Fill in "Second outfit" to use this prompt.',
      attach: attachList([{ label: 'Finished C1 master sheet', img: c.sheet }, { label: 'New outfit photo (optional)', img: null }]),
      text: L(
        `Keep the exact same person from Image 1 (${name}): identical face, hair, skin tone, body shape and height.`,
        `Change ONLY the clothing to: ${F(c.outfit2, 'SECOND OUTFIT WITH MATERIALS AND COLORS')}${' (or the outfit shown in Image 2, if provided)'}.`,
        `Same 3-panel layout as Image 1: front face close-up, front full body, back full body, on the same ${GREY}, identical lighting.`,
        'The clothes fit realistically, with natural drape, gravity, creases at the elbows and knees, visible weave, seams and buttons.',
        guards(S, G.person)
      )
    });
    return out;
  }

  /* ================= PLACE ================= */
  function placeLight(p) {
    return `${F(p.lightSource, 'LIGHT SOURCE')} from ${F(p.lightDir, 'DIRECTION')}`;
  }
  function place(p, S) {
    const name = F(p.name, 'PLACE NAME');
    const ext = p.kind === 'exterior';
    const photos = p.photos || [];
    const out = [];
    out.push({
      id: 'P1', tag: 'P1', title: 'Master location sheet (2x2 angles)', required: true,
      note: 'A place has no grey background, because the place is the background. It is locked with fixed angles, an empty set and one light direction.',
      attach: attachList([{ label: 'Location photo', img: photos[0] }, photos[1] ? { label: 'Second location photo', img: photos[1] } : null]),
      text: L(
        `Create a professional location reference sheet of ${photos[0] ? 'the exact place shown in Image 1' : 'this place'}: ${name}, ${F(p.description, 'SHORT DESCRIPTION OF THE PLACE')}.`,
        photos[0] ? 'Keep the architecture, layout, furniture, materials, colors and decor identical. Do not add or remove major objects.' : '',
        ' ',
        'Layout: one wide 16:9 image divided into a 2x2 grid of clean panels, no text, no labels, no borders.',
        `Panel 1 (top-left): ESTABLISHING WIDE at a three-quarter angle. Camera ${ext ? 'at street level' : 'in a corner'} at standing eye height (1.6 m), looking diagonally across the space at about 45 degrees. 24mm lens.`,
        'Panel 2 (top-right): REVERSE ANGLE. The opposite view, camera turned 180 degrees from panel 1. 24mm lens.',
        `Panel 3 (bottom-left): MEDIUM VIEW of the main action area: ${F(p.mainArea, 'MAIN ACTION AREA')}. 35mm, eye level.`,
        `Panel 4 (bottom-right): DETAIL TEXTURES. Close-ups of key surfaces: ${F(p.materials, 'KEY MATERIALS AND SURFACES')}.`,
        ' ',
        `The ${ext ? 'location' : 'space'} is completely EMPTY: no people, no animals${ext ? ', no moving cars' : ''}.`,
        `Time and light: ${F(p.time, 'TIME OF DAY')}${ext && t(p.weather) ? ', ' + t(p.weather) : ''}. Main light: ${placeLight(p)}, with consistent shadows. The light direction is identical in all 4 panels.`,
        `Photography: architectural photography on a real camera, natural exposure, straight verticals, ${film(S)} color and grain.`,
        `Lived-in details: ${F(p.livedIn, 'SMALL SIGNS OF REAL USE')}.`,
        guards(S, G.place)
      )
    });
    const sheet = attachList([{ label: 'Finished P1 location sheet', img: p.sheet || photos[0] }]);
    out.push({
      id: 'P2', tag: 'P2', title: 'Layout map (top-down)',
      note: 'The layout map stops doors and windows from jumping sides between shots. Upload the result as the map.',
      attach: sheet,
      text: L(
        `Create a clean top-down overhead view (bird's-eye, camera pointing straight down) of the exact location in Image 1 (${name}), as if the ${ext ? 'area were seen from a drone directly above' : 'ceiling were removed'}.`,
        'Show the true floor plan: walls, doors, windows, furniture and key objects in their correct positions, sizes and materials, matching Image 1 exactly.',
        `Photorealistic top-down render with soft even daylight coming from the ${F(p.lightDir, 'LIGHT SIDE')} side. Empty, no people.`,
        guards(S, G.place, 'Never: perspective tilt, invented furniture, labels or text.')
      )
    });
    out.push({
      id: 'P2b', tag: 'P2 / LLM', title: 'Label the map (paste into Claude or ChatGPT)',
      note: 'Attach the map image in the chat.',
      attach: attachList([{ label: 'Layout map', img: p.map }]),
      text: L(
        `Here is the top-down layout map of my location "${name}". Label it as a production map:`,
        '1. Give every key object a short name and position (for example "Window W1, north wall, left side").',
        `2. Mark the main light direction (${placeLight(p)}).`,
        '3. Suggest 5 camera positions (C1 to C5) with lens size, height and what each one sees.',
        '4. Note the 180-degree line for a scene where two people face each other here.',
        'I will use this to keep continuity across all shots.'
      )
    });
    out.push({
      id: 'P3', tag: 'P3', title: 'Coverage angle (extra camera position)',
      note: 'Use one per new camera position a scene needs.',
      attach: attachList([{ label: 'Finished P1 location sheet', img: p.sheet || photos[0] }, { label: 'Layout map (optional)', img: p.map }]),
      text: L(
        `Same exact location as Image 1 (${name}): empty, ${F(p.time, 'TIME OF DAY')}, same light direction (${placeLight(p)}).`,
        `Generate a single photorealistic frame from this camera position: ${F(p.coverage, 'CAMERA POSITION, e.g. low angle from the doorway at knee height looking toward the window')}.`,
        'Lens: 35mm, straight verticals.',
        'All furniture, materials and colors match Image 1 exactly. Keep the lived-in details.',
        `Aspect ratio: ${aspect(S)}.`,
        guards(S, G.place)
      )
    });
    out.push({
      id: 'P4', tag: 'P4', title: 'Time-of-day or weather variant',
      note: t(p.variant) ? '' : 'Fill in "Variant lighting" to use this prompt.',
      attach: sheet,
      text: L(
        'Exact same location and camera angles as Image 1, with every object in the same place.',
        `Change ONLY the lighting and atmosphere to: ${F(p.variant, 'NEW TIME / WEATHER AND ITS LIGHT SOURCES')}.`,
        'Every lit area has a believable source (window, lamp, practical light, sky).',
        `Color and grain like ${/night|evening|dusk|lamp|tungsten/i.test(p.variant || '') ? 'Kodak Vision3 500T' : film(S)}, gentle halation around bright sources.`,
        guards(S, G.place)
      )
    });
    return out;
  }

  /* ================= PROP ================= */
  function prop(r, S, chars) {
    const name = F(r.name, 'PROP NAME');
    const photos = r.photos || [];
    const wear = r.wearable === 'yes';
    const out = [];
    const facts = `Object facts: ${F(r.what, 'WHAT IT IS')}, ${F(r.size, 'REAL SIZE')}, made of ${F(r.materials, 'MATERIALS')}, colors ${F(r.colors, 'COLORS')}${t(r.logoText) ? `, logo/label text "${t(r.logoText)}"` : ''}.`;
    out.push({
      id: 'R1', tag: wear ? 'R1 / R3' : 'R1', title: wear ? 'Master wearable sheet (6 views)' : 'Master product sheet (6 views)', required: true,
      note: 'GPT Image keeps logos and lettering most accurately. Check the label letter by letter against the real product.',
      attach: attachList([{ label: 'Product photo (front, label visible)', img: photos[0] }, photos[1] ? { label: 'Second angle', img: photos[1] } : null]),
      text: L(
        `Create a professional product reference sheet of the exact ${wear ? 'wearable item' : 'object'} shown in Image 1: ${name}. It is an identical replica. Do not redesign, simplify or invent anything.`,
        facts,
        `Layout: one wide 16:9 image, a 3x2 grid of panels, all on the same ${GREY}, no added text, no labels, no borders.`,
        'Panel 1: FRONT view, straight on, logo and label fully readable.',
        'Panel 2: THREE-QUARTER view, rotated 45 degrees.',
        'Panel 3: SIDE profile, 90 degrees.',
        `Panel 4: ${wear ? 'BACK or INSIDE view (for example the inside of the temple arms, the clasp side or the lining)' : 'BACK view, 180 degrees'}.`,
        `Panel 5: ${wear ? 'TOP-DOWN, folded or laid flat' : 'TOP-DOWN view from directly above'}.`,
        `Panel 6: MACRO DETAIL of ${F(r.detail, 'KEY DETAIL, e.g. logo, hinge, stitching, cap')}, showing real material texture.`,
        'Lighting: identical in every panel. Large soft key from the upper left, white bounce card on the right, soft contact shadow under the object. Reflections are true to the material.',
        'Camera: 100mm macro, f/11, everything sharp, true-to-life color.',
        guards(S, G.prop(r.logoText))
      )
    });
    const main = (chars || []).find((c) => c.role !== 'secondary') || (chars || [])[0];
    out.push({
      id: 'R2', tag: 'R2', title: 'Scale and handling sheet',
      note: 'Shows the video model the real size and how hands hold it.',
      attach: attachList([{ label: 'Finished R1 product sheet', img: r.sheet || photos[0] }, main ? { label: `${main.name || 'Character'} sheet`, img: ref(main) } : null]),
      text: L(
        `Using the exact product from Image 1 (${name})${main ? ', held by the person from Image 2' : ''}, create a 3-panel sheet on the same ${GREY}, no text:`,
        `Panel 1: the product held naturally in one hand, fingers wrapped realistically around it, showing true real-world scale (${F(r.size, 'SIZE')}).`,
        `Panel 2: the product in use: ${F(r.usage, wear ? 'HOW IT IS WORN' : 'HOW IT IS USED')}.`,
        `Panel 3: the product resting on a surface next to ${F(r.scaleObject, 'A COMMON OBJECT FOR SCALE')}.`,
        'Soft even studio light, 85mm, f/5.6.',
        guards(S, G.prop(r.logoText), main ? G.person.slice(0, 3) : [])
      )
    });
    out.push({
      id: 'R4', tag: 'R4', title: 'Hero pack shot (end card)',
      note: 'The beauty shot for the end of an ad.',
      attach: attachList([{ label: 'Finished R1 product sheet', img: r.sheet || photos[0] }]),
      text: L(
        `Advertising hero shot of the exact product from Image 1 (${name}), placed on ${F(r.surface, 'SURFACE, e.g. a slab of travertine stone')}.`,
        'Composition: product slightly right of center, low angle, negative space on the left for a logo added later in the edit.',
        'Lighting: one hard sunlight source from the back-left casting a long soft-edged shadow toward the camera, subtle warm bounce fill from the right, real reflections and caustics.',
        `Camera: 90mm macro, f/8, ${film(S)} color, fine grain. Real surface texture with a few dust particles in the light.`,
        `Aspect ratio: ${aspect(S)}.`,
        guards(S, G.prop(r.logoText))
      )
    });
    return out;
  }

  /* ================= STORY / SCRIPT ================= */
  function assetSummary(S) {
    const c = S.characters.map((x) => `- Character: ${x.name || 'unnamed'} (${[x.age && x.age + ' y/o', x.gender, x.role === 'secondary' ? 'secondary' : 'main'].filter(Boolean).join(', ')})`);
    const p = S.places.map((x) => `- Place: ${x.name || 'unnamed'}${x.description ? ' (' + x.description + ')' : ''}`);
    const r = S.props.map((x) => `- Prop/product: ${x.name || 'unnamed'}${x.what ? ' (' + x.what + ')' : ''}`);
    const all = [...c, ...p, ...r];
    return all.length ? all.join('\n') : '- (no assets yet)';
  }
  function projectLine(S) {
    const s = S.settings;
    return `a ${F(s.length, 'LENGTH')} ${F(s.format, 'FORMAT')}${t(s.brand) ? ' for ' + t(s.brand) : ''}, aspect ratio ${aspect(S)}`;
  }

  const SHOT_SCHEMA = '{ "code": "SC01_SH01", "scene": "SC01", "type": "action|dialogue|broll|transition", "style": "comedy|premium", "speed": "real|slow", "duration": 5, "screen": 2.5, "size": "WS|MS|MCU|CU|ECU|Insert", "angle": "", "lens": "50mm", "aperture": "2", "move": "", "characters": ["exact name"], "place": "exact name", "props": ["exact name"], "meme": "", "moment": "", "blocking": "", "beats": "0-2s: ...\\n2-4s: ...", "physics": "", "light": "", "speaker": "", "line": "", "delivery": "", "audio": "", "onscreen": "", "vo": "", "sfx": "", "music": "", "edit": "", "transition": "" }';
  const JSON_SCHEMA = `{
  "project": { "title": "", "logline": "", "format": "", "length": "", "mood": "", "palette": "", "aspect": "16:9|9:16|4:5|1:1", "language": "" },
  "characters": [ { "name": "", "role": "main|secondary", "age": "", "gender": "", "ethnicity": "", "height": "", "build": "", "faceShape": "", "eyes": "", "hair": "", "features": "", "outfit": "", "outfit2": "", "emotion": "", "voice": "" } ],
  "places": [ { "name": "", "kind": "interior|exterior", "description": "", "time": "", "lightSource": "", "lightDir": "", "mainArea": "", "materials": "", "livedIn": "", "weather": "", "variant": "" } ],
  "props": [ { "name": "", "what": "", "size": "", "materials": "", "colors": "", "logoText": "", "detail": "", "wearable": "yes|no", "usage": "", "scaleObject": "", "surface": "" } ],
  "shots": [ ${SHOT_SCHEMA} ]
}`;
  const BRIEF_RULES = [
    '- If the input is a full creative brief or master prompt, treat it as the source of truth. Keep its scene order, timings, dialogue, on-screen text, sound effects, music cues and voice-over exactly as written.',
    '- Split every scene into separately generatable shots. One physical action per shot. A scene with two speakers becomes one dialogue shot per line.',
    '- duration = clip length to generate (4 to 8 s). screen = seconds actually used in the edit, following the brief timings.',
    '- Split-screen or multi-panel formats (for example a top and bottom panel) become separate shots that are combined in the edit.',
    '- Meme or reference formats: write the format name in meme, and recreate its composition, poses and expressions with our own characters. Never copy the original image, people or artwork.',
    '- style = comedy for sketch and meme shots (handheld, natural light), premium for product and brand shots (controlled studio light, smooth slider moves). speed = slow only for slow-motion product moments such as spray mist.',
    '- Captions, meme labels, subtitles, thought bubbles, logos, end cards and calls to action never go inside the generated shot. Put them in onscreen or edit.',
    '- Freeze frames, crash zooms and punch-ins are edit effects: put them in edit, not in move.',
    '- Product truth: never invent product names, bottle designs, claims, notes, prices, promotions or links. Where the brief is unsure, write [VERIFY: ...].'
  ];

  function breakdown(S) {
    return {
      id: 'BD', tag: 'BREAKDOWN', title: 'Story or brief breakdown (paste into Claude or ChatGPT)',
      note: 'Works with a short story or a full creative brief. Paste this prompt, copy the JSON it returns, then paste that JSON into the import box below.',
      attach: [],
      text: L(
        'You are a director, director of photography, casting director and editor preparing an AI video production. Break the story or brief below into locked production assets and a complete shotlist, so that every shot can be generated separately and assembled in the edit.',
        `Project: ${projectLine(S)}.${t(S.settings.mood) ? ' Mood: ' + t(S.settings.mood) + '.' : ''}`,
        ' ',
        'STORY OR BRIEF:',
        F(S.story, 'PASTE YOUR STORY OR BRIEF HERE'),
        ' ',
        'RULES',
        '- Characters: invent precise, filmable physical details where the story is silent (age, height in cm, build, face shape, eyes, hair, distinguishing marks, exact outfit with colors and materials). Keep each face distinct.',
        '- Places: give each a time of day, ONE named main light source and its direction, materials, and small lived-in details.',
        '- Props: give each a real size, materials, colors, any logo text, and the key macro detail.',
        '- Shots: ONE physical action per shot, varied shot sizes (never two wides in a row), consistent screen direction. Beats are time-coded. Dialogue lines are under 8 seconds.',
        BRIEF_RULES,
        '- Avoid shots that AI handles badly: crowds, fast fights, complex hand interactions, text inside the video.',
        '- Never use empty words like cinematic, epic, 8k or masterpiece. Use lens, light source and physical detail instead.',
        ' ',
        'Reply with ONLY valid JSON in exactly this shape, with no commentary:',
        JSON_SCHEMA
      )
    };
  }

  function script(S) {
    const sum = assetSummary(S);
    return [
      {
        id: 'S1', tag: 'S1', title: 'Concept generator', attach: [],
        note: 'For when you have assets but no story yet. Attach your finished sheets in the chat.',
        text: L(
          'You are a commercial and short-film creative director who writes for AI video production.',
          'I have these locked assets (sheets attached):', sum, ' ',
          `Goal: ${projectLine(S)}.`,
          `Audience: ${F(S.settings.audience, 'AUDIENCE')}. Feeling: ${F(S.settings.mood, 'MOOD')}.`,
          ' ',
          'Give me 3 different concepts. For each: title, one-line hook, the story in 5 beats, visual style (palette, named light, film-stock reference), music and sound mood, and why it will not look like generic AI content.',
          'Rules: use only my assets (at most 1 new location or prop, clearly marked). Keep it achievable: one clear action per shot, no crowds, no complex hand interactions, no fast fights, no on-screen text generated inside the video.'
        )
      },
      {
        id: 'S2', tag: 'S2', title: 'Full script with dialogue', attach: [],
        text: L(
          `Write the full script for ${t(S.settings.title) ? '"' + t(S.settings.title) + '"' : 'the chosen concept'} in screenplay style.`,
          t(S.settings.logline) ? 'Logline: ' + t(S.settings.logline) : '',
          t(S.story) ? 'Story so far:\n' + t(S.story) : '',
          `Length: ${F(S.settings.length, 'LENGTH')}. Assets:`, sum, ' ',
          'For each scene: scene heading (INT./EXT. PLACE - TIME), action lines (what we SEE, physical and specific), dialogue or voice-over.',
          'Dialogue rules for AI lip-sync:',
          '- At most 8 to 10 seconds of speech per line (about 20 to 25 words).',
          '- Natural spoken language: contractions, small pauses written as "...", no speeches.',
          '- Mark the delivery: (whispered), (laughing), (dry, deadpan), (out of breath).',
          '- Mark each line ON-SCREEN (lip-sync needed) or V.O. (voice-over).',
          '- Prefer voice-over and reaction shots over long on-camera talking.',
          'End with the tagline or end-card text (added in the edit, not generated).'
        )
      },
      {
        id: 'S3', tag: 'S3', title: 'Dialogue polish', attach: [],
        text: L(
          'Here is my dialogue:', '[PASTE DIALOGUE]', ' ',
          'Rewrite it so it sounds like real people talking, not an ad or an AI:',
          '- Shorter sentences, interruptions, subtext instead of explaining feelings.',
          '- Each character has a distinct voice:',
          S.characters.length ? S.characters.map((c) => `  - ${c.name || 'unnamed'}: ${F(c.voice, 'VOICE / PERSONALITY')}`).join('\n') : '  - [CHARACTER: voice and personality]',
          '- Every line under 10 seconds spoken aloud. Give estimated seconds per line.',
          '- Keep the story beats the same.',
          'Output a table: # | Speaker | On-screen or V.O. | Line | Delivery | Est. seconds.'
        )
      },
      {
        id: 'S4', tag: 'S4', title: 'Voice profiles', attach: [],
        note: 'For ElevenLabs or a video model with built-in audio.',
        text: L(
          'For each speaking character below, write a voice description for a voice generator: age, gender, accent, pitch, pace, texture, energy, and 2 vocal comparisons by type (no celebrity names). Add one sample line in that voice.',
          S.characters.length ? S.characters.map((c) => `- ${c.name || 'unnamed'}, ${charDesc(c)}. Voice notes: ${F(c.voice, 'VOICE NOTES')}`).join('\n') : '- [CHARACTER]'
        )
      },
      {
        id: 'S5', tag: 'S5', title: 'Asset check', attach: [],
        text: L(
          'Read the script below. List every character, location, prop and wardrobe change it needs. Mark each one HAVE if it is in my asset list, or NEED if not.',
          'My assets:', sum, ' ',
          `For each NEED, write a reference-sheet prompt in this style: characters get a 3-panel sheet (front face close-up, front full body, back full body) on a ${GREY}; props get a 6-view sheet on the same grey; locations get an empty 2x2 angle grid (wide 3/4, reverse, medium, textures) with one named light direction.`,
          '', 'SCRIPT:', '[PASTE SCRIPT]'
        )
      }
    ];
  }

  /* ================= SHOTLIST ================= */
  function shotlist(S) {
    return [
      {
        id: 'B1', tag: 'B1', title: 'Shotlist generator (returns importable JSON)', attach: [],
        note: 'Paste it into Claude or ChatGPT with your sheets attached, then paste the JSON answer into the import box.',
        text: L(
          'You are a director of photography breaking a script into an AI-video shotlist.',
          'SCRIPT:', F(S.script, 'PASTE SCRIPT'), ' ',
          'Assets:', assetSummary(S), ' ',
          'Rules:',
          '- 3 to 8 seconds per shot, ONE physical action per shot. Split anything complex.',
          '- Vary shot sizes and never put two wides in a row. Use inserts (hands, product, details) between.',
          '- Keep screen direction (180-degree rule) and light direction consistent within a location.',
          '- Talking shots only when needed: MCU or CU, at most 8 seconds.',
          '- 1 or 2 texture shots per scene (steam, fabric, footsteps, reflections).',
          '- Each shot names ONE light source with direction, a lens, an aperture and a camera move.',
          '- Never use the words cinematic, epic, 8k or masterpiece.',
          BRIEF_RULES,
          ' ',
          'Reply with ONLY valid JSON: { "shots": [ ... ] }, where each shot has exactly these keys:',
          SHOT_SCHEMA
        )
      },
      {
        id: 'B3', tag: 'B3', title: 'Continuity check (with storyboard image)', attach: [],
        text: 'Review this storyboard against my shotlist and reference sheets. Check face and outfit consistency, prop consistency, screen direction (180-degree rule), light direction per location, eyeline matches, shot-size variety and pacing. List problems by frame number with a concrete fix for each.'
      }
    ];
  }

  function storyboard(S, sceneCode, shots) {
    const lookup = (arr, id) => arr.find((x) => x.id === id);
    const chars = []; const places = []; const props = [];
    shots.forEach((s) => {
      (s.charIds || []).forEach((id) => { const c = lookup(S.characters, id); if (c && !chars.includes(c)) chars.push(c); });
      const p = lookup(S.places, s.placeId); if (p && !places.includes(p)) places.push(p);
      (s.propIds || []).forEach((id) => { const r = lookup(S.props, id); if (r && !props.includes(r)) props.push(r); });
    });
    const att = attachList([
      ...chars.map((c) => ({ label: `${c.name || 'Character'} sheet`, img: ref(c) })),
      ...places.map((p) => ({ label: `${p.name || 'Place'} sheet`, img: ref(p) })),
      ...props.map((r) => ({ label: `${r.name || 'Prop'} sheet`, img: ref(r) }))
    ]);
    const order = [...chars, ...places, ...props];
    const n = (o) => order.indexOf(o) + 1;
    const grid = shots.length <= 4 ? '2x2' : shots.length <= 6 ? '3x2' : '3x3';
    return {
      id: 'B2-' + sceneCode, tag: 'B2', title: `Storyboard grid, scene ${sceneCode}`,
      note: 'A quick check of flow and framing only. Make the real start frames one by one.',
      attach: att,
      text: L(
        `Create a storyboard page as one image: a ${grid} grid of film frames, each ${aspect(S)}, thin white gutters, a small frame number in the corner of each frame, no other text.`,
        chars.map((c) => `${c.name || 'Character'} is the exact person from Image ${n(c)}.`).join(' '),
        places.map((p) => `The setting is the exact location from Image ${n(p)}.`).join(' '),
        props.map((r) => `The ${r.name || 'prop'} is the exact object from Image ${n(r)}.`).join(' '),
        'Faces, outfits, set and product stay identical in all frames.',
        'Frames:',
        shots.slice(0, 9).map((s, i) => `${i + 1}. ${F(s.size, 'SIZE')}, ${F(s.angle, 'ANGLE')}, ${F(s.lens, 'LENS')}: ${F(s.moment, 'MOMENT')}. Light: ${F(s.light, 'LIGHT')}.`).join('\n'),
        `Style: photographic film stills, one consistent grade, ${film(S)} grain, real light falloff.`,
        guards(S, G.frame(props.map((r) => r.logoText).filter(Boolean).join(', ')))
      )
    };
  }

  /* ================= SHOTS ================= */
  function shotRefs(S, s) {
    const chars = (s.charIds || []).map((id) => S.characters.find((c) => c.id === id)).filter(Boolean);
    const place = S.places.find((p) => p.id === s.placeId);
    const props = (s.propIds || []).map((id) => S.props.find((r) => r.id === id)).filter(Boolean);
    const list = [];
    chars.forEach((c) => list.push({ kind: 'c', obj: c, label: `${c.name || 'Character'} ${s.outfit === 'second' ? 'outfit-2 sheet (C4)' : 'sheet'}`, img: ref(c) }));
    if (place) list.push({ kind: 'p', obj: place, label: `${place.name || 'Place'} sheet`, img: ref(place) });
    props.forEach((r) => list.push({ kind: 'r', obj: r, label: `${r.name || 'Prop'} sheet`, img: ref(r) }));
    if (s.refImg || s.ref) list.push({ kind: 'x', obj: 'ref', label: `Composition reference${t(s.meme) ? ' (' + t(s.meme) + ')' : ''}`, img: s.refImg || null });
    list.forEach((x, i) => (x.n = i + 1));
    return { chars, place, props, list };
  }

  function defaultBeats(d) {
    const dur = Number(d) || 6;
    const a = Math.round(dur * 0.3 * 10) / 10, b = Math.round(dur * 0.7 * 10) / 10;
    return `0.0-${a}s: [FIRST ACTION]\n${a}-${b}s: [MAIN ACTION]\n${b}-${dur}s: [SETTLE / REACTION]`;
  }

  const PREMIUM_CAM = 'Camera: smooth, controlled motorised slider or dolly move, steady and physically real. No shake, no jitter, no sudden speed changes.';
  const SLOW = 'Speed: smooth, constant slow motion (120 fps look played back at 24 fps). No speed ramps.';
  function videoGuards(s) {
    const premium = s.style === 'premium', slow = s.speed === 'slow';
    return G.video.map((x) => {
      if (x.startsWith('Camera:')) return premium ? PREMIUM_CAM : x;
      if (x.startsWith('Speed:')) return slow ? SLOW : x;
      return x;
    });
  }
  function safeArea(S) {
    return aspect(S) === '9:16' ? 'Vertical 9:16 framing: keep faces and the product inside the central safe area, and leave the top 15% and bottom 20% of the frame free of important detail for captions and app buttons.' : '';
  }

  function shotPrompts(S, s, next) {
    const R = shotRefs(S, s);
    const logo = R.props.map((r) => r.logoText).filter(Boolean).join(', ');
    const out = [];
    const nOf = (o) => R.list.find((x) => x.obj === o)?.n;
    const dur = Number(s.duration) || 6;
    const premium = s.style === 'premium';
    const slow = s.speed === 'slow';
    const refN = nOf('ref');

    // A. start frame
    out.push({
      id: 'A', tag: 'A', title: 'Start frame (image)', required: true,
      note: refN ? 'Generate 2 to 4 images, pick the best, check it against the sheets, then animate it. The last image only guides the composition.' : 'Generate 2 to 4 images, pick the best, check it against the sheets, then animate it.',
      attach: attachList(R.list.map((x) => ({ label: x.label, img: x.img }))),
      text: L(
        `A single photographic ${premium ? 'fragrance-commercial still' : 'film still'}. Shot ${F(s.code, 'SHOT CODE')}.`,
        R.chars.map((c) => `Character: ${c.name || 'the character'}, the exact person from Image ${nOf(c)}, with identical face, hair, skin texture and body, wearing ${s.outfit === 'second' && t(c.outfit2) ? 'their second outfit (' + t(c.outfit2) + ')' : 'their outfit (' + F(c.outfit, 'OUTFIT') + ')'}.`),
        R.place ? `Location: the exact place from Image ${nOf(R.place)} (${R.place.name || 'location'}), with the same architecture, furniture, materials and colors.` : 'Location: [LOCATION]',
        R.props.map((r) => `Prop: the exact ${r.name || 'product'} from Image ${nOf(r)}, with the same shape, logo and label, at correct real-world scale (${F(r.size, 'SIZE')}).`),
        refN ? `Composition: Image ${refN} is a COMPOSITION REFERENCE only${t(s.meme) ? ' (the "' + t(s.meme) + '" format)' : ''}. Match its framing, camera angle, poses, body language, expressions and where everyone is placed. Do NOT copy its people, faces, clothing, colors, text or drawing style. Use only our characters, location and product.` : '',
        ' ',
        `Moment: ${F(s.moment, 'ONE FROZEN MOMENT')}.`,
        `Blocking: ${F(s.blocking, 'WHO IS WHERE ON SCREEN, e.g. character at right third x 65%, facing left; product foreground x 40%')}. Everything is already in place.`,
        `Shot size and angle: ${F(s.size, 'SHOT SIZE')}, ${F(s.angle, 'ANGLE AND CAMERA HEIGHT')}.`,
        `Lens: ${F(s.lens, 'LENS')}, f/${F(s.aperture, 'APERTURE')}, natural background falloff.`,
        `Light: ${F(s.light, R.place ? placeLight(R.place) : 'NAMED SOURCE + DIRECTION + QUALITY')}. No flat front light.`,
        premium ? `Color and finish: premium fragrance-commercial look, controlled highlights and reflections, deep clean shadows, ${film(S)} grain kept very fine.` : `Color and film: ${film(S)}, natural grain, gentle halation on highlights${t(S.settings.palette) ? ', palette: ' + t(S.settings.palette) : ''}.`,
        safeArea(S),
        'No captions, labels, thought bubbles or added text in the image. Those are added in the edit.',
        `Aspect ratio: ${aspect(S)}.`,
        guards(S, G.frame(logo))
      )
    });

    // video attach order: Image 1 = start frame, then character and prop sheets (no place, no composition ref)
    const vlist = R.list.filter((x) => x.kind === 'c' || x.kind === 'r');
    const vN = (o) => vlist.findIndex((x) => x.obj === o) + 2;
    const vAttach = attachList([{ label: 'Approved start frame (first frame)', img: s.frame }, ...vlist.map((x) => ({ label: x.label, img: x.img }))]);
    const head = L(
      `SCENE CONTEXT: ${t(S.settings.logline) ? t(S.settings.logline) + ' ' : ''}${F(s.moment, 'WHAT HAPPENS IN THIS SHOT')}.`,
      R.chars.length ? 'CHARACTER: ' + R.chars.map((c) => `${c.name || 'the character'} (reference Image ${vN(c)})`).join(', ') + '. Identical face, hair and outfit as the start frame for the whole shot.' : '',
      R.props.length ? 'PRODUCT: ' + R.props.map((r) => `${r.name || 'the product'} (reference Image ${vN(r)})`).join(', ') + '. Identical shape, logo and label for the whole shot.' : '',
      'FIRST FRAME: Starts exactly on the provided start frame (Image 1). Everything is already in position. No empty frame, no delayed reveal.',
      slow
        ? `FORMAT: Single continuous take, ${dur} seconds, smooth constant slow motion (120 fps look). No cuts, no transitions, no speed ramps.`
        : `FORMAT: Single continuous take, ${dur} seconds, real-time speed. No cuts, no transitions, no speed ramps, no slow motion.`
    );
    const camTail = premium ? 'Smooth and controlled, no shake.' : 'Never gimbal-smooth, never digital jitter.';

    if (s.type === 'dialogue') {
      const sp = R.chars.find((c) => (c.name || '').toLowerCase() === t(s.speaker).toLowerCase()) || R.chars[0];
      const listeners = R.chars.filter((c) => c !== sp);
      out.push({
        id: 'C', tag: 'C', title: 'Dialogue / lip-sync video', required: true,
        note: 'Use a tool with native audio or lip-sync (Veo, Kling, WAN, Seedance with audio). Keep the line under 8 seconds.',
        attach: vAttach,
        text: L(
          head,
          `OPTICS AND CAMERA: ${F(s.lens, '85mm')}, f/${F(s.aperture, '2')}, focus locked on the speaker's eyes. ${t(s.move) || 'Static camera with a tiny natural handheld drift'}. ${camTail}`,
          `DIALOGUE (${sp ? sp.name || 'speaker' : F(s.speaker, 'SPEAKER')}${sp && t(sp.voice) ? ', voice: ' + t(sp.voice) : ''}${t(s.delivery) ? ', delivery: ' + t(s.delivery) : ''}):`,
          `"${F(s.line, 'EXACT LINE, max about 20 words')}"`,
          t(S.settings.language) ? `LANGUAGE AND ACCENT: ${t(S.settings.language)}. Say the line exactly as written.` : '',
          `PERFORMANCE: ${t(s.beats) ? '\n' + t(s.beats) : 'A small breath before speaking, natural blinks, eyebrows and cheeks move with the emotion, micro head movements.'}`,
          listeners.length ? `LISTENER: ${listeners.map((c) => c.name).join(', ')} listens with small natural reactions and the mouth closed.` : '',
          `LIGHTING: ${F(s.light, R.place ? placeLight(R.place) : 'NAMED KEY LIGHT')}, catchlight in the eyes, consistent through the shot.`,
          `AUDIO: The voice sounds recorded in the room, with natural reverb for ${R.place ? R.place.name || 'the location' : 'the location'}. ${t(s.audio) || 'Quiet room tone'}. No music, no subtitles.`,
          `POSITIVE LOCKS: Identical face, teeth, hair and outfit throughout. Only ${sp ? sp.name || 'the speaker' : 'the speaker'} speaks.`,
          `LOOK: ${film(S)}, natural grain.`,
          guards(S, videoGuards(s), G.dialogue)
        )
      });
    } else {
      const broll = s.type === 'broll';
      out.push({
        id: 'B', tag: broll ? 'E' : 'B', title: broll ? 'Texture / b-roll / product video' : 'Video shot spec (image to video)', required: true,
        note: 'Upload the approved start frame as the first frame. Add the character and prop sheets as extra references if the tool allows it.',
        attach: vAttach,
        text: L(
          head,
          `OPTICS: ${F(s.lens, 'LENS')} lens, f/${F(s.aperture, 'APERTURE')}, focus locked on ${R.chars[0] && !broll ? 'the face' : 'the subject'}. The lens stays the same for the whole shot. No fisheye.`,
          `CAMERA: ${F(s.move, 'CAMERA MOVE, e.g. handheld, slow push-in of about 20 cm')}. ${camTail}`,
          'ACTION TIMING:',
          t(s.beats) || defaultBeats(dur),
          `PHYSICS: ${t(s.physics) || 'Real weight and inertia in every movement. Fabric and hair react naturally. Objects have real mass.'}`,
          `LIGHTING: Key light is ${F(s.light, R.place ? placeLight(R.place) : 'NAMED SOURCE + DIRECTION')}. Shadows keep visible detail, never crushed. The light stays consistent through the shot.`,
          `AUDIO: ${t(s.audio) || 'Natural room tone and the real sounds of the action'}. No dialogue, no subtitles, no music.`,
          `POSITIVE LOCKS: ${[R.chars.length ? 'face, hairstyle and outfit' : '', R.props.length ? R.props.map((r) => (r.name || 'product') + ' design and logo').join(', ') : '', 'background objects'].filter(Boolean).join(', ')} stay identical in every frame.`,
          premium ? `LOOK: premium fragrance commercial, controlled reflections, very fine ${film(S)} grain.` : `LOOK: ${film(S)}, natural grain, soft halation, natural-light realism.`,
          guards(S, videoGuards(s))
        )
      });
      out.push({
        id: 'Bs', tag: 'SHORT', title: 'Short version (small prompt boxes)', attach: [],
        text: `${dur}s single take. ${F(s.move, 'CAMERA MOVE')}, ${F(s.lens, 'LENS')} f/${F(s.aperture, 'AP')}. ${F(s.moment, 'ACTION')}. Real weight, cloth and hair movement. ${F(s.light, 'LIGHT SOURCE')}, consistent light. Identical face, outfit and product logo throughout. ${film(S)} grain. ${premium ? 'Smooth controlled slider move, no shake.' : 'Handheld, never gimbal-smooth.'} ${slow ? 'Smooth constant slow motion.' : 'Real-time, no slow motion.'} No cuts, no morphing, no text, no music.`
      });
    }

    const editLines = [
      t(s.screen) ? `Use ${t(s.screen)} s of the ${dur} s clip. Trim the first and last 0.5 s first.` : '',
      t(s.onscreen) ? `ON SCREEN TEXT: ${t(s.onscreen)}` : '',
      t(s.vo) ? `VOICE-OVER: "${t(s.vo)}"` : '',
      t(s.sfx) ? `SFX: ${t(s.sfx)}` : '',
      t(s.music) ? `MUSIC: ${t(s.music)}` : '',
      t(s.edit) ? `EDIT: ${t(s.edit)}` : ''
    ].filter(Boolean);
    if (editLines.length) {
      out.push({ id: 'EDIT', tag: 'EDIT', title: 'Edit notes (not generated)', note: 'Do these in CapCut, Premiere or DaVinci. Never put text in the generation prompt.', attach: [], text: editLines.join('\n') });
    }

    if (next || s.type === 'transition') {
      out.push({
        id: 'D', tag: 'D', title: `Transition to ${next ? next.code || 'next shot' : 'next shot'}`,
        note: 'Optional. Use first-frame and last-frame mode if your tool has it. Most cuts work better as straight cuts in the edit.',
        attach: attachList([{ label: 'This shot\'s start frame (first frame)', img: s.frame }, { label: 'Next shot\'s start frame (last frame)', img: next && next.frame }]),
        text: L(
          'FIRST FRAME: Image 1. LAST FRAME: Image 2.',
          `Transition type: ${F(s.transition, 'e.g. match cut / whip pan with real motion blur / object wipe as a person passes the lens')}.`,
          'Duration 3 seconds. Continuous, physically plausible camera movement. Lighting changes are motivated by the move.',
          guards(S, videoGuards(s).filter((x) => !x.startsWith('Never')), 'Never: morphing faces, melting objects, flashy effects, text.')
        )
      });
    }
    return out;
  }

  /* ================= EDIT & ASSEMBLY ================= */
  function tc(sec) {
    const m = Math.floor(sec / 60), s = sec - m * 60;
    return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
  }
  function srtTime(sec) {
    const ms = Math.round(sec * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
  }
  function timeline(S) {
    let at = 0;
    return S.shots.map((s) => { const len = Number(s.screen) || Number(s.duration) || 0; const row = { s, start: at, end: at + len, len }; at += len; return row; });
  }
  function assembly(S) {
    const rows = timeline(S);
    const total = rows.length ? rows[rows.length - 1].end : 0;
    const name = (id, arr) => (arr.find((x) => x.id === id) || {}).name || '';
    const guide = L(
      `ASSEMBLY GUIDE: ${t(S.settings.title) || 'project'} (${aspect(S)}, ${tc(total)} total)`,
      ' ',
      'Global steps:',
      '1. Lay the clips on the timeline in this order. Trim the first and last 0.5 s of every generated clip, where most warping happens.',
      '2. Cut to the screen time listed. Comedy cuts are hard and fast; premium shots get longer holds and soft dissolves.',
      '3. Do freeze frames, crash zooms and punch-ins digitally in the edit (scale 110 to 160% with motion blur), not in generation.',
      '4. Add on-screen text, meme labels, thought bubbles, logos and the CTA as graphics. Keep them inside the platform safe area.',
      '5. Apply one colour grade across each section and one fine grain pass over everything so all shots match.',
      '6. Add music, sound effects and voice-over from the cue sheet. Sound effects go only where listed.',
      '7. Import the SRT for subtitles, then export 1080x1920, H.264, 30 fps.',
      ' ',
      'Shot by shot:',
      rows.map((r) => L(
        `${tc(r.start)}-${tc(r.end)}  ${r.s.code || ''}  ${r.s.style === 'premium' ? '[PREMIUM]' : ''}${t(r.s.meme) ? ' [' + t(r.s.meme) + ']' : ''}`,
        `   Shot: ${t(r.s.moment) || '-'}${r.s.duration ? ` (use ${r.len} s of the ${r.s.duration} s clip)` : ''}`,
        r.s.type === 'dialogue' && t(r.s.line) ? `   Dialogue: ${t(r.s.speaker) || 'Speaker'}: "${t(r.s.line)}"` : '',
        t(r.s.onscreen) ? `   On screen: ${t(r.s.onscreen)}` : '',
        t(r.s.vo) ? `   VO: "${t(r.s.vo)}"` : '',
        t(r.s.sfx) ? `   SFX: ${t(r.s.sfx)}` : '',
        t(r.s.music) ? `   Music: ${t(r.s.music)}` : '',
        t(r.s.edit) ? `   Edit: ${t(r.s.edit)}` : ''
      )).join('\n')
    );
    let n = 0;
    const srt = rows.flatMap((r) => {
      const out = [];
      if (r.s.type === 'dialogue' && t(r.s.line)) out.push(`${++n}\n${srtTime(r.start + 0.1)} --> ${srtTime(Math.max(r.start + 0.6, r.end - 0.1))}\n${t(r.s.line)}\n`);
      if (t(r.s.vo)) out.push(`${++n}\n${srtTime(r.start + 0.1)} --> ${srtTime(Math.max(r.start + 0.6, r.end - 0.1))}\n${t(r.s.vo)}\n`);
      return out;
    }).join('\n');
    const cues = rows.filter((r) => t(r.s.sfx) || t(r.s.music) || t(r.s.vo)).map((r) => `${tc(r.start)}  ${r.s.code}  ${[t(r.s.sfx) && 'SFX: ' + t(r.s.sfx), t(r.s.music) && 'MUSIC: ' + t(r.s.music), t(r.s.vo) && 'VO: ' + t(r.s.vo)].filter(Boolean).join(' | ')}`).join('\n');
    const placement = rows.filter((r) => (r.s.propIds || []).length).map((r) => `${tc(r.start)}  ${r.s.code}  ${(r.s.propIds || []).map((id) => name(id, S.props)).join(', ')}: ${t(r.s.moment)}`).join('\n');
    const chars = S.characters.map((c) => `${c.name}: ${charDesc(c)}. ${F(c.faceShape, 'FACE')} face, ${F(c.eyes, 'EYES')} eyes, hair ${F(c.hair, 'HAIR')}. Outfit: ${F(c.outfit, 'OUTFIT')}${t(c.outfit2) ? '. Second outfit: ' + t(c.outfit2) : ''}. Appears in: ${S.shots.filter((s) => (s.charIds || []).includes(c.id)).map((s) => s.code).join(', ') || 'no shots yet'}.`).join('\n');
    return [
      { id: 'ASM', tag: 'GUIDE', title: 'Assembly guide (for you or your editor)', required: true, attach: [], text: guide },
      { id: 'SRT', tag: 'SRT', title: 'Subtitles file (save as subtitles.srt)', attach: [], note: 'Paste into a text file named subtitles.srt and import it into your editor. Timings follow the screen times.', text: srt || '(no dialogue or voice-over yet)' },
      { id: 'SFX', tag: 'SOUND', title: 'Sound design cue sheet', attach: [], text: cues || '(no sound cues yet)' },
      { id: 'PROD', tag: 'PRODUCT', title: 'Product placement guide', attach: [], text: placement || '(no props assigned to shots yet)' },
      { id: 'CONT', tag: 'CAST', title: 'Character continuity guide', attach: [], text: chars || '(no characters yet)' }
    ];
  }

  /* ================= FIX LIBRARY ================= */
  function fixes(S) {
    return [
      { id: 'F1', tag: 'F1', title: 'Face drifted', attach: [{ n: 1, label: 'The bad image' }, { n: 2, label: 'Character sheet' }],
        text: 'Edit Image 1: replace the face so it matches the exact person in Image 2 (character sheet). Identical eyes, nose, lips, jaw, skin tone, freckles and hairline. Keep the expression, head angle, lighting, shadows and everything else unchanged. Real skin texture with pores, no smoothing.' },
      { id: 'F2', tag: 'F2', title: 'Plastic or waxy skin', attach: [{ n: 1, label: 'The bad image' }],
        text: 'Keep everything identical, but make the skin look like an unretouched photograph: visible pores, fine lines, slight redness around the nose and cheeks, peach fuzz catching the light, tiny natural blemishes, subtle oil sheen on the forehead. No makeup glow, no airbrush. Keep the identity exactly the same.' },
      { id: 'F3', tag: 'F3', title: 'Product or logo changed', attach: [{ n: 1, label: 'The bad image' }, { n: 2, label: 'Product sheet' }],
        text: 'Edit Image 1: replace the product so it exactly matches Image 2 (product sheet): same shape, color, materials, logo and label text spelled exactly "[BRAND TEXT]". Keep the hand position, lighting, reflections and the rest of the image unchanged. Match the scene\'s light direction on the product.' },
      { id: 'F4', tag: 'F4', title: 'Bad hands', attach: [{ n: 1, label: 'The bad image' }],
        text: 'Fix only the hands: anatomically correct, five fingers each, natural knuckles and nails, a realistic grip on the [OBJECT] with fingers wrapping around it and slight skin compression where they press. Change nothing else.' },
      { id: 'F5', tag: 'F5', title: 'Too clean, too perfect', attach: [{ n: 1, label: 'The bad image' }],
        text: `Keep the composition, people and products identical, but make it feel like a real photograph from a film set: slight lens imperfections (soft corners, gentle halation on highlights), natural film grain (${film(S)}), small real-world mess (a crease in fabric, dust in the light, a scuffed floor), uneven natural light falloff, and slightly less saturated color. No new objects.` },
      { id: 'F6', tag: 'F6', title: 'Lighting does not match between shots', attach: [{ n: 1, label: 'The image to fix' }, { n: 2, label: 'A shot with the correct light' }],
        text: 'Relight Image 1 to match Image 2: same key light direction ([DIRECTION]), same color temperature ([e.g. warm late-afternoon, about 3500K]), same contrast and shadow softness. Keep the people, objects and composition identical.' }
    ];
  }

  const VIDEO_FIXES = [
    ['Floaty, gimbal-smooth camera', 'Add "handheld, subtle breathing sway, never gimbal-smooth".'],
    ['Slow-motion feel', 'Add "real-time speed, no slow motion" and describe faster, specific actions.'],
    ['Face morphs mid-shot', 'Make it shorter (4 to 5 s), use a closer start frame, add the character sheet as a reference and a POSITIVE LOCKS line.'],
    ['Random extra movements', 'Use time-coded ACTION TIMING with one action and nothing else.'],
    ['Product label warps', 'Keep the product smaller or still in frame, add a lock line, and shoot a separate macro insert for the hero moment.'],
    ['Shot starts empty, things appear', 'Add "FIRST FRAME: everything already in place, no reveal".'],
    ['Weird lip-sync', 'Use a shorter line, a closer shot, a front or three-quarter angle and a well-lit mouth, or switch to voice-over.'],
    ['Glossy AI look', 'Remove cinematic, 8k and ultra-detailed. Add a film stock, a named light source and grain.']
  ];
  const QC = [
    'Can I point to where the light comes from?',
    'Do feet, hands and objects show real weight?',
    'Does the camera move like a person is holding it?',
    'Do the face, outfit and product match the sheets in the first, middle and last frame?',
    'Is anything morphing at the start or end? Trim it.',
    'Does it hold up next to the shot before and after it?'
  ];

  window.Prompts = { character, place, prop, breakdown, script, shotlist, storyboard, shotPrompts, shotRefs, assembly, timeline, fixes, VIDEO_FIXES, QC, JSON_SCHEMA };
})();

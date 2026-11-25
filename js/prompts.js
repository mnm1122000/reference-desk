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
      'Performance is understated and human: a breath before speaking, natural blinks, micro head movements. No exaggerated acting.',
      'Pace: speech rides on top of action. Each line begins while its movement is still happening. No dead air, no long silent pauses between lines.'
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
  const tag = (c, suffix) => '@' + (t(c.name) || 'Character').replace(/[^\w]+/g, '') + (suffix || '');
  const ERASE = 'Erase the face on the full-body FRONT view: leave a smooth, blank, softly blurred oval in a muted skin tone, with no eyes, nose or mouth. The hair stays visible around it. The portrait is the ONLY face reference in the sheet, so the video model can never take the face from the small full-body figure.';
  const SHEET_LAYOUT = (bg) => L(
    'Layout: ONE wide 16:9 image with THREE panels of the same person on one continuous seamless backdrop, with no gutters, borders, frames, labels or text.',
    'Panel 1 (left half, first figure): FULL BODY, FRONT VIEW, from above the head to below the shoes with a little floor in frame, FACE ERASED (see below).',
    'Panel 2 (left half, second figure): FULL BODY, BACK VIEW, the same distance and scale as panel 1, turned exactly 180 degrees, showing the back of the hair, clothing and shoes. Both pairs of feet on the same ground line.',
    'Panel 3 (right half): one LARGE HEAD-AND-SHOULDERS PORTRAIT filling the full height of the right half, cropped at the upper chest so the whole neck shows, facing the camera, neutral expression, direct gaze, sharp eyes.',
    ERASE,
    'Pose: neutral standing pose facing the camera squarely, weight even on both feet, feet hip-width apart, shoulders level, arms relaxed at the sides, hands open and EMPTY. The back view is the same stance turned 180 degrees.',
    `Background: ${bg}, floor blending into the wall, a soft contact shadow under the feet. Nothing else in frame: no studio equipment, softbox, stand, lamp or cable anywhere.`,
    'Light: soft, even, neutral frontal light with gentle falloff, exposed for skin so it holds full detail, neutral white balance.',
    'Camera: the full-body panels at eye level with a standard normal lens about 3 m away, no distortion. The portrait with a short telephoto portrait lens at eye level.'
  );

  function character(c, S, all) {
    const name = F(c.name, 'NAME');
    const photos = c.photos || [];
    const others = (all || []).filter((x) => x.id !== c.id && t(x.name));
    const out = [];
    const world = t(S.settings.palette) || t(S.settings.film) ? `Match the look of the show: ${film(S)}${t(S.settings.palette) ? ', palette ' + t(S.settings.palette) : ''}, so the character already belongs to its world.` : '';

    out.push({
      id: 'C0', tag: 'C0', title: `Face portrait (${tag(c, 'Face')}), only if you have no photo`,
      note: 'Generate about 6 options and pick one. Reject washed-out faces and plastic, symmetrical "AI faces". Save the winner as this character\'s first source photo.',
      attach: [],
      text: L(
        `A straight-on, tightly framed head-and-shoulders portrait photograph of ${name}, a ${charDesc(c)}.`,
        charFace(c),
        'Real skin with visible pores, fine lines and natural unevenness. Neutral, calm expression, mouth closed, direct gaze into the lens.',
        'Wearing a plain dark crew-neck top.',
        'Lighting: one large diffused softbox 45 degrees to the side and slightly above, fill from the other side two stops down, soft shadow under the nose and jaw, no harsh highlights, no dramatic contrast.',
        'Background: plain neutral grey, softly out of focus.',
        'Camera: 105mm lens, f/4, about 3 m away, eye level, sharp focus on the eyes. Aspect ratio 4:5.',
        world,
        guards(S, G.person)
      )
    });

    out.push({
      id: 'C0b', tag: 'C0b', title: `Outfit reference (${tag(c, 'Outfit')})`,
      note: 'Shows only the clothes, face out of frame, so the outfit never brings a second face into the sheet. Skip it if you already have a clear outfit photo.',
      attach: attachList([photos[1] ? { label: 'Outfit photo (optional)', img: photos[1] } : null]),
      text: L(
        `A straight-on fashion photograph of the outfit only, worn by a ${t(c.age) ? c.age + '-year-old ' : ''}${F(c.gender, 'PERSON')}, framed from the shoulders to the feet with the face out of frame, against a plain warm grey wall.`,
        `Outfit: ${F(c.outfit, 'EVERY GARMENT WITH COLOR, FABRIC, FIT AND LENGTH, PLUS SHOES')}.`,
        t(c.details) ? `Accessories: ${t(c.details)}.` : '',
        'Hands empty: no bag, phone, cards or props. Shoes fully visible with space below them.',
        'Bright, direct light like an on-camera flash, crisp fabric texture, a faint shadow behind the figure, deep focus.',
        world,
        guards(S, G.person.slice(1))
      )
    });

    if (t(c.details)) {
      out.push({
        id: 'C0c', tag: 'C0c', title: `Detail close-up (${tag(c, 'Details')})`,
        note: 'Small things like jewellery, glasses or a watch come out wrong unless they get their own close-up. Attach it when you build the sheet.',
        attach: [],
        text: L(
          `A straight-on, tight close-up photograph of these details only: ${t(c.details)}, worn with ${F(c.outfit, 'THE OUTFIT')}.`,
          'Framed at chest and neck height (or hands and wrists for rings and watches), no face in frame.',
          'Balanced, even light that makes metal glint and shows the fabric texture, sharp focus throughout.',
          guards(S, G.person.slice(1, 4))
        )
      });
    }

    const a1 = attachList([
      { label: `Face (${tag(c, 'Face')})`, img: photos[0] },
      { label: `Outfit (${tag(c, 'Outfit')})`, img: photos[1] || null },
      t(c.details) ? { label: `Details (${tag(c, 'Details')})`, img: photos[2] || null } : null
    ]);
    out.push({
      id: 'C1', tag: 'C1', title: `Master character sheet (${tag(c)}), face erased on the front view`, required: true,
      note: 'Use a model that is strong with references (GPT Image, Nano Banana, Seedream). Generate 2 to 4, keep the best, and upload it below as the finished sheet. Check that the front figure really has no face.',
      attach: a1,
      text: L(
        `Make a character sheet of ${name}.`,
        'Face and hair: take the face exactly from Image 1 (facial structure, eyes, brows, nose, lips, skin tone) and the hair colour and texture from Image 1. Do not beautify, idealise or change the face.',
        charFace(c),
        `Outfit: take only the clothing from Image 2: ${F(c.outfit, 'OUTFIT')}, with the same colours, fabrics, fit and length, refitted to this body. Ignore any bag, cards, props, background or face in that reference.`,
        t(c.details) ? `Details: ${t(c.details)}${a1.length > 2 ? ', exactly as in Image 3' : ''}.` : '',
        `Body: ${charDesc(c)}. The same proportions in all three panels.`,
        ' ',
        SHEET_LAYOUT(`plain seamless neutral mid-grey studio backdrop (#808080 to #8D8F91), never white or black`),
        world,
        c.role === 'secondary' && others.length ? `This person must look clearly different from ${others.map((o) => o.name).join(', ')}.` : '',
        guards(S, G.person)
      )
    });

    const sheetRef = attachList([{ label: `Finished C1 sheet (${tag(c)})`, img: c.sheet }]);
    out.push({
      id: 'C4', tag: 'C4', title: `Second look by editing the sheet (${tag(c, 'V2')})`,
      note: t(c.outfit2) ? 'Edit the existing sheet. Never regenerate from scratch, or the face will change.' : 'Fill in "Second look" to use this prompt.',
      attach: sheetRef,
      text: L(
        `Edit Image 1 (${name}'s character sheet). Change ONLY this: ${F(c.outfit2, 'THE CHANGE, e.g. hair down below the shoulders and no glasses, or a new outfit with colours and fabrics')}.`,
        'Keep the face, body proportions, grey backdrop, light, colour grade and three-panel layout exactly the same, with the face STILL ERASED on the full-body front view.',
        'Any new clothes fit realistically, with natural drape, gravity and creases.',
        guards(S, G.person)
      )
    });

    out.push({
      id: 'C3', tag: 'C3', title: 'Expression sheet (for dialogue close-ups)',
      note: 'Optional. Attach it only for close-up dialogue shots, never together with a different face image.',
      attach: sheetRef,
      text: L(
        `From the portrait in Image 1 (${name}), create a 3x2 grid of head-and-shoulders close-ups of the exact same face, on the same grey backdrop with the same soft light, no text and no borders.`,
        `Expressions: neutral / genuine smile with eye crinkles / mid-sentence, mouth half open / suspicious side-eye / surprised / ${F(c.emotion, 'KEY EMOTION IN THE STORY')}.`,
        'All facing the camera or a slight three-quarter turn. Natural muscle movement, nothing cartoonish. Identity, skin texture and hair identical in every cell.',
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
      note: 'A place has no grey background, because the place is the background. Panel 1 is the key image: a three-quarter wide where the whole layout reads in one frame. A straight-on view looks nice, but on other angles the model has to guess the rest of the room.',
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
        `Here is the top-down layout map of my location "${name}". Turn it into a production LOCATION MAP that I can paste into every shot prompt:`,
        '1. Use a compass (north, east, south, west) and say what stands on each wall and side.',
        '2. Give every key object a short name and position (for example "the white table, south end").',
        `3. Mark the main light (${placeLight(p)}) and which side it lights.`,
        t(p.layout) ? `4. Place the action like this: ${t(p.layout)}. Give distances in metres between people and marks.` : '4. Mark where each character sits, stands or walks, with distances in metres.',
        '5. Draw the action line and put every camera on ONE side of it. State who is screen-left, who is screen-right and which way each person looks.',
        '6. Suggest 4 camera setups: a 47-degree wide, a 29-degree close-up for each main character, and one low or reverse angle, with distance and height.',
        'Reply with a compact LOCATION MAP block of 6 to 10 lines.'
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

  const SHOT_SCHEMA = '{ "code": "SC01_SH01", "scene": "SC01", "type": "action|dialogue|broll|transition", "style": "comedy|premium", "speed": "real|slow", "outfit": "main|second", "duration": 5, "screen": 2.5, "size": "WS|MS|MCU|CU|ECU|Insert", "angle": "", "lens": "50mm", "aperture": "2", "move": "", "characters": ["exact name"], "place": "exact name", "props": ["exact name"], "meme": "", "moment": "", "blocking": "", "beats": "0-2s: ...\\n2-4s: ...", "acting": "DIRECTION / MOTIVE / GOAL / OBSTACLE / TACTIC", "physics": "", "light": "", "speaker": "", "line": "", "delivery": "", "audio": "", "onscreen": "", "vo": "", "sfx": "", "music": "", "edit": "", "transition": "" }';
  const JSON_SCHEMA = `{
  "project": { "title": "", "logline": "", "format": "", "length": "", "mood": "", "palette": "", "aspect": "16:9|9:16|4:5|1:1", "language": "" },
  "characters": [ { "name": "", "role": "main|secondary", "age": "", "gender": "", "ethnicity": "", "height": "", "build": "", "faceShape": "", "eyes": "", "hair": "", "features": "", "details": "", "outfit": "", "outfit2": "", "want": "", "emotion": "", "voice": "" } ],
  "places": [ { "name": "", "kind": "interior|exterior", "description": "", "time": "", "lightSource": "", "lightDir": "", "mainArea": "", "materials": "", "livedIn": "", "weather": "", "variant": "", "layout": "compass map: what is on each side, who stands where, camera side" } ],
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
    '- Story: open on the loudest moment (hook), keep an emotional swing every 20 to 30 seconds, add one unexpected escalation, and end one beat before the answer. Write an acting task (direction, motive, goal, obstacle, tactic) for every character in every shot, and cut to the key reactions.',
    '- Voices: describe each accent by how it sounds and keep it identical in every shot. outfit = second when a character has switched to their second look.',
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
    const story = t(S.story) && !/already broken down/i.test(S.story) ? t(S.story) : '';
    const castLines = S.characters.length ? S.characters.map((c) => `- ${c.name || 'unnamed'} (${[c.age && c.age + ' y/o', c.role === 'secondary' ? 'secondary' : 'main'].filter(Boolean).join(', ')})${t(c.want) ? ': wants ' + t(c.want) : ''}${t(c.voice) ? '; voice: ' + t(c.voice) : ''}`).join('\n') : '- [CHARACTERS]';
    return [
      {
        id: 'H1', tag: 'H1', title: 'Premise picker: a story people get in seconds', attach: [],
        note: 'Start here if you only have a vague idea. It picks a premise built on a feeling everyone recognises.',
        text: L(
          'You are a showrunner of viral vertical short dramas and story-driven ads.',
          `Project: ${projectLine(S)}. Audience: ${F(S.settings.audience, 'AUDIENCE')}.`,
          story ? `My idea so far:\n${story}` : 'My idea so far: [ONE OR TWO SENTENCES, or "surprise me"]',
          ' ',
          'Give me 5 premises. Each must be understood in seconds and rest on a proven engine: Cinderella (someone ordinary gets an unexpected chance), love against the odds, rivalry, hidden identity, comeback, wrong assumption, ticking clock or fish out of water.',
          'For each premise: a one-sentence pitch (who, want, twist), the universal feeling behind it (for example "I don\'t belong here and now I\'m in trouble"), the loudest moment that can open the episode, the escalation surprise, and the cliffhanger.',
          'Then pick the strongest one and say why in two sentences.'
        )
      },
      {
        id: 'H2', tag: 'H2', title: 'Hook generator (first 3 seconds)', attach: [],
        text: L(
          'Write 8 different opening hooks for this story. Each must work on mute and in the first 1 to 3 seconds.',
          story ? `STORY:\n${story}` : 'STORY: [PASTE STORY OR PREMISE]',
          ' ',
          'Use these formulas, at least one each: peak first (open on the loudest moment, then rewind), wrong-impression freeze, physical accident in slow motion, shocking first line, impossible contrast, direct question to camera.',
          'For each hook give: what we SEE in the first frame, the first line (if any, under 6 words), the question it plants in the viewer\'s mind, and the sound that sells it.',
          'Rank them by scroll-stopping power, and explain the top pick in one sentence.'
        )
      },
      {
        id: 'H3', tag: 'H3', title: 'Beat sheet: hook, context, escalation, cliffhanger', attach: [],
        text: L(
          `Build a beat sheet for ${t(S.settings.title) ? '"' + t(S.settings.title) + '"' : 'this story'}, ${F(S.settings.length, 'LENGTH')}.`,
          story ? `STORY:\n${story}` : 'STORY: [PASTE STORY OR PREMISE]',
          'Cast:', castLines, ' ',
          'Structure it as four parts:',
          '1. HOOK: open on the peak moment, shown without explanation.',
          '2. CONTEXT: who they are and what is at stake, shown through action. An emotional swing every 20 to 30 seconds: a starting point, then hope, then another hit, then a chance.',
          '3. ESCALATION: an unexpected turn (a new character, a bigger conflict, something nobody sees coming).',
          '4. CLIFFHANGER: end one beat before the answer everyone wants (a decision, a reveal, a transformation), then cut to black.',
          '(For an ad, use: hook, relatable misunderstanding, escalation, product reveal, premium showcase, CTA.)',
          ' ',
          'For every beat give: the timecode, the scene, what changes, the emotion, and the KEY REACTION to catch. The tension comes from two characters reading the same moment differently, so name what each one thinks is happening.'
        )
      },
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
          'Cast and voices:', castLines, ' ',
          'Structure: HOOK (open on the loudest moment), CONTEXT (emotional swings every 20 to 30 seconds), ESCALATION (an unexpected turn), CLIFFHANGER (end one beat before the answer, cut to black). For ads: hook, misunderstanding, escalation, product reveal, premium showcase, CTA.',
          'For each scene: scene heading (INT./EXT. PLACE - TIME), its purpose (hook, context, escalation or cliffhanger), action lines (what we SEE, physical and specific, including how people move through the space), dialogue or voice-over, and the KEY REACTIONS to cut to.',
          'Show both sides of every important moment: what each character thinks is happening. That difference is where the tension comes from.',
          'Dialogue rules for AI lip-sync:',
          '- At most 8 to 10 seconds of speech per line (about 20 to 25 words).',
          '- Natural spoken language: contractions, small pauses written as "...", no speeches.',
          '- Mark the delivery: (whispered), (laughing), (dry, deadpan), (out of breath).',
          '- Mark each line ON-SCREEN (lip-sync needed) or V.O. (voice-over).',
          '- Prefer voice-over and reaction shots over long on-camera talking.',
          '- Lines start while the movement is still happening: speech rides on top of action, with no dead air.',
          '- Give each line a timing window in seconds inside its scene, and keep every character voice and accent identical in every scene.',
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
          'For each speaking character below, write a voice description for a voice generator or a video model with audio: age, gender, accent, pitch, pace, texture, energy, and 2 vocal comparisons by type (no celebrity names). Describe the accent by how it SOUNDS (for example a French accent in English: soft uvular r, dropped h, rounded vowels, stress on the last syllable). Add one sample line. I will paste the same description into every scene where they speak.',
          S.characters.length ? S.characters.map((c) => `- ${c.name || 'unnamed'}, ${charDesc(c)}. Voice notes: ${F(c.voice, 'VOICE NOTES')}`).join('\n') : '- [CHARACTER]'
        )
      },
      {
        id: 'S6', tag: 'S6', title: 'Acting tasks per scene', attach: [],
        note: 'Paste the results into the "Acting task" field of each shot. Video models act much better with a clear inner life.',
        text: L(
          'For every scene in the script below, write an ACTING TASK for each character in it, in this format:',
          'DIRECTION (their arc in this scene) / MOTIVE (why they feel this way) / GOAL (what they want right now) / OBSTACLE (what stops them) / TACTIC (how it shows physically: voice, eyes, hands, posture, movement through the space).',
          'Keep it playable and physical, for example "his irritation shows only as the voice getting quieter and flatter", not "he is annoyed". Note the one reaction the camera must catch.',
          'Cast:', castLines, ' ', 'SCRIPT:', story || '[PASTE SCRIPT]'
        )
      },
      {
        id: 'S7', tag: 'S7', title: 'Script doctor', attach: [],
        text: L(
          'Review this script like a short-drama showrunner and an ad creative director. Score each item 1 to 5 and give a concrete rewrite for anything under 4:',
          '1. Hook in the first 3 seconds, readable on mute?',
          '2. An emotional swing at least every 20 to 30 seconds?',
          '3. Does every scene change status, knowledge or stakes?',
          '4. Are both sides of key reactions shown?',
          '5. Is there one real escalation surprise?',
          '6. Is every line natural, under 8 seconds, and in character?',
          '7. Does it end one beat before the answer (or, for an ad, with a clear product reveal and CTA)?',
          '8. Can every shot actually be generated (no crowds in motion, no complex hand work, no text in frame)?',
          ' ', 'SCRIPT:', '[PASTE SCRIPT]'
        )
      },
      {
        id: 'S5', tag: 'S5', title: 'Asset check', attach: [],
        text: L(
          'Read the script below. List every character, location, prop and wardrobe change it needs. Mark each one HAVE if it is in my asset list, or NEED if not.',
          'My assets:', sum, ' ',
          `For each NEED, write a reference-sheet prompt in this style: characters get a 3-panel sheet (full-body front with the face ERASED to a blank oval, full-body back, and a large head-and-shoulders portrait) on a ${GREY}; props get a 6-view sheet on the same grey; locations get an empty 2x2 angle grid (wide 3/4, reverse, medium, textures) with one named light direction.`,
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
        `Create a BLACK-AND-WHITE storyboard page as one image: a ${grid} grid of photographic film frames, each ${aspect(S)}, separated by thin black borders on white, a small frame number in the corner of each frame, no other text.`,
        chars.map((c) => `${c.name || 'Character'} is the exact person from Image ${n(c)}.`).join(' '),
        places.map((p) => `The setting is the exact location from Image ${n(p)}.`).join(' '),
        props.map((r) => `The ${r.name || 'prop'} is the exact object from Image ${n(r)}.`).join(' '),
        'Faces, outfits, set and product stay identical in all frames.',
        'Frames:',
        shots.slice(0, 9).map((s, i) => { const mm = memeFor(s.meme); return `${i + 1}. ${F(s.size, 'SIZE')}, ${F(s.angle, 'ANGLE')}, ${F(s.lens, 'LENS')}: ${F(s.moment, 'MOMENT')}.${mm ? ' Pose: ' + mm.pose + ' (the ' + mm.name + ' layout).' : ''}`; }).join('\n'),
        'Style: monochrome black-and-white photographic stills with a full grey scale, real light falloff, fine grain, clear readable poses and expressions. Same look in every frame.',
        guards(S, G.frame(props.map((r) => r.logoText).filter(Boolean).join(', ')))
      )
    };
  }

  /* ================= MEME LIBRARY ================= */
  const MEMES = [
    {
      key: 'distracted', name: 'Distracted Boyfriend', match: /distract/i, media: 'image',
      source: 'stock photo by Antonio Guillem (2015)', link: 'https://knowyourmeme.com/memes/distracted-boyfriend', find: '',
      acting: 'Three people on a sunny street. The passing woman is in the foreground walking away, seen from a three-quarter back. The boyfriend in the centre has turned his head back over his shoulder toward her: eyebrows up, lips pushed out as if about to whistle, his body still facing forward. The girlfriend beside him glares at him, mouth open in outrage, one hand half-raised.',
      pose: 'boyfriend centre, head turned back over his shoulder toward the woman leaving frame; girlfriend at his side glaring at him; the woman in the foreground walking out of frame',
      timing: 'The head turns in about 0.6 s, then everyone freezes. The edit freezes this exact frame.'
    },
    {
      key: 'chloe', name: 'Side-Eye Chloe', match: /side.?eye|chloe/i, media: 'video',
      source: 'a 2013 family YouTube video of a little girl hearing about a Disneyland trip', link: 'https://knowyourmeme.com/memes/side-eyeing-chloe', find: 'search YouTube for the original "Lily\'s Disneyland Surprise" video',
      acting: 'The head stays turned slightly away. Only the eyes slide sideways toward the other person. The upper lip lifts a little on one side in a sceptical half-sneer, the brows pull down, the mouth stays slightly open. Deeply unimpressed, completely still.',
      pose: 'close-up, head turned three-quarter away, eyes hard sideways toward the camera side, upper lip slightly raised',
      timing: 'The eyes slide slowly over about 1 s, then hold for at least 1 s without blinking.'
    },
    {
      key: 'yelling', name: 'Woman Yelling at Cat', match: /yell|cat/i, media: 'video',
      source: 'a reality TV dinner argument (2011) paired with a photo of a confused white cat at a dinner table (2018)', link: 'https://knowyourmeme.com/memes/woman-yelling-at-a-cat', find: 'the left half comes from a reality-TV dinner scene; search "Woman Yelling at Cat original clip"',
      acting: 'Left side: a woman leans forward across the table, face twisted in tearful anger, shouting, pointing hard across the table with her whole arm. Right side: the accused sits upright behind a dinner plate, completely blank and confused, head slightly tilted back, lips pressed, unbothered.',
      pose: 'two-shot across a table: her on the left leaning in and pointing, him on the right sitting straight with a blank, puzzled face behind a plate or drink',
      timing: 'She lunges into the point on the first word and holds the point; he does not react at all.'
    },
    {
      key: 'pikachu', name: 'Surprised Pikachu', match: /pikachu|surprised/i, media: 'video',
      source: 'a frame from a 1990s anime episode', link: 'https://knowyourmeme.com/memes/surprised-pikachu', find: 'only use it as a timing reference; recreate it with a real face',
      acting: 'The face freezes in shock: eyes go wide and round, the mouth drops open into a small round O, the head and body stay completely still. No hands, no movement. Pure frozen disbelief.',
      pose: 'tight front close-up, eyes wide, mouth a small open O, head perfectly still',
      timing: 'Neutral for about 1 s, then the eyes and mouth snap open in 0.2 s and hold frozen.'
    },
    {
      key: 'bed', name: "I Bet He's Thinking About Other Women", match: /thinking about other|bet he/i, media: 'image',
      source: 'stock photo of a couple in bed', link: 'https://knowyourmeme.com/memes/i-bet-hes-thinking-about-other-women', find: '',
      acting: 'A couple lies in bed facing away from each other. She is on her side looking at him with a disappointed, suspicious frown. He lies still with his eyes open, staring into space, lost in his own thoughts. Space above each head for a thought bubble.',
      pose: 'high angle on the bed, her suspicious on one side, him staring at nothing on the other, empty space above both heads',
      timing: 'Almost still. Only small blinks and breathing. The thought bubbles are added in the edit.'
    },
    {
      key: 'drake', name: 'Drake Hotline Bling', match: /drake/i, media: 'video',
      source: 'the 2015 "Hotline Bling" music video', link: 'https://knowyourmeme.com/memes/drakeposting', find: 'search YouTube for "Hotline Bling" (the poses are around the middle of the video)',
      acting: 'TOP (reject): he turns his head away with a grimace, raising one hand palm-out beside his face as if blocking something. BOTTOM (approve): he faces the other way with a pleased, knowing smile, pointing a finger toward the thing he approves of, chin slightly up, a small nod.',
      pose: 'top: head turned away, palm raised in rejection; bottom: smiling, pointing toward the approved thing',
      timing: 'Each panel is a 1 s move into the pose, then a hold.'
    },
    {
      key: 'buttons', name: 'Two Buttons', match: /two buttons|button/i, media: 'image',
      source: 'a 2014 webcomic ("Daily Struggle")', link: 'https://knowyourmeme.com/memes/daily-struggle', find: '',
      acting: 'Panel 1: a hand hovers between two big red buttons, unable to choose. Panel 2: the person sweats heavily, wiping the forehead with a cloth, eyes wide with anxiety, looking off to the side.',
      pose: 'close-up of a sweating face, a towel pressed to the forehead, eyes wide and anxious',
      timing: 'Eyes flick left and right twice, then the towel wipes the forehead.'
    },
    {
      key: 'fine', name: 'This Is Fine', match: /this is fine|fine/i, media: 'image',
      source: 'a 2013 webcomic of a dog in a burning room', link: 'https://knowyourmeme.com/memes/this-is-fine', find: '',
      acting: 'He sits calmly at a table with a mug, a small content smile, surrounded by chaos (here, far too many perfume bottles). Totally relaxed, as if everything is normal, while the room says otherwise.',
      pose: 'seated at a table holding a mug, calm smile, the chaos all around him filling the frame',
      timing: 'Calm stillness, a slow sip or a nod, while the camera pulls back to reveal the chaos.'
    },
    {
      key: 'gatsby', name: 'Leonardo DiCaprio Cheers', match: /dicaprio|gatsby|cheers|toast/i, media: 'video',
      source: 'the 2013 film "The Great Gatsby" (the trailer and the party scene)', link: 'https://knowyourmeme.com/memes/great-gatsby-reaction-leonardo-dicaprio-toast', find: 'search "Great Gatsby toast scene"',
      acting: 'He turns toward the camera raising a glass at chest height toward the viewer, a charming, knowing smile, eyebrows slightly raised, head tilted a touch, as if toasting you personally. Celebration behind him.',
      pose: 'facing the camera, glass (here a perfume bottle) raised toward the lens at chest height, knowing smile, eyebrows up',
      timing: 'Turns and raises the glass in about 1 s, smiles, holds the toast.'
    }
  ];
  function memeFor(name) { const n = t(name); if (!n) return null; return MEMES.find((m) => m.match.test(n)) || null; }

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

    const meme = memeFor(s.meme);
    const acting = t(s.memeActing) || (meme ? meme.acting : '');
    const keyEnd = s.keyframe === 'end';

    if (meme || t(s.memeActing)) {
      out.push({
        id: 'MEME', tag: 'MEME', title: `Meme reference: ${meme ? meme.name : t(s.meme)}`,
        note: meme ? `Source: ${meme.source}. ${meme.media === 'video' ? 'A video exists: ' + meme.find : 'Image only (no original video), so match the final frame.'}` : '',
        attach: [],
        link: meme ? meme.link : null,
        text: L(
          `HOW THE MEME IS ACTED: ${acting || '[DESCRIBE THE MEME POSE AND TIMING]'}`,
          meme ? `KEY FRAME TO MATCH: ${meme.pose}` : '',
          meme ? `TIMING: ${meme.timing}` : '',
          'Recreate the composition, pose and expression with our own actors. Never copy the original image, people or artwork.'
        )
      });
    }

    const frameText = (moment, isKey) => L(
      `A single photographic ${premium ? 'fragrance-commercial still' : 'film still'}. Shot ${F(s.code, 'SHOT CODE')}${isKey ? ', MEME KEY FRAME (this image becomes the LAST frame of the clip)' : keyEnd ? ', START FRAME (1 to 2 seconds before the meme pose)' : ''}.`,
      R.chars.map((c) => `Character: ${c.name || 'the character'}, the exact person from Image ${nOf(c)}, with identical face, hair, skin texture and body, wearing ${s.outfit === 'second' && t(c.outfit2) ? 'their second outfit (' + t(c.outfit2) + ')' : 'their outfit (' + F(c.outfit, 'OUTFIT') + ')'}.`),
      R.place ? `Location: the exact place from Image ${nOf(R.place)} (${R.place.name || 'location'}), with the same architecture, furniture, materials and colors.` : 'Location: [LOCATION]',
      R.props.map((r) => `Prop: the exact ${r.name || 'product'} from Image ${nOf(r)}, with the same shape, logo and label, at correct real-world scale (${F(r.size, 'SIZE')}).`),
      refN ? `Composition: Image ${refN} is a COMPOSITION REFERENCE only${t(s.meme) ? ' (the "' + t(s.meme) + '" format)' : ''}. Match its framing, camera angle${isKey || !keyEnd ? ', poses, body language, expressions' : ''} and where everyone is placed. Do NOT copy its people, faces, clothing, colors, text or drawing style. Use only our characters, location and product.` : '',
      ' ',
      `Moment: ${moment}.`,
      isKey && acting ? `MEME POSE (match it exactly): ${acting}` : '',
      `Blocking: ${F(s.blocking, 'WHO IS WHERE ON SCREEN, e.g. character at right third x 65%, facing left; product foreground x 40%')}. Everything is already in place.`,
      `Shot size and angle: ${F(s.size, 'SHOT SIZE')}, ${F(s.angle, 'ANGLE AND CAMERA HEIGHT')}.`,
      `Lens: ${F(s.lens, 'LENS')}, f/${F(s.aperture, 'APERTURE')}, natural background falloff.`,
      `Light: ${F(s.light, R.place ? placeLight(R.place) : 'NAMED SOURCE + DIRECTION + QUALITY')}. No flat front light.`,
      premium ? `Color and finish: premium fragrance-commercial look, controlled highlights and reflections, deep clean shadows, ${film(S)} grain kept very fine.` : `Color and film: ${film(S)}, natural grain, gentle halation on highlights${t(S.settings.palette) ? ', palette: ' + t(S.settings.palette) : ''}.`,
      safeArea(S),
      'No captions, labels, thought bubbles or added text in the image. Those are added in the edit.',
      `Aspect ratio: ${aspect(S)}.`,
      guards(S, G.frame(logo))
    );

    if (keyEnd) {
      out.push({
        id: 'A', tag: 'A', title: 'Start frame (a beat before the meme pose)', required: true,
        note: 'The clip starts here and moves into the meme pose. Same camera and framing as the key frame.',
        attach: attachList(R.list.map((x) => ({ label: x.label, img: x.img }))),
        text: frameText(F(s.before, 'WHAT WE SEE 1 TO 2 SECONDS BEFORE THE MEME POSE'), false)
      });
      out.push({
        id: 'K', tag: 'KEY', title: 'Meme key frame (becomes the LAST frame)', required: true,
        note: 'Make this match the meme first. Then generate the clip in first-frame plus last-frame mode so it lands exactly on this pose.',
        attach: attachList(R.list.map((x) => ({ label: x.label, img: x.img }))),
        text: frameText(F(s.moment, 'THE MEME MOMENT'), true)
      });
    } else {
      out.push({
        id: 'A', tag: 'A', title: 'Start frame (image)', required: true,
        note: refN ? 'Generate 2 to 4 images, pick the best, check it against the sheets, then animate it. The last image only guides the composition.' : 'Generate 2 to 4 images, pick the best, check it against the sheets, then animate it.',
        attach: attachList(R.list.map((x) => ({ label: x.label, img: x.img }))),
        text: L(frameText(F(s.moment, 'ONE FROZEN MOMENT'), false), acting && meme ? `\nMEME POSE: ${acting}` : '')
      });
    }

    // video attach order: Image 1 = start frame, (Image 2 = meme key frame), then character and prop sheets
    const off = keyEnd ? 3 : 2;
    const vlist = R.list.filter((x) => x.kind === 'c' || x.kind === 'r');
    const vN = (o) => vlist.findIndex((x) => x.obj === o) + off;
    const vAttach = attachList([
      { label: 'Approved start frame (FIRST frame)', img: s.frame },
      keyEnd ? { label: 'Approved meme key frame (LAST frame)', img: s.keyImg } : null,
      ...vlist.map((x) => ({ label: x.label, img: x.img }))
    ]);
    const head = L(
      `SCENE CONTEXT: ${t(S.settings.logline) ? t(S.settings.logline) + ' ' : ''}${F(s.moment, 'WHAT HAPPENS IN THIS SHOT')}.`,
      R.chars.length ? 'ACTIVE REFERENCES: ' + R.chars.map((c) => `${tag(c)} = ${c.name || 'the character'} (reference Image ${vN(c)}${t(c.voice) && s.type === 'dialogue' ? '; voice: ' + t(c.voice) : ''})`).join(', ') + '. Face, hair and outfit 100% match their reference and the start frame for the whole shot.' : '',
      R.place && t(R.place.layout) ? `LOCATION MAP: ${t(R.place.layout)}` : '',
      R.props.length ? 'PRODUCT: ' + R.props.map((r) => `${r.name || 'the product'} (reference Image ${vN(r)})`).join(', ') + '. Identical shape, logo and label for the whole shot.' : '',
      keyEnd ? 'FIRST AND LAST FRAME: starts exactly on Image 1 and lands exactly on Image 2 (the meme pose) by the final 0.6 seconds, then holds perfectly still there. Use first-frame and last-frame mode.' : '',
      acting && meme ? `MEME PERFORMANCE: ${acting} TIMING: ${meme.timing}` : (t(s.memeActing) ? `MEME PERFORMANCE: ${t(s.memeActing)}` : ''),
      meme && meme.media === 'video' ? `(If your tool accepts a reference video, attach the original meme clip as a MOTION AND TIMING reference only: copy the expression timing, never the person.)` : '',
      keyEnd ? '' : 'FIRST FRAME: Starts exactly on the provided start frame (Image 1). Everything is already in position. No empty frame, no delayed reveal.',
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
          t(s.acting) ? `ACTING TASK: ${t(s.acting)}` : '',
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
          t(s.acting) ? `ACTING TASK: ${t(s.acting)}` : '',
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

  window.Prompts = { MEMES, memeFor, character, place, prop, breakdown, script, shotlist, storyboard, shotPrompts, shotRefs, assembly, timeline, fixes, VIDEO_FIXES, QC, JSON_SCHEMA };
})();

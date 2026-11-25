# Reference Desk

A step-by-step pre-production desk for AI video that does not look generated.

1. **Lock** a reference sheet for every character, place and prop. Characters and props sit on flat 18% grey; places get fixed angles, an empty set and one light direction.
2. **Plan** the script, the dialogue (sized for lip-sync) and a shotlist.
3. **Shoot** each shot as a start frame built from the sheets, then animate it with a time-coded video spec.

Every prompt includes built-in quality guards (identity lock, real skin, correct hands, exact logo spelling, a handheld camera, real-time physics and lip-sync rules). You can turn them off in Project settings.

## Two ways in
- **I have reference pictures:** upload your character, place and product photos, answer the questions, and copy the prompts in order.
- **I already have a story:** paste it, run the breakdown prompt in Claude or ChatGPT, and paste the JSON answer back. Every asset and shot is filled in for you.

## Data
Everything, including your images, stays in your browser (localStorage and IndexedDB). Use **Save project file** to move a project to another device.

Plain HTML, CSS and JS with no build step. Open `index.html` or serve the folder.

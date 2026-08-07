# Lumen Hollow

An original 2D platformer: **Pip**, a lantern-sprite, spelunks the glowing
caverns of the Hollow. Built with vanilla JavaScript and HTML5 Canvas — no
frameworks, no build step, no dependencies.

All characters, art, audio and level design are original work.

## Running it

The game uses ES modules, so it must be served over HTTP rather than opened as
a `file://` URL.

```bash
npm start          # python3 -m http.server 8080
# or
npm run serve      # npx serve, if you'd rather use Node
```

Then open <http://localhost:8080>.

## How it renders

The game always draws at a fixed logical resolution of **480 × 270** (see
`src/core/Config.js`). The canvas backing store stays that size and CSS scales
it up to fit the screen, snapping to whole-number scale factors whenever the
display is large enough. That keeps pixel art crisp, keeps the fill cost
constant across a phone and a 4K monitor, and lets all gameplay code work in a
single coordinate space. `src/core/Viewport.js` owns this.

## Layout

```
index.html            Page shell and canvas element
package.json          Metadata + local dev server scripts
styles/
  main.css            Page chrome, letterboxing, mobile touch behaviour
src/
  main.js             Entry point: finds the canvas, boots the game
  Game.js             Game root; owns subsystems and the frame render
  core/
    Config.js         Resolution, tile size, palette, debug switches
    Viewport.js       Responsive canvas sizing and coordinate conversion
```

Directories for entities, the tile map, input, UI and audio are added as their
milestones land, so the tree always reflects code that actually exists.

## Milestones

- [x] 1. Project setup
- [ ] 2. Game loop
- [ ] 3. Player movement
- [ ] 4. Physics
- [ ] 5. Tile map
- [ ] 6. Camera
- [ ] 7. Enemies
- [ ] 8. Collectibles
- [ ] 9. UI
- [ ] 10. Sound
- [ ] 11. Multiple levels
- [ ] 12. Polish
- [ ] 13. Performance optimization
- [ ] 14. Final bug fixing

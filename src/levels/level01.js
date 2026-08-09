/**
 * Level 1 - The Shallow Hollow. *Learning.*
 *
 * 150 x 30 tiles (2400 x 480 px). The level teaches one thing at a time and
 * then combines them, left to right:
 *
 *   - **Flat ground** with a single Snub, so stomping can be learned safely.
 *   - **Two graded pits** (two tiles, then three): the first clears at a walk,
 *     the second needs a run.
 *   - **The climb**, three ledges each exactly 48 px above the last, guarded by
 *     a Thistle whose leap has to be timed.
 *   - **The platform chasm**, seven tiles wide - too far to jump, so the moving
 *     platform must be ridden, with a Wisp weaving over it.
 *   - **The mesa**, whose western face is cracked. Walking into it is the only
 *     way to the azure rune.
 *   - **The vault**, across a ten-tile gap spanned by a bridge that only the
 *     puzzle can raise.
 *
 * The level's signature obstacle is the **glowspring** (`S`), a coil set into
 * the floor that throws Pip 112 px - seven tiles, more than double his own
 * 49.5 px jump. Three of them, in the order the route meets them:
 *
 *   1. **col 9**, on open ground a few steps from the spawn, with nothing to
 *      fall into for eleven tiles either side. Purely somewhere to play.
 *   2. **col 42**, on the approach to the climb, where the launch carries Pip
 *      onto the first tier - the spring is another way up, not just height.
 *   3. **col 88**, with the wisp already weaving through the airspace it throws
 *      him into.
 *
 * Every spring's shard trail sits at +1/row 20, +2/row 18 and +3/row 17,
 * measured from the arc rather than eyeballed: those are the only cells a
 * walked *and* a run approach both sweep through. Shards directly above a
 * spring are never collected, because the rising and falling legs of the arc
 * pass either side of them.
 *
 * The vault demands three runes struck in the order shown on the tablets:
 * amber, verdant, azure. That is the order they are met in, which is what makes
 * this the gentle level - the sequence never sends the player backwards, so the
 * only difficulty is the reaching. None of the three sits on the through-route,
 * so no rune can be triggered by accident, and the azure one is inside the
 * hidden room - the treasure cannot be reached without finding the secret.
 *
 * Three beacons stand on the through-route - at the cavern mouth, on the mesa
 * approach and at the lip of the vault chasm. They cannot be missed, which is
 * the point on the gentle level: this is where the player learns that a beacon
 * is both progress and the place death sends them back to.
 *
 * Geometry comes from the measured jump metrics, never from eye: Pip's feet
 * reach 49 px, so every climbable surface is exactly three tiles up, and every
 * gap meant to need the platform is wider than the five-tile running jump.
 *
 * Legend (see `src/world/tiles.js`):
 *   `.` empty    `#` stone   `=` mossy stone  `-` one-way platform
 *   `^` spikes   `%` false wall (looks solid, is not)
 *   `S` glowspring (solid, launches anything that lands on it)
 *   `:` bridge-to-be           `V` vault door
 *   `g` snub     `h` thistle  `w` wisp        `o` lumen shard
 *   `1` `2` `3` rune switches (amber, verdant, azure)
 *   `C` beacon (checkpoint)    `t` rune tablet
 *   `m` moving platform        `T` treasure chest       `P` spawn
 *
 * @module levels/level01
 */

export const level01 = {
  name: 'The Shallow Hollow',

  /**
   * The order the vault demands, as switch indices: amber (0), verdant (1),
   * azure (2) - west to east, the order the route meets them in. Levels 2 and 3
   * scramble it; this one teaches what a tablet is for without also asking the
   * player to plan a route around it.
   */
  switchOrder: [0, 1, 2],

  rows: [
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '......................................................................................................................................................',
    '..........................................................o.o.........................................................................................',
    '.........................................................=====........................................................................................',
    '............o................................o...........#####.............................o..........................................................',
    '...........o................................o.......oh...#####............................o...........................................................',
    '...................................................=====.#####........................................................................................',
    '..........o............................o...o.......#####.#####.................o.....w...o............................................................',
    '.......................................1......og...#####.#####.......w........2........................................................VV.............',
    '................................o.....----...=====.#####.#####......o.o......====..................=======.....................w.......VV.............',
    '.....................oo......................#####.#####.#####...............####..................#.oo.o%oo...........................VV...o....o....',
    '...P..t.ooo.C.g............g........^^.......#####.#####.#####.===m........o......C.........g......#.o.3.%o...h.^^..t.g.C..............VV..o..T...o...',
    '=========S===========..========...========S==#####=#####=#####====.......===============S=================================::::::::::==================',
    '#####################..########...################################.......#################################################..........##################',
    '#####################..########...################################.......#################################################..........##################',
    '#####################..########...################################.......#################################################..........##################',
    '#####################..########...################################.......#################################################..........##################',
  ],
};

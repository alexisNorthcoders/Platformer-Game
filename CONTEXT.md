# Kings and Pigs

A pixel-art platformer: the King fights his way through castle levels full of Pigs.

## Language

### Screens

**Title Screen**:
The screen shown before any level is played, where the player picks a level and starts the game.
_Avoid_: Main menu, start screen, menu (on its own)

**Pause Menu**:
The overlay opened during play (Escape or the touch pause button), drawn over the dimmed, frozen level. Its buttons are Resume, Restart Level and Quit to Title (plus Fullscreen on touch devices); levels are picked on the Title Screen only.
_Avoid_: Escape menu, in-game menu

**Game Over Screen**:
The overlay shown after the King loses his last heart and his death plays out. The frozen level first dims over about half a second; only then do the panel and buttons appear, and until then the screen accepts no input (so a mashed attack key cannot choose a button), and a key held through the reveal does nothing until pressed afresh. Drawn over the dimmed, frozen level. It names the level and offers Try Again (Restart Level under another label) and Quit to Title. Losing the last heart is the only way to reach it; a game over costs only the level's progress, never the session.
_Avoid_: Death screen, game over overlay, game over menu

**Level Preview**:
A framed thumbnail on the Title Screen showing the currently selected level's map.

**Title Scene**:
The ambient animation behind the Title Screen: Pigs running and throwing bombs. Purely decorative; it never affects game state.
_Avoid_: Menu background, attract mode

### Actions

**Restart Level**:
Play the current level again as it was on entering it: diamonds and Pigs back, counts rolled back, the level timer at zero. Offered on the Pause Menu, and as Try Again on the Game Over Screen. There is no other kind of restart.
_Avoid_: Retry, respawn (Try Again is only a button label)

**Quit to Title**:
Leave the level for the Title Screen with a clean session. Offered on the Pause Menu and the Game Over Screen.

**Squish**:
The King landing on a Pig from above: the Pig dies outright and the King bounces off it, unhurt. Works on Pigs and the King Pig, never on the Match Pig, who still hurts the King on contact.
_Avoid_: Stomp, jump attack, head bounce

### Characters

**King**:
The character the player controls.
_Avoid_: Player (that's the person at the keyboard), hero, King Human

**Pig**:
Any enemy of the King. The kinds below are all Pigs.
_Avoid_: Goblin, enemy (when a specific kind is meant)

**Bomb Pig**:
A Pig that picks up and throws bombs.
_Avoid_: Goblin, bomber

**King Pig**:
The crowned Pig.

**Match Pig**:
A Pig holding a lit match, who lights a cannon to fire cannon balls.
_Avoid_: Pig with a Match (except when naming the sprite folder)

### Objects

**Bomb**:
An explosive that, once lit, blows up when its fuse burns out and hurts everyone caught in the blast: King, Pigs and Boxes alike, whoever lit it. A Pig caught in a blast dies outright, however many hits it had left; the King loses one heart. The King drops Bombs, on the ground or in mid-air (a Bomb dropped in mid-air falls unlit and lights its fuse on landing); Bomb Pigs throw them. A live Bomb never outlasts its moment: it is gone, without blowing up, when the King dies, goes through a Door, or the level is restarted or quit.
_Avoid_: King's bomb, Pig bomb, grenade

**Moving Platform**:
A wooden plank that glides back and forth along a fixed path (sideways, up and down, or diagonally), easing to a stop at each end. The King can jump up through it and land on top; standing on it carries him, and a lit Bomb resting on it rides along too.
_Avoid_: Elevator, lift, ferry (except when describing one's path)

**Rotating Platform**:
A hub with planks hung round it on chains, turning steadily like a wheel; each plank stays level as it goes round, and carries the King just as a Moving Platform does. He boards a plank as it rises past a ledge and steps off as it comes round level with the next one.
_Avoid_: Wheel (except when describing one), Ferris wheel, spinning platform

**Tumbling Plank**:
A wooden plank that turns end over end round its own middle, slowly and without stopping, like a clock hand. The King can stand on it only while it lies nearly flat, which it does twice a turn; as it tips further it drops him, and while it stands on end he passes through it. It never pushes or hurts him.
_Avoid_: Spinning platform, windmill, flip plank

**Crumbling Shelf**:
A short, thin, cracked plank the King can jump up through and land on. Once he lands on it, it shakes for two seconds, whether he stays or not, then drops away, taking with it anything still on it. It comes back where it was a few seconds later, or at once when he comes back at a Checkpoint or the level is restarted.
_Avoid_: Crumbling ledge, breaking platform, falling platform

### Places

**Helix Platform**:
Two iron blades on a mast, turning flat like a helicopter's rotor, seen side-on. As they turn across the view they stretch out to bridge a gap, then shrink back to the hub. The hub is always safe to stand on. The blades do not carry the King: one shrinking out from under him drops him, so he waits on the hub and walks out as they reach across.
_Avoid_: Rotor, propeller, helicopter platform

**Quicksand**:
The sand along the bottom of an open-air level. The King is caught the moment he touches it, sinks slowly out of sight, then loses a heart and comes back at his last Checkpoint.
_Avoid_: Pit, sand trap

**Water**:
The moat along the bottom of an open-air level. The King sinks into it just as into the Quicksand: caught the moment he touches it, he sinks slowly out of sight, then loses a heart and comes back at his last Checkpoint.
_Avoid_: Sea, pit

**Thicket**:
The tall grass along the bottom of a forest level. The King sinks into it just as into the Quicksand.
_Avoid_: Grass pit, bushes, undergrowth

**Lava**:
The molten rock along the bottom of a volcanic level. The King sinks into it just as into the Quicksand (there is never burning or blood).
_Avoid_: Magma, lava pit

**Cloud Bank**:
The floor of cloud along the bottom of a sky level. The King sinks out of sight into it; falling in costs him a heart and puts him back at his last Checkpoint.
_Avoid_: Cloud sea, sky pit

**Spike Ditch**:
A ditch cut down into the ground, with spikes along its bottom. Falling in costs the King a heart (he flashes as when hurt; there is never blood) and puts him back at his last Checkpoint.
_Avoid_: Spike pit, trench

**Checkpoint**:
A flag on a long level marking where the King comes back after falling into the Water, Quicksand, a Thicket, the Lava, the Cloud Bank or a Spike Ditch. Passing it raises its flag; he always comes back at the furthest one he has passed, or at the level's start before any. Restart Level lowers them all.
_Avoid_: Save point, respawn point

### Weather

**Weather**:
An effect across an open-air level for looks alone, such as Rain or a Storm. A level has at most one. It never touches the King, the Pigs or Bombs.

**Rain**:
Weather of drops falling slantwise across the level, splashing where they land on walls and platforms. Purely for looks.
_Avoid_: Drizzle (except in a level's name)

**Storm**:
Weather of lightning without rain: bolts in the sky behind the level, and soft flashes that brighten the view now and then. Purely for looks: it never strikes anything.
_Avoid_: Thunderstorm, lightning (for the whole Weather)

**Puddle**:
Standing rainwater on an island's bricks or a Moving Platform's plank, rippling where drops land. Purely for looks: it is never slippery.
_Avoid_: Pool, pond

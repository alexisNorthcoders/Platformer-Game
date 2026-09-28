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
The overlay shown after the King loses his last heart and his death plays out, drawn over the dimmed, frozen level. It names the level and offers Try Again (Restart Level under another label) and Quit to Title. Losing the last heart is the only way to reach it; a game over costs only the level's progress, never the session.
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
An explosive that, once lit, blows up when its fuse burns out and hurts everyone caught in the blast: King, Pigs and Boxes alike, whoever lit it. The King drops Bombs, on the ground or in mid-air (a Bomb dropped in mid-air falls unlit and lights its fuse on landing); Bomb Pigs throw them. A live Bomb never outlasts its moment: it is gone, without blowing up, when the King dies, goes through a Door, or the level is restarted or quit.
_Avoid_: King's bomb, Pig bomb, grenade

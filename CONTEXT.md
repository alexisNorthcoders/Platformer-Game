# Kings and Pigs

A pixel-art platformer: the King fights his way through castle levels full of Pigs.

## Language

### Screens

**Title Screen**:
The screen shown before any level is played, where the player picks a level and starts the game.
_Avoid_: Main menu, start screen, menu (on its own)

**Pause Menu**:
The overlay opened during play (Escape or the touch pause button), drawn over the frozen level.
_Avoid_: Escape menu, in-game menu

**Level Preview**:
A framed thumbnail on the Title Screen showing the currently selected level's map.

**Title Scene**:
The ambient animation behind the Title Screen: Pigs running and throwing bombs. Purely decorative; it never affects game state.
_Avoid_: Menu background, attract mode

### Characters

**Pig**:
Any enemy of the King. The kinds below are all Pigs.
_Avoid_: Goblin, enemy (when a specific kind is meant)

**Bomb Pig**:
A Pig that picks up and throws bombs.
_Avoid_: Goblin, bomber

**King Pig**:
The crowned Pig.

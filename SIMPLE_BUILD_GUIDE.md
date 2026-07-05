# CTW Game Simple Build Guide

This project still keeps the original `index.html` and `petbot_test.html`, but new screen switching should go through one bridge file.

## Files to edit

- `index.html`: page layout and the platform game.
- `petbot_test.html`: Tamagotchi/PetBot screens.
- `waa-bridge.js`: the only file that switches between PetBot, embedded quest, fullscreen quest, and building screens. It also keeps the Tamagotchi LCD in the right state while a quest is running.

## Do not add more Stage patches

Avoid adding new scripts at the bottom of `index.html` that replace:

- `openPetbotFull`
- `startEmbeddedTamaGame`
- `stage37ReturnExpandedQuestToTamagotchi`
- `handlePetbotGameAction`
- fullscreen classes
- quest lock storage

Those routes are now owned by `waa-bridge.js`.

## Parent modes

Use these modes in `waa-bridge.js`:

```js
WaaBridge.setMode('petbot');
WaaBridge.setMode('questEmbedded');
WaaBridge.setMode('questFullscreen');
WaaBridge.setMode('buildingPetbot', { screen: 'shop' });
```

## Starting and stopping quests

```js
WaaBridge.startQuest('solo');
WaaBridge.startQuest('team');
WaaBridge.expandQuest();
WaaBridge.returnQuest();
WaaBridge.stopQuest();
```

## Adding a new PetBot screen

1. Add the screen rendering inside `petbot_test.html`.
2. Give it a clear screen name, such as `clinic`, `map`, or `training`.
3. Add one route in `waa-bridge.js` if a platform building should open it.
4. Do not add another fullscreen handler.

Example:

```js
function placeToScreen(place){
  if(place==='clinic') return 'clinic';
  return 'petActions';
}
```

## Quest state rule

Do not use a permanent `localStorage` value to mean "quest is active".

The bridge uses a short heartbeat named `waaQuestActiveAt`. If the parent quest stops sending the heartbeat, PetBot returns to normal instead of staying on a blank transparent screen.


CORRECTED NOTE 20260705-one-bridge-3:
The old inline FINAL FULLSCREEN ROUTER was removed from index.html. Do not add it back. Fullscreen / Tamagotchi / quest switching now belongs in waa-bridge.js only.

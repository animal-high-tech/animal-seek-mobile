export const ICONS = {
  dog: '🐶',
  cat: '🐱',
  rabbit: '🐰',
  fox: '🦊',
  bear: '🐻',
  panda: '🐼',
  koala: '🐨',
  tiger: '🐯',
  lion: '🦁',
  cow: '🐮',
  pig: '🐷',
  frog: '🐸',
  monkey: '🐵',
};

export const CONTRIBUTOR_ICON_IDS = Object.keys(ICONS);

export function pickRandomContributorIconId() {
  return CONTRIBUTOR_ICON_IDS[Math.floor(Math.random() * CONTRIBUTOR_ICON_IDS.length)];
}


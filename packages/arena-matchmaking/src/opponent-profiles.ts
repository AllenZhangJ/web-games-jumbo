export interface OpponentProfile {
  readonly id: string;
  readonly displayName: string;
  readonly portraitKey: string;
  readonly appearanceKey: string;
}

const RAW_OPPONENT_PROFILES = Object.freeze([
  ['opponent-comet', '小彗星', 'portrait-comet', 'runner-coral'],
  ['opponent-sprout', '芽芽', 'portrait-sprout', 'runner-mint'],
  ['opponent-gear', '发条七号', 'portrait-gear', 'robot-brass'],
  ['opponent-mochi', '糯米团', 'portrait-mochi', 'runner-cream'],
  ['opponent-spark', '闪闪', 'portrait-spark', 'robot-cobalt'],
  ['opponent-pebble', '小石子', 'portrait-pebble', 'runner-slate'],
  ['opponent-orbit', '轨道圈', 'portrait-orbit', 'robot-violet'],
  ['opponent-maple', '枫糖', 'portrait-maple', 'runner-amber'],
  ['opponent-bubble', '气泡三号', 'portrait-bubble', 'robot-aqua'],
  ['opponent-patch', '补丁熊', 'portrait-patch', 'runner-denim'],
  ['opponent-lantern', '纸灯', 'portrait-lantern', 'robot-scarlet'],
  ['opponent-cloud', '云朵队长', 'portrait-cloud', 'runner-sky'],
] as const);

export const OPPONENT_PROFILES: readonly OpponentProfile[] = Object.freeze(
  RAW_OPPONENT_PROFILES.map(([id, displayName, portraitKey, appearanceKey]) => Object.freeze({
    id,
    displayName,
    portraitKey,
    appearanceKey,
  })),
);

export function copyOpponentProfile(profile: unknown): OpponentProfile {
  if (!OPPONENT_PROFILES.includes(profile as OpponentProfile)) {
    throw new RangeError('未知的虚构对手资料。');
  }
  const knownProfile = profile as OpponentProfile;
  return Object.freeze({
    id: knownProfile.id,
    displayName: knownProfile.displayName,
    portraitKey: knownProfile.portraitKey,
    appearanceKey: knownProfile.appearanceKey,
  });
}

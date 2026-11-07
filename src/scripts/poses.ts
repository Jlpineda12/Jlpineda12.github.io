// Expressions for the vector puppet. Frame numbers refer to José's PSD animation layers:
// lens 0 = eyes open … 5 = heavy lids; pupil 0 = full … 3 = mostly hidden;
// mouth 0 = big laugh … 7–8 = smile … 9–11 = neutral … 12–13 = unsure / bored.
export type Pose = 'calm' | 'bored' | 'happy' | 'listen' | 'think' | 'idea' | 'build' | 'celebrate' | 'sleep' | 'travel' | 'story' | 'learn' | 'play' | 'pose' | 'vr' | 'wait' | 'code' | 'sculpt';

export type PoseDef = {
  lens: number | 'closed';
  pupil: number;
  mouth: number;
  phones: boolean;
  hands: boolean;
  look?: [number, number];
  tilt?: number;
};

export const POSES: Record<Pose, PoseDef> = {
  calm: { lens: 0, pupil: 0, mouth: 8, phones: false, hands: false },
  bored: { lens: 5, pupil: 0, mouth: 13, phones: false, hands: false, look: [0, 14] },
  happy: { lens: 0, pupil: 0, mouth: 0, phones: true, hands: true },
  travel: { lens: 0, pupil: 0, mouth: 1, phones: true, hands: true },
  listen: { lens: 1, pupil: 0, mouth: 7, phones: true, hands: false, look: [-14, 4], tilt: -3 },
  think: { lens: 1, pupil: 0, mouth: 12, phones: false, hands: false, look: [12, -2], tilt: 4 },
  idea: { lens: 0, pupil: 0, mouth: 2, phones: false, hands: false },
  build: { lens: 1, pupil: 0, mouth: 10, phones: false, hands: false, look: [-12, 12], tilt: 2 },
  celebrate: { lens: 3, pupil: 0, mouth: 0, phones: true, hands: true, look: [0, 8], tilt: -3 },
  sleep: { lens: 'closed', pupil: 0, mouth: 9, phones: false, hands: false, tilt: 4 },
  // Telling a story: mid-sentence, looking at you.
  story: { lens: 0, pupil: 0, mouth: 2, phones: false, hands: false, tilt: -2 },
  // Learning: eyes down on a book, lids a little lower.
  learn: { lens: 1, pupil: 0, mouth: 10, phones: false, hands: false, look: [-12, 14], tilt: 3 },
  // Gaming: focused on the screen, controller in hand.
  play: { lens: 1, pupil: 0, mouth: 10, phones: true, hands: true, look: [0, 8] },
  // Posing for the player-card photo.
  pose: { lens: 0, pupil: 0, mouth: 7, phones: false, hands: false },
  // Inside a virtual world: wide eyes, mouth open in wonder.
  vr: { lens: 0, pupil: 0, mouth: 3, phones: true, hands: true, look: [-14, -6] },
  // Waiting for an answer, a little unsure.
  wait: { lens: 0, pupil: 0, mouth: 12, phones: false, hands: false, look: [14, -4] },
  // Writing code: eyes on the screen.
  // Sculpting in 3D: watching the model spin beside him.
  sculpt: { lens: 0, pupil: 0, mouth: 8, phones: false, hands: false, look: [14, 10] },
  code: { lens: 1, pupil: 0, mouth: 11, phones: true, hands: false, look: [-8, 10] },
};

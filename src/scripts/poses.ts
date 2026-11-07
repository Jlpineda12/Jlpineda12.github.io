// Expressions for the vector puppet. Frame numbers refer to José's PSD animation layers:
// lens 0 = eyes open … 5 = heavy lids; pupil 0 = full … 3 = mostly hidden;
// mouth 0 = big laugh … 7–8 = smile … 9–11 = neutral … 12–13 = unsure / bored.
export type Pose = 'calm' | 'bored' | 'happy' | 'listen' | 'think' | 'idea' | 'build' | 'celebrate' | 'sleep' | 'travel';

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
  build: { lens: 1, pupil: 0, mouth: 10, phones: false, hands: true, look: [0, 12], tilt: 2 },
  celebrate: { lens: 3, pupil: 0, mouth: 0, phones: true, hands: true, look: [0, 8], tilt: -3 },
  sleep: { lens: 'closed', pupil: 0, mouth: 9, phones: false, hands: false, tilt: 4 },
};

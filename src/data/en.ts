// English text for the site. Spanish (site.ts) is the source: this file only overrides the words.
// Keys match the Spanish data (project slug, world id, process island…).

export const enSite = {
  role: 'Multimedia engineer',
  title: 'José Luis Pineda — Multimedia engineer',
  description:
    'Portfolio of José Luis Pineda, a multimedia engineer in Bogotá: video games, software and immersive worlds.',
  tagline: 'Multimedia engineer. I make video games, software and immersive worlds that feel like playing.',
  facts: [
    { label: 'City', value: 'Bogotá, Colombia' },
    { label: 'Studies', value: 'Multimedia Engineering, UMNG' },
    { label: 'Languages', value: 'Native Spanish, English B2' },
    { label: 'Status', value: 'Open to work' },
  ],
};

export const enProjects: Record<string, { name?: string; kind: string; summary: string; linkLabel: string; status?: string; stack?: string[] }> = {
  'arcade-station': {
    kind: 'Retro video games',
    summary:
      'A 1984 arcade cabinet in the browser with five classics: Snake, Combat, Space, Breaker and Maze. The chiptune music is synthesised in real time and a CRT filter completes the illusion.',
    linkLabel: 'Play now',
  },
  'ojos-del-planeta': {
    name: 'Eyes of the Planet',
    kind: 'Serious game in virtual reality',
    summary:
      'Puts you behind the eyes of a bee: dodge pesticides and predators like wasps while you collect pollen from the flowers.',
    linkLabel: 'See it on Behance',
  },
  'misterios-trigonometricos': {
    name: 'Trigonometric Mysteries',
    kind: 'Educational virtual reality game',
    summary:
      'Maths puzzles in VR to learn the law of sines and cosines, tested with students from Liceo Lunita in Chía.',
    linkLabel: 'See it on Behance',
    status: 'Degree thesis',
  },
  'personajes-3d': {
    name: '3D characters',
    kind: 'Modelling, sculpting and texturing',
    summary:
      'Original characters and fan art, modelled, sculpted and textured. Pick one and explore it in 3D: spin it, zoom in and look at every detail.',
    linkLabel: 'See everything on Sketchfab',
  },
  rigging: {
    name: 'Character rigging',
    kind: 'Rigging reel',
    summary: 'A character I modelled and rigged myself: joints, weight painting and deformation tests in motion.',
    linkLabel: 'Watch on YouTube',
  },
  'stop-motion': {
    name: 'Stop-motion ad',
    kind: 'Frame-by-frame animation',
    summary: 'An advertising piece in stop motion: set building, frame-by-frame animation and post-production.',
    linkLabel: 'See it on Behance',
    stack: ['Stop motion', 'Photography', 'Post-production'],
  },
  'threejs-lab': {
    name: '3D Lab',
    kind: 'Procedural geometry in WebGL',
    summary:
      'Thirteen Three.js experiments: prisms, pyramids and polyhedra generated in code, matrix transformations, cameras and controls.',
    linkLabel: 'See the experiments',
    stack: ['Three.js', 'WebGL', 'Linear algebra'],
  },
  lingopulse: {
    kind: 'Mobile app to learn English',
    summary:
      'An English simulator with a Tamagotchi-like 3D companion that grows with you. Gamification, streaks and AI corrections. I am still building it.',
    linkLabel: 'See the code',
    status: 'In development',
    stack: ['React Native', 'Expo', 'Three.js', 'AI'],
  },
  'melodia-ai': {
    name: 'Melodía',
    kind: 'Artificial intelligence',
    summary:
      'Classifies musical instruments and acoustic patterns with convolutional and recurrent neural networks. My final Engineering project at UMNG.',
    linkLabel: 'See the demo',
  },
  neurotext: {
    kind: 'Text prediction',
    summary:
      'Type the start of a sentence and a deep learning model completes it in real time. A Flask API with TensorFlow and a web interface to try it.',
    linkLabel: 'Try it',
  },
  gamevault: {
    kind: 'REST API and web panel',
    summary:
      'To catalogue a video game collection: each game’s status, reviews, scores and statistics. Full CRUD with a lightweight web panel.',
    linkLabel: 'See the code',
  },
};

export const enWorlds: Record<string, { name: string; blurb: string; harmony: string }> = {
  juegos: { name: 'Video games', blurb: 'Mechanics, rhythm and that moment when someone says “one more”.', harmony: 'Red and teal: complementary' },
  vr: { name: 'Virtual reality', blurb: 'Worlds you don’t look at: you walk through them, with a Meta Quest on.', harmony: 'Blue and orange: complementary' },
  '3d': { name: '3D and rigging', blurb: 'Characters that get modelled, sculpted, rigged and set in motion.', harmony: 'Green and pink: complementary' },
  software: { name: 'Software and AI', blurb: 'APIs, apps and neural networks: what you don’t see, but holds everything up.', harmony: 'Deep blue and yellow: complementary' },
};

export const enProcess: Record<string, { name: string; title: string; text: string }> = {
  empatizar: { name: 'Empathise', title: 'I listen before I talk', text: 'I put on the other person’s headphones: interviews, observation and a lot of listening to understand what they need and feel.' },
  definir: { name: 'Define', title: 'I find the real problem', text: 'I sort what I learned and turn it into a clear challenge. A well-defined problem is already half the design.' },
  idea: { name: 'Ideate', title: 'Many ideas, then the best', text: 'Sketches, references and fearless brainstorming. Then I pick the ones that best answer the challenge.' },
  prototipo: { name: 'Prototype', title: 'It works and it feels right', text: 'I build a playable prototype. Function comes first, but design travels with me from the very first block.' },
  pruebas: { name: 'Test', title: 'I play and let others play', text: 'I put it in other hands, watch where people get stuck and adjust. I repeat until every button answers like a good controller.' },
};

export const enSoftSkills = [
  'Creative problem solving',
  'Teamwork',
  'Communication',
  'Fast learning',
  'Leadership and organisation',
  'Critical thinking',
  'Attention to detail',
];

export const enStudioSpots = [
  { label: 'The screen', text: 'Unity, Blender and the code editor open all at once.' },
  { label: 'The mug', text: 'Coffee. The official fuel of every game jam.' },
  { label: 'The lamp', text: 'My best ideas show up at night.' },
  { label: 'The plant', text: 'Still alive. Like my projects: with constant care.' },
  { label: 'The tree', text: 'Going for a walk is part of the process too.' },
];

export const enTools: Record<string, { group: string; items: string }> = {
  Videojuegos: { group: 'Video games', items: 'Unity, C#, interactive and immersive experiences' },
  '3D y animación': { group: '3D and animation', items: 'Blender, Maya, Three.js' },
  'Diseño e ilustración': { group: 'Design and illustration', items: 'Photoshop, Procreate, UI/UX' },
  Programación: { group: 'Programming', items: 'Java, C#, C++, Python, JavaScript, TypeScript' },
  'Web y backend': { group: 'Web and backend', items: 'Node.js, Express, Prisma, React Native' },
  'Inteligencia artificial': { group: 'Artificial intelligence', items: 'TensorFlow, Keras, Flask' },
};

export const enLanguages: Record<string, { group: string; items: string }> = {
  Español: { group: 'Spanish', items: 'Nativo' },
  Inglés: { group: 'English', items: 'B2' },
};

// Todo el contenido del sitio vive aquí. Cambia textos, proyectos y enlaces en este archivo.
// Lo marcado con PENDIENTE falta por completar antes de publicar.

export const site = {
  name: { first: 'José Luis', last: 'Pineda' },
  role: 'Ingeniero en multimedia',
  title: 'José Luis Pineda — Ingeniero en multimedia',
  description:
    'Portafolio de José Luis Pineda, ingeniero en multimedia en Bogotá: videojuegos, software y mundos inmersivos.',
  tagline: 'Ingeniero en multimedia. Hago videojuegos, software y mundos inmersivos que se sienten como jugar.',
  email: 'joseluispineda177@gmail.com',
  socials: [
    { label: 'GitHub', icon: 'github', handle: '@Jlpineda12', url: 'https://github.com/Jlpineda12' },
    { label: 'LinkedIn', icon: 'linkedin', handle: 'José Pineda', url: 'https://www.linkedin.com/in/jose-pineda-7041492b7/' },
  ],
  facts: [
    { label: 'Ciudad', value: 'Bogotá, Colombia' },
    { label: 'Estudios', value: 'Ingeniería en Multimedia, UMNG' },
    { label: 'Idiomas', value: 'Español nativo, inglés B2' },
    { label: 'Estado', value: 'Abierto a trabajo' },
  ],
};

export type Project = {
  slug: string;
  name: string;
  kind: string;
  year?: string;
  summary: string;
  stack: string[];
  url: string; // demo, repositorio o publicación
  linkLabel: string;
  world: 'juegos' | 'vr' | '3d' | 'software';
  poster: string; // imagen en public/
  video?: string; // loop mp4 en public/ (portadas animadas hechas en Blender)
  youtube?: string; // id de un video de YouTube
  models?: { uid: string; name: string }[]; // modelos de Sketchfab para el visor 3D
  status?: string;
  embed?: string; // página que puede jugarse dentro de la pantalla de la consola
  isNew?: boolean;
};

// Proyectos reales (GitHub, Behance, Sketchfab y YouTube de José).
export const projects: Project[] = [
  {
    slug: 'digital-human',
    name: 'Jose.exe',
    kind: 'Humano digital con IA en pixel art',
    year: '2026',
    summary:
      'Mi gemelo digital: un chatbot con cara. Lo modelé por código en Blender a partir de mi dibujo, lo convertí a pixel art con mi addon Pixel Sprite Forge y lo animé en tiempo real con Three.js. Reacciona a cada pregunta, piensa, duda cuando no sabe y responde sobre mí con una voz de 8 bits que mueve la boca sílaba por sílaba.',
    stack: ['Three.js', 'Blender', 'IA (Claude)', 'Web Audio', 'Lip-sync'],
    url: 'https://jlpineda12.github.io/digital-human/',
    linkLabel: 'Hablar con él',
    world: 'software',
    poster: 'img/digital-human.webp',
    video: 'video/digital-human.mp4',
    status: 'Beta',
    embed: 'https://jlpineda12.github.io/digital-human/',
    isNew: true,
  },
  {
    slug: 'arcade-station',
    name: 'Arcade Station',
    kind: 'Videojuegos retro',
    year: '2026',
    summary:
      'Una máquina arcade de 1984 en el navegador con cinco clásicos: Snake, Combat, Space, Breaker y Maze. La música chiptune se sintetiza en tiempo real y un filtro CRT completa la ilusión.',
    stack: ['JavaScript', 'Canvas', 'Web Audio API'],
    url: 'https://jlpineda12.github.io/arcade-station/',
    linkLabel: 'Jugar ahora',
    world: 'juegos',
    poster: 'img/arcade-station.jpg',
  },
  {
    slug: 'ojos-del-planeta',
    name: 'Ojos del Planeta',
    kind: 'Juego serio en realidad virtual',
    summary:
      'Te pone dentro de los ojos de una abeja: esquivas pesticidas y depredadores como avispas mientras recolectas polen de las flores.',
    stack: ['Unity', 'C#', 'Meta Quest'],
    url: 'https://www.behance.net/gallery/230275761/Los-ojos-del-planeta',
    linkLabel: 'Ver en Behance',
    world: 'vr',
    poster: 'img/ojos-del-planeta.webp',
  },
  {
    slug: 'misterios-trigonometricos',
    name: 'Misterios Trigonométricos',
    kind: 'Juego educativo en realidad virtual',
    summary:
      'Puzzles matemáticos en VR para aprender la ley de senos y cosenos, probados con estudiantes del Liceo Lunita, en Chía.',
    stack: ['Unity', 'C#', 'Meta Quest', 'VR'],
    url: 'https://www.behance.net/gallery/249687717/MISTERIOS-TRIGONOMETRICOS',
    linkLabel: 'Ver en Behance',
    world: 'vr',
    poster: 'img/misterios-trigonometricos.webp',
    status: 'Tesis de grado',
  },
  {
    slug: 'personajes-3d',
    name: 'Personajes 3D',
    kind: 'Modelado, escultura y texturizado',
    summary:
      'Personajes originales y fan art modelados, esculpidos y texturizados. Elige uno y explóralo en 3D: gíralo, acércate y mira cada detalle.',
    stack: ['Blender', 'Substance', 'Sketchfab'],
    url: 'https://sketchfab.com/PINEDITA',
    linkLabel: 'Ver todo en Sketchfab',
    world: '3d',
    poster: 'img/personajes-3d.webp',
    models: [
      { uid: '8732af4199d84e9d860559370d8b74a2', name: 'Kaonashi' },
      { uid: 'c883681066e841118255958c5bfb1868', name: 'Cuarto' },
      { uid: '145dce30d2864066a39cd546ee712b29', name: 'Rick' },
      { uid: '6fe5be55cdee4bb5b853aea3389a6361', name: 'Neptor' },
      { uid: 'cd98ac28a2fe43659176c06d015b3d44', name: 'Patineta' },
      { uid: '7972a9ba740045b592d21cd207972005', name: 'Hacha de minotauro' },
    ],
  },
  {
    slug: 'rigging',
    name: 'Rigging de personaje',
    kind: 'Reel de rigging',
    summary:
      'Un personaje que modelé y rigueé yo mismo: articulaciones, pintura de pesos y pruebas de deformación en movimiento.',
    stack: ['Maya', 'Rigging', 'Weight painting'],
    url: 'https://www.youtube.com/watch?v=fLkiwDHpXfQ',
    linkLabel: 'Ver en YouTube',
    world: '3d',
    poster: 'img/rigging.webp',
    youtube: 'fLkiwDHpXfQ',
  },
  {
    slug: 'stop-motion',
    name: 'Stop motion publicitario',
    kind: 'Animación cuadro a cuadro',
    summary:
      'Una pieza publicitaria en stop motion: construcción del set, animación cuadro a cuadro y postproducción.',
    stack: ['Stop motion', 'Fotografía', 'Postproducción'],
    url: 'https://www.behance.net/gallery/206660619/Proyecto-stopMotion-para-publicidad',
    linkLabel: 'Ver en Behance',
    world: '3d',
    poster: 'img/stop-motion.webp',
  },
  {
    slug: 'threejs-lab',
    name: 'Laboratorio 3D',
    kind: 'Geometría procedural en WebGL',
    year: '2026',
    summary:
      'Trece experimentos con Three.js: prismas, pirámides y poliedros generados por código, transformaciones con matrices, cámaras y controles.',
    stack: ['Three.js', 'WebGL', 'Álgebra lineal'],
    url: 'https://github.com/Jlpineda12?tab=repositories&q=threejs',
    linkLabel: 'Ver los experimentos',
    world: '3d',
    poster: 'img/threejs-lab.jpg',
    video: 'video/threejs-lab.mp4',
  },
  {
    slug: 'lingopulse',
    name: 'LingoPulse',
    kind: 'App móvil para aprender inglés',
    year: '2026',
    summary:
      'Un simulador de inglés con un compañero 3D tipo Tamagotchi que crece contigo. Gamificación, rachas y corrección con inteligencia artificial. Todavía lo estoy construyendo.',
    stack: ['React Native', 'Expo', 'Three.js', 'IA'],
    url: 'https://github.com/Jlpineda12/lingopulse',
    linkLabel: 'Ver el código',
    world: 'software',
    poster: 'img/lingopulse.jpg',
    video: 'video/lingopulse.mp4',
    status: 'En desarrollo',
  },
  {
    slug: 'melodia-ai',
    name: 'Melodía',
    kind: 'Inteligencia artificial',
    year: '2026',
    summary:
      'Clasifica instrumentos musicales y patrones acústicos con redes neuronales convolucionales y recurrentes. Proyecto final de Ingeniería en la UMNG.',
    stack: ['CNN', 'RNN', 'TensorFlow', 'JavaScript'],
    url: 'https://jlpineda12.github.io/melodia-ai/',
    linkLabel: 'Ver la demo',
    world: 'software',
    poster: 'img/melodia-ai.jpg',
  },
  {
    slug: 'neurotext',
    name: 'NeuroText',
    kind: 'Predicción de texto',
    year: '2026',
    summary:
      'Escribes el inicio de una frase y un modelo de deep learning la completa en tiempo real. Una API en Flask con TensorFlow y una interfaz web para probarla.',
    stack: ['Python', 'Flask', 'TensorFlow', 'Keras'],
    url: 'https://jlpineda12.github.io/neurotext-web/',
    linkLabel: 'Probarlo',
    world: 'software',
    poster: 'img/neurotext.jpg',
  },
  {
    slug: 'gamevault',
    name: 'GameVault',
    kind: 'API REST y panel web',
    year: '2026',
    summary:
      'Para catalogar una colección de videojuegos: estado de cada juego, reseñas, puntajes y estadísticas. CRUD completo con un panel web ligero.',
    stack: ['Node.js', 'Express', 'Prisma', 'SQLite'],
    url: 'https://github.com/Jlpineda12/gamevault-api',
    linkLabel: 'Ver el código',
    world: 'software',
    poster: 'img/gamevault.jpg',
    video: 'video/gamevault.mp4',
  },
];

// Los mundos del mapa de proyectos. Cada uno tiene su paleta (teoría del color: pares complementarios).
export const worlds = [
  {
    id: 'juegos',
    name: 'Videojuegos',
    island: 'juegos',
    blurb: 'Mecánicas, ritmo y ese momento en que alguien dice “una más”.',
    bg: '#b02e2e', ink: '#ffffff', accent: '#2fb3a6', soft: '#c94040',
    harmony: 'Rojo y verde azulado: complementarios',
  },
  {
    id: 'vr',
    name: 'Realidad virtual',
    island: 'vr',
    blurb: 'Mundos que no se miran: se recorren con el cuerpo, con un Meta Quest puesto.',
    bg: '#4b5bd1', ink: '#ffffff', accent: '#f2a33a', soft: '#5b6ee1',
    harmony: 'Azul y naranja: complementarios',
  },
  {
    id: '3d',
    name: '3D y rigging',
    island: 'rigging',
    blurb: 'Personajes que se modelan, se esculpen, se riguean y se mueven.',
    bg: '#2f6e4a', ink: '#ffffff', accent: '#f08aa8', soft: '#3b7d57',
    harmony: 'Verde y rosa: complementarios',
  },
  {
    id: 'software',
    name: 'Software e IA',
    island: 'software',
    blurb: 'APIs, apps y redes neuronales: lo que no se ve, pero sostiene todo.',
    bg: '#3d4a7a', ink: '#ffffff', accent: '#f2c14e', soft: '#4a5890',
    harmony: 'Azul profundo y amarillo: complementarios',
  },
] as const;

// Quién soy: datos de la ficha, habilidades y los puntos interactivos del estudio.
export const softSkills = [
  'Resolución creativa de problemas',
  'Trabajo en equipo',
  'Comunicación',
  'Aprendizaje rápido',
  'Liderazgo y organización',
  'Pensamiento crítico',
  'Atención al detalle',
];

export const studioSpots = [
  { x: 53, y: 36, label: 'La pantalla', text: 'Unity, Blender y el editor de código abiertos al mismo tiempo.' },
  { x: 37, y: 45, label: 'La taza', text: 'Café. El combustible oficial de cada game jam.' },
  { x: 78, y: 33, label: 'La lámpara', text: 'Mis mejores ideas llegan de noche.' },
  { x: 81, y: 53, label: 'La planta', text: 'Sigue viva. Como mis proyectos: con cuidado constante.' },
  { x: 19, y: 44, label: 'El árbol', text: 'Salir a caminar también es parte del proceso.' },
];

// Cómo trabajo: las cinco fases del design thinking, cada una con su isla y una pose del personaje.
export const process = [
  {
    island: 'empatizar',
    pose: 'listen',
    name: 'Empatizar',
    title: 'Escucho antes de hablar',
    text: 'Me pongo los audífonos de la otra persona: entrevistas, observación y mucha escucha para entender qué necesita y qué siente.',
  },
  {
    island: 'definir',
    pose: 'think',
    name: 'Definir',
    title: 'Encuentro el problema real',
    text: 'Ordeno lo que aprendí y lo convierto en un reto claro. Un problema bien definido ya es medio diseño.',
  },
  {
    island: 'idea',
    pose: 'idea',
    name: 'Idear',
    title: 'Muchas ideas, luego las mejores',
    text: 'Bocetos, referencias y lluvia de ideas sin miedo. Después elijo las que mejor responden al reto.',
  },
  {
    island: 'prototipo',
    pose: 'build',
    name: 'Prototipar',
    title: 'Que funcione y se sienta bien',
    text: 'Construyo un prototipo jugable. La funcionalidad va primero, pero el diseño viaja conmigo desde el primer bloque.',
  },
  {
    island: 'pruebas',
    pose: 'celebrate',
    name: 'Testear',
    title: 'Juego y dejo jugar',
    text: 'Lo pongo en otras manos, miro dónde se traban y ajusto. Repito hasta que cada botón responda como un buen control.',
  },
] as const;

// Formación, herramientas e idiomas (del portafolio anterior).
export const experience = [
  {
    group: 'Formación',
    rows: [['Ingeniería en Multimedia', 'Pregrado', 'Universidad Militar Nueva Granada', 'Bogotá']],
  },
];

export const tools = [
  { group: 'Videojuegos', items: 'Unity, C#, experiencias interactivas e inmersivas' },
  { group: '3D y animación', items: 'Blender, Maya, Three.js' },
  { group: 'Diseño e ilustración', items: 'Photoshop, Procreate, UI/UX' },
  { group: 'Programación', items: 'Java, C#, C++, Python, JavaScript, TypeScript' },
  { group: 'Web y backend', items: 'Node.js, Express, Prisma, React Native' },
  { group: 'Inteligencia artificial', items: 'TensorFlow, Keras, Flask' },
];

export const languages = [
  { group: 'Español', items: 'Nativo' },
  { group: 'Inglés', items: 'B2' },
];

# Portafolio de José Luis Pineda

Un viaje por mi mundo: videojuegos, realidad virtual, 3D y software. Sitio estático hecho con
[Astro](https://astro.build), animado con GSAP y con mi personaje en vector, sacado capa por capa de
`Personaje.psd`. En español en `/` y en inglés en `/en/`.

## Ver el sitio en tu computador

```bash
npm install
npm run build
npm run preview
```

Abre http://localhost:4321. (Con Node 26 el modo `npm run dev` falla por una incompatibilidad de Vite;
`build` + `preview` funciona siempre. Con Node 22 también sirve `npm run dev`.)

## Dónde cambiar las cosas

| Qué | Dónde |
| --- | --- |
| Textos, proyectos, mundos, fases, herramientas (español) | `src/data/site.ts` |
| Los mismos textos en inglés | `src/data/en.ts` |
| Botones, títulos y frases de la interfaz (ES y EN) y los logros | `src/i18n.ts` |
| Tu correo, GitHub y LinkedIn | `src/data/site.ts` → `email`, `socials` |
| Imágenes de proyectos | `public/img/` |
| Portadas animadas | `public/video/` |
| Islas y nubes (Blender) | `public/world/` |
| Letras 3D del nombre y stickers del inicio (Blender) | `public/hero/`, `src/data/hero3d.json` |
| Color de cada capítulo (teoría del color) | `src/styles/global.css` → `[data-scene]` |

Para agregar un proyecto, copia uno en `projects` (`site.ts`), elige su `world` (`juegos`, `vr`, `3d`
o `software`), pon su imagen en `public/img/` y su texto en inglés en `en.ts`.

## El personaje

- `Personaje.psd` → `scripts/psd-extract.py` saca cada capa y cada cuadro de animación como SVG en
  `character-src/` (necesita `pip install psd-tools`).
- `scripts/build-puppet.py` arma `src/components/PuppetSprite.astro`: todas las piezas una sola vez.
- `src/components/Puppet.astro` dibuja al personaje con una pose; `src/scripts/poses.ts` define las
  expresiones (párpados, boca, audífonos, control) y `src/scripts/puppet.ts` las animaciones
  (parpadeo, mirar, reír, pensar, idea, construir, celebrar, dormir, viajar y la intro original).

Si cambias el PSD, vuelve a correr los dos scripts.

## El inicio en 3D

`blender/hero3d.py` modela y renderiza en Blender cada letra del nombre (infladas, crema brillante) y
los stickers de los mundos (control, visor VR, gema 3D, chip de IA y claqueta), cada uno con fondo
transparente. También escribe sus tamaños en `src/data/hero3d.json`, que la página usa para armar el
nombre como tipografía y poner la cara de José en la "O":

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P blender/hero3d.py -- "$PWD" all 128
```

(`letters` o `stickers` en lugar de `all` renderiza solo una parte; el último número son las muestras.)

## Mundo en Blender

`blender/world2d.py` dibuja las islas en 2D plano y `blender/covers2d.py` las portadas animadas:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P blender/world2d.py -- "$PWD"
```

## Publicar en GitHub Pages

El flujo `.github/workflows/deploy.yml` construye y publica cada vez que subes cambios a `main`.
Si el repositorio se llama `Jlpineda12.github.io`, el sitio queda en https://jlpineda12.github.io/;
con cualquier otro nombre queda en https://jlpineda12.github.io/<nombre-del-repo>/.
En GitHub: Settings → Pages → Source: **GitHub Actions**.

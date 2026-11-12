// A stand-in for the game's particle engine, for the tests.
//
// Bloxd draws particles with Babylon.js. This file repeats, step by step, what
// Babylon's ParticleSystem does with one particle: how it is made from the
// options of api.playParticleEffect and how every frame changes it. It follows
// packages/dev/core/src/Particles/particleSystem.ts and Misc/gradients.ts of
// Babylon.js (Apache License 2.0, https://github.com/BabylonJS/Babylon.js),
// including the two habits that matter for timing:
//   - a particle remembers the value of the gradient stop it last left, so a
//     frame that jumps over a stop leaves the next stretch with a wrong start;
//   - the direction is used first and pulled by gravity afterwards.
// It assumes Bloxd hands its options to Babylon unchanged (colours as 0-255,
// alpha as 0-1), which is how the documented example behaves.

/** Babylon's Scalar.RandomRange */
const range = (min, max, random) => (min === max ? min : random() * (max - min) + min);

/** Babylon's GradientHelper.GetCurrentGradient: [current, next, scale] */
function currentGradient(ratio, gradients) {
  if (gradients[0].gradient > ratio) return [gradients[0], gradients[0], 1];
  for (let i = 0; i < gradients.length - 1; i++) {
    const current = gradients[i];
    const next = gradients[i + 1];
    if (ratio >= current.gradient && ratio <= next.gradient) {
      return [current, next, (ratio - current.gradient) / (next.gradient - current.gradient)];
    }
  }
  const last = gradients[gradients.length - 1];
  return [last, last, 1];
}

const byGradient = (a, b) => a.gradient - b.gradient;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** Frame length in particle age for a frame rate (Babylon: updateSpeed 0.01 at 60 fps). */
export const frameAge = (fps) => 0.01 * (60 / fps);

/**
 * One particle of one playParticleEffect call.
 * options : what was passed to api.playParticleEffect (manualEmitCount 1)
 * random  : stand-in for Math.random
 */
export function createParticle(options, random = Math.random) {
  const o = options;
  const colors = o.colorGradients.map((g) => ({
    gradient: g.timeFraction,
    color1: [g.minColor[0] / 255, g.minColor[1] / 255, g.minColor[2] / 255, g.minColor[3]],
    color2: g.maxColor ? [g.maxColor[0] / 255, g.maxColor[1] / 255, g.maxColor[2] / 255, g.maxColor[3]] : null,
  })).sort(byGradient);
  const speeds = o.velocityGradients.map((g) => ({
    gradient: g.timeFraction, factor1: g.factor, factor2: g.factor2,
  })).sort(byGradient);
  const colorOf = (g) => (g.color2 ? mix(g.color1, g.color2, random()) : g.color1.slice());
  const factorOf = (g) => (g.factor2 === undefined || g.factor2 === g.factor1
    ? g.factor1 : g.factor1 + (g.factor2 - g.factor1) * random());

  const p = { age: 0, alive: true };
  p.lifeTime = range(o.minLifeTime, o.maxLifeTime, random);
  const power = range(o.minEmitPower, o.maxEmitPower, random);
  p.position = [0, 1, 2].map((i) => range(o.pos1[i], o.pos2[i], random));
  p.direction = [0, 1, 2].map((i) => range(o.dir1[i], o.dir2[i], random) * power);
  p.size = range(o.minSize, o.maxSize, random);
  p.speedGradient = speeds[0];
  p.speed1 = factorOf(speeds[0]);
  p.speed2 = speeds.length > 1 ? factorOf(speeds[1]) : p.speed1;
  p.colorGradient = colors[0];
  p.color = colorOf(colors[0]);
  p.color1 = p.color.slice();
  p.color2 = colors.length > 1 ? colorOf(colors[1]) : p.color.slice();

  /** Advance one frame of `step` age. Returns false once the particle is gone. */
  p.update = (step) => {
    if (!p.alive) return false;
    let h = step;
    const before = p.age;
    p.age += h;
    if (p.age > p.lifeTime) {
      h = ((p.lifeTime - before) * h) / (p.age - before);
      p.age = p.lifeTime;
    }
    const ratio = p.age / p.lifeTime;

    const [cc, cn, cs] = currentGradient(ratio, colors);
    if (cc !== p.colorGradient) {
      p.color1 = p.color2.slice();
      p.color2 = colorOf(cn);
      p.colorGradient = cc;
    }
    p.color = mix(p.color1, p.color2, cs);

    let scale = h;
    const [vc, vn, vs] = currentGradient(ratio, speeds);
    if (vc !== p.speedGradient) {
      p.speed1 = p.speed2;
      p.speed2 = factorOf(vn);
      p.speedGradient = vc;
    }
    scale *= p.speed1 + (p.speed2 - p.speed1) * vs;

    p.position = p.position.map((v, i) => v + p.direction[i] * scale);
    p.direction = p.direction.map((v, i) => v + o.gravity[i] * h);
    if (p.age >= p.lifeTime) p.alive = false;
    return p.alive;
  };
  return p;
}

/**
 * How much of a particle is seen, the way each blend mode draws it:
 * 0 ignores alpha (only the colour counts), the others scale with alpha.
 * Returns the colour as it reaches the screen, relative to full strength 1.
 */
export function shown(particle, blendMode) {
  const [r, g, b, a] = particle.color;
  return blendMode === 0 ? [r, g, b] : [r * a, g * a, b * a];
}

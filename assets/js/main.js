$('.btn-contact').click(function(){
  window.scrollTo({top: document.body.scrollHeight, behavior: "smooth"});
});

//sc-intro 


// 인트로 - 커서로 뚫는 마스크 + 진행률
(function () {
  const intro = document.getElementById('intro');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function handoff() {
    document.dispatchEvent(new CustomEvent('intro:done'));
  }

  if (!intro) { handoff(); return; }

  if (reduced) {
    intro.remove();
    handoff();
    return;
  }

  document.documentElement.classList.add('is-intro');

  const hole = intro.querySelector('.hole');
  const trails = Array.from(intro.querySelectorAll('.trail'));
  const rule = intro.querySelector('.intro-rule i');
  const countEl = intro.querySelector('.intro-count');
  const warp = intro.querySelector('#introWarp feDisplacementMap');

  // 가로로 길게 찢긴 구멍 - 원이 아니라 배경 천의 결을 따르는 비율
  const WIDE = 2.3;
  const TALL = 0.62;

  // 커서가 오기 전까지는 화면 한가운데
  let px = window.innerWidth / 2;
  let py = window.innerHeight / 2;
  let tx = px;
  let ty = py;

  const state = { r: 0, bump: 0, progress: 0, trail: 1 };

  intro.addEventListener('pointermove', function (e) {
    tx = e.clientX;
    ty = e.clientY;
  });

  // 누르면 구멍이 잠깐 넓어진다
  intro.addEventListener('pointerdown', function () {
    gsap.to(state, { bump: 55, duration: 0.35, ease: 'power2.out' });
  });
  intro.addEventListener('pointerup', function () {
    gsap.to(state, { bump: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
  });

  // 잔상 - 앞선 원을 하나씩 늦게 따라가며 사슬을 이룬다
  const chain = trails.map(function () { return { x: px, y: py }; });

  let running = true;

  (function loop() {
    px += (tx - px) * 0.14;
    py += (ty - py) * 0.14;

    const r = Math.max(0, state.r + state.bump);

    // 구멍이 커져도 찢긴 정도가 같아 보이도록 왜곡을 비율대로 키운다
    warp.setAttribute('scale', (70 * Math.min(r / 84, 7)).toFixed(1));

    hole.setAttribute('cx', px.toFixed(1));
    hole.setAttribute('cy', py.toFixed(1));
    hole.setAttribute('rx', (r * WIDE).toFixed(1));
    hole.setAttribute('ry', (r * TALL).toFixed(1));

    let leadX = px;
    let leadY = py;
    for (let i = 0; i < chain.length; i++) {
      const c = chain[i];
      c.x += (leadX - c.x) * 0.13;
      c.y += (leadY - c.y) * 0.13;
      leadX = c.x;
      leadY = c.y;

      // 뒤로 갈수록 작아지고 더 납작해진다
      const k = (0.7 - i * 0.3) * state.trail;
      const el = trails[i];
      el.setAttribute('cx', c.x.toFixed(1));
      el.setAttribute('cy', c.y.toFixed(1));
      el.setAttribute('rx', (r * WIDE * k).toFixed(1));
      el.setAttribute('ry', (r * TALL * k * 0.8).toFixed(1));
    }

    if (running) requestAnimationFrame(loop);
  })();

  const LOAD = 2.6;

  gsap.timeline()
    // 구멍이 열리며 시작
    .to(state, { r: 84, duration: 1.1, ease: 'expo.out' }, 0)
    // 진행률 - 눈금선과 숫자가 함께 찬다
    .to(state, {
      progress: 1,
      duration: LOAD,
      ease: 'power2.inOut',
      onUpdate: function () {
        countEl.textContent = String(Math.round(state.progress * 100)).padStart(3, '0');
        rule.style.transform = 'scaleX(' + state.progress.toFixed(4) + ')';
        // 배경의 천이 이 진행률에 맞춰 짜인다
        document.dispatchEvent(new CustomEvent('intro:progress', { detail: state.progress }));
      }
    }, 0.2)
    // 다 차면 눈금이 반대쪽으로 걷힌다
    .to(rule, {
      scaleX: 0, transformOrigin: 'right center',
      duration: 0.7, ease: 'power3.inOut'
    }, LOAD + 0.45)
    .to(countEl, { opacity: 0, duration: 0.5, ease: 'power2.out' }, LOAD + 0.45)
    // 잔상은 본체로 빨려들듯 사라진다
    .to(state, { trail: 0, duration: 0.6, ease: 'power2.in' }, LOAD + 0.45)
    // 구멍이 화면을 삼키며 열린다
    .to(state, {
      r: Math.hypot(window.innerWidth, window.innerHeight),
      duration: 1.5,
      ease: 'expo.inOut',
      onComplete: function () {
        running = false;
        document.documentElement.classList.remove('is-intro');
        intro.remove();
        // 스크롤이 잠겨 있던 동안 잡힌 위치값을 다시 계산한다
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      }
    }, LOAD + 0.55)
    // 막이 걷히는 동안 이미 히어로가 살아나 있도록 먼저 신호를 보낸다
    .add(handoff, LOAD + 0.75);
})();



(function () {
  const inner = document.querySelector('.sc-intro .intro-inner');
  if (!inner) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    inner.classList.add('is-in');
    return;
  }

  // 글자 하나를 칸에 담는다. 칸이 넘치는 부분을 잘라 위아래로 빠지게 한다
  function cell(ch, delay) {
    const box = document.createElement('span');
    box.className = 'cell';
    const inner2 = document.createElement('i');
    inner2.textContent = ch;
    // 지연을 ms 로 박지 않고 35ms 를 한 칸으로 본 순번만 남긴다.
    // 실제 간격은 CSS 의 --cell-step 이 정하므로 스크롤 속도에 맞춰 줄일 수 있다
    inner2.style.setProperty('--i', (delay / 35).toFixed(3));
    box.appendChild(inner2);
    return box;
  }


  // <br class="m"> 은 이 프로젝트에서 750px 이하에서만 줄을 끊는 표시라
  // 넓은 화면에서는 한 줄로 잇고, 좁아지면 다시 끊어 담는다
  const narrow = window.matchMedia('(max-width: 750px)');

  function splitParts(html) {
    const chunks = html.split(/(<br\b[^>]*>)/i);
    const parts = [];
    let buf = '';
    chunks.forEach(function (chunk) {
      if (/^<br\b/i.test(chunk)) {
        // class 에 m 이 붙은 줄바꿈은 좁은 화면에서만 실제로 끊는다
        const onlyNarrow = /class\s*=\s*["'][^"']*\bm\b/i.test(chunk);
        if (!onlyNarrow || narrow.matches) {
          parts.push(buf);
          buf = '';
        } else {
          buf += ' ';
        }
        return;
      }
      const tmp = document.createElement('div');
      tmp.innerHTML = chunk;
      buf += (tmp.textContent || '');
    });
    parts.push(buf);
    return parts
      .map(function (s) { return s.replace(/\s+/g, ' ').trim(); })
      .filter(function (s) { return s.length; });
  }

  function buildLine(el, baseDelay) {
    const parts = splitParts(el.dataset.src);

    const frag = document.createDocumentFragment();
    let n = 0;
    parts.forEach(function (text) {
      const row = document.createElement('span');
      row.className = 'row';
      const move = document.createElement('span');
      move.className = 'move';
      Array.from(text).forEach(function (ch) {
        move.appendChild(cell(ch === ' ' ? ' ' : ch, baseDelay + n * 35));
        n++;
      });
      row.appendChild(move);
      frag.appendChild(row);
    });
    el.textContent = '';
    el.appendChild(frag);
  }
  function buildWords(el, baseDelay, step) {
    const words = el.textContent.replace(/\s+/g, ' ').trim().split(' ');
    const frag = document.createDocumentFragment();
    let n = 0;
    words.forEach(function (word, wi) {
      const wrap = document.createElement('span');
      wrap.className = 'word';
      Array.from(word).forEach(function (ch) {
        wrap.appendChild(cell(ch, baseDelay + n * step));
        n++;
      });
      frag.appendChild(wrap);
      if (wi < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });
    el.textContent = '';
    el.appendChild(frag);
  }

  const t1 = inner.querySelector('.title-line.t1');
  const t2 = inner.querySelector('.title-line.t2');
  const copy = inner.querySelector('.copy');
  const eyebrow = inner.querySelector('.eyebrow');

  // 원문을 남겨 둬야 화면 폭이 바뀔 때 다시 담을 수 있다
  const titleLines = [];
  if (t1) titleLines.push({ el: t1, delay: 0 });
  if (t2) titleLines.push({ el: t2, delay: 180 });
  titleLines.forEach(function (line) { line.el.dataset.src = line.el.innerHTML; });

  function renderTitles() {
    titleLines.forEach(function (line) { buildLine(line.el, line.delay); });
  }
  renderTitles();

  // 750px 경계를 넘나들면 줄 구성이 달라지므로 다시 담는다
  const onNarrowChange = function () {
    renderTitles();
    document.dispatchEvent(new CustomEvent('intro:rebuilt'));
  };
  if (narrow.addEventListener) narrow.addEventListener('change', onNarrowChange);
  else if (narrow.addListener) narrow.addListener(onNarrowChange);

  if (copy) buildWords(copy, 40, 5);
  if (eyebrow) eyebrow.style.transitionDelay = '0ms';

  Array.prototype.forEach.call(
    document.querySelectorAll('.sc-intro .outro-line'),
    function (el) { buildWords(el, 0, 35); }
  );

  document.addEventListener('intro:done', function () {
    inner.classList.add('is-in');
  }, { once: true });
})();



(function () {
  const canvas = document.querySelector('.sc-intro .space-canvas');
  if (!canvas || typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── 참고 사이트 기본값 ──────────────────────────────
  const C = {
    noiseScale: 0.365, displacement: 0.16,
    baseColor: '#00477f', peakColor: '#0b0e13', fogColor: '#08090d',
    fogInner: 1.5, fogOuter: 6.3, focusX: 0, focusZ: 0.4,
    waveSpeed: 1.55, waveAmplitude: 0.09, waveLength: 1.1, waveFalloff: 0.07,
    pulseWidth: 2,
    hoverRadius: 0.65, hoverStrength: 0.12, hoverEasing: 0.05,
    baseAmplitude: 0.02, baseSpeed: 0.35, baseWavelength: 8,
    lightAngle: -179, lightElevation: 17, lightColor: '#005CA7',
    bumpiness: 0.23, specularStrength: 0, specularSharpness: 128,
    bumpNoiseScale: 77.7, bumpNoiseStrength: 0.32,
    corridorWidth: 1.8, corridorHeight: 0.425, corridorSharpness: 1.85,
    wireColor: '#005CA7', wireThickness: 0.05, wireOpacity: 1.5,
    contourSpacing: 0.015, glowSpread: 20, glowStrength: 0.34,
    revealRadius: 0.1, revealBlur: 1.15,
    revealNoiseScale: 1.39, revealNoiseStrength: 0.45,
    particleColor: '#005CA7', particleSize: 2, particleOpacity: 1,
    particleLift: 0.045, particleSizeJitter: 0.56,
    particleXZJitter: 0.1, particleYJitter: 0,
    particleHoverColor: '#ffffff', particleHoverStrength: 1,
    pLightDir: new THREE.Vector3(0.4, 0.8, 0.6),
    pAmbient: 0.48, pDiffuse: 0.44, pSpec: 0.34, pSpecPower: 11,
    pWaveBoost: 0.85, pWaveSpeed: 1.85, pWavePeriod: 2.85, pWaveWidth: 1.1,
    causticsColor: '#2f8fd6', causticsIntensity: 0.14, causticsScale: 0.72,
    causticsSpeed: 0.26, causticsContrast: 2.1, causticsDistort: 0,
    volumeDensity: 0.71, volumeYFalloff: 1.06, volumeMaxDist: 11,
    volumeSteps: 30, volumeSharpness: 3.3, volumeFocusBias: 1.6,
    dustCount: 3000, dustSpawnRadius: 16, dustColor: '#005CA7',
    dustOpacity: 0.52, dustSize: 3, dustSizeJitter: 1, dustSpeed: 0.08,
    dustRise: 1.15, dustWander: 0.085,
    oilColorA: '#ff5cae', oilColorB: '#5cf0ff', oilIntensity: 0.47,
    oilNoiseScale: 2.19, oilSpeed: 0.18, oilRevealRadius: 0.1,
    oilTrailLife: 4.5, oilTaperPower: 6,
    postCA: 0.0055, postLens: -0.66,
    scrollSpeed: 0.0065, scrollRotateX: -0.005, scrollRotateY: -0.005,
    scrollRotateZ: 0.15, scrollZoom: 30,

    outroStartCamZ: -56.5, outroApproach: 2, outroHoldMs: 2400,
    wallGap: 8, wallHeight: 0.5, wallSharpness: 6,
    // 굽이 각도 = atan(amp * freq). 큰 굽이 35도에 잔굽이가 얹혀 최대 40도가 된다
    bendAmp1: 3.5, bendFreq1: 0.2, bendAmp2: 0.3, bendFreq2: 0.47,
    bendEaseIn: 12, bendEaseOut: 10
  };

  const PLANE = 60;          // 지형 한 변(월드 단위)
  const SEG = 340;           // 지형 분할 수 - 파티클도 이 격자를 그대로 쓴다
  const CAM_BASE = new THREE.Vector3(0, 1.2, 5.5);
  const CAM_TARGET = new THREE.Vector3(0, 0.1, 0);
  const INTRO_MS = 3500;

  function rgb(hex) {
    const h = hex.replace('#', '');
    return new THREE.Vector3(
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    );
  }
  // 방위각/고도(도) → 방향 벡터
  function dirFrom(angleDeg, elevDeg) {
    const a = angleDeg * Math.PI / 180;
    const s = elevDeg * Math.PI / 180;
    return new THREE.Vector3(Math.sin(a) * Math.cos(s), Math.sin(s), Math.cos(a) * Math.cos(s));
  }

  const FOG_RGB = rgb(C.fogColor);
  const clearColor = new THREE.Color();

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(clearColor.setRGB(FOG_RGB.x, FOG_RGB.y, FOG_RGB.z), 1);

  const scene = new THREE.Scene();
  const FOV_BASE = window.matchMedia('(max-width: 768px)').matches ? 75 : 52;
  const camera = new THREE.PerspectiveCamera(FOV_BASE, 1, 0.1, 400);
  camera.position.copy(CAM_BASE);

  const NOISE_GLSL = [
    'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }',
    'float snoise(vec2 v) {',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,',
    '                      -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod289(i);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))',
    '                 + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0, x0),',
    '                          dot(x12.xy, x12.xy),',
    '                          dot(x12.zw, x12.zw)), 0.0);',
    '  m = m * m;',
    '  m = m * m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);',
    '  vec3 g;',
    '  g.x  = a0.x  * x0.x  + h.x  * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}'
  ].join('\n');

  const DISP_UNIFORMS = [
    'uniform float uNoiseScale;',
    'uniform float uDisplacement;',
    'uniform float uTime;',
    'uniform float uFocusX;',
    'uniform float uFocusZ;',
    'uniform float uWaveSpeed;',
    'uniform float uWaveAmplitude;',
    'uniform float uWaveLength;',
    'uniform float uWaveFalloff;',
    'uniform float uPulseWidth;',
    'uniform vec3 uClicks[4];',
    'uniform float uHoverX;',
    'uniform float uHoverZ;',
    'uniform float uHoverActive;',
    'uniform float uHoverRadius;',
    'uniform float uHoverStrength;',
    'uniform float uBaseAmplitude;',
    'uniform float uBaseSpeed;',
    'uniform float uBaseWavelength;',
    'uniform float uIntro;',
    'uniform float uIntroLinear;',
    'uniform float uCorridorWidth;',
    'uniform float uCorridorHeight;',
    'uniform float uCorridorSharpness;',
    'uniform float uWallZ;',
    'uniform float uWallHeight;',
    'uniform float uWallSharpness;',
    'uniform float uBendAmp1;',
    'uniform float uBendFreq1;',
    'uniform float uBendAmp2;',
    'uniform float uBendFreq2;',
    'uniform float uBendEaseIn;',
    'uniform float uBendEaseOut;',
    'uniform float uBendEndZ;'
  ].join('\n');

  // 골목이 휘는 정도 - 이 z 에서 골짜기 한가운데가 놓이는 x.
  // 카메라·시선·초점·스테이션이 모두 이 곡선을 그대로 탄다
  const BEND_FN = [
    'float corridorBend(float z) {',
    // 출발할 때는 정면을 보고, 멈춰 서는 지점에서는 다시 곧게 펴져 정면으로 절벽을 마주한다
    '  float easeIn = 1.0 - smoothstep(-uBendEaseIn, 0.0, z);',
    '  float easeOut = smoothstep(uBendEndZ, uBendEndZ + uBendEaseOut, z);',
    '  float sway = sin(z * uBendFreq1) * uBendAmp1',
    '    + sin(z * uBendFreq2 + 2.1) * uBendAmp2;',
    '  return sway * easeIn * easeOut;',
    '}'
  ].join('\n');

  const DISP_FN = [
    'float computeDisplacement(vec2 posXZ) {',
    '  float n1 = snoise(vec2(posXZ.x * uNoiseScale, posXZ.y * uNoiseScale));',
    '  float n2 = snoise(vec2(posXZ.x * uNoiseScale * 2.5,',
    '                         posXZ.y * uNoiseScale * 2.5)) * 0.45;',
    '  float disp = (n1 + n2) * uDisplacement;',
    '  float focusR = length(posXZ - vec2(uFocusX, uFocusZ));',
    '  float falloffFocus = exp(-focusR * uWaveFalloff);',
    '  float sigma = max(uPulseWidth, 0.0001);',
    '  float halfLife = 1.6;',
    '  float wave = 0.0;',
    '  for (int i = 0; i < 4; i++) {',
    '    vec3 click = uClicks[i];',
    '    if (click.z < 0.0) continue;',
    '    float age = uTime - click.z;',
    '    if (age < 0.0 || age > halfLife * 4.0) continue;',
    '    float r = length(posXZ - click.xy);',
    '    float frontR = age * uWaveSpeed;',
    '    float delta = r - frontR;',
    '    float spatial = exp(-(delta * delta) / (sigma * sigma));',
    '    float tau = age / halfLife;',
    '    float temporal = tau * exp(1.0 - tau);',
    '    float falloffR = exp(-r * uWaveFalloff);',
    '    wave += sin((r - frontR) * (6.2831853 / max(uWaveLength, 0.0001)))',
    '      * spatial * temporal * falloffR;',
    '  }',
    '  disp += wave * uWaveAmplitude;',
    // 초점에서 퍼지는 조용한 잔물결
    '  float baseWl = max(uBaseWavelength, 0.0001);',
    '  float basePhase = focusR * (6.2831853 / baseWl) - uTime * uBaseSpeed;',
    '  disp += sin(basePhase) * uBaseAmplitude * falloffFocus;',
    // 커서를 따라다니는 부드러운 융기
    '  float dh = length(posXZ - vec2(uHoverX, uHoverZ));',
    '  float hoverFalloff = exp(-(dh * dh)',
    '    / (max(uHoverRadius, 0.0001) * max(uHoverRadius, 0.0001)));',
    '  disp += hoverFalloff * uHoverStrength * uHoverActive;',
    // 골짜기 벽 - |x| 가 corridorWidth 를 넘어가면 지면이 가파르게 솟는다.
    // 이 능선 사이를 카메라가 통과한다
    '  if (uCorridorHeight > 0.0001) {',
    '    float ax = abs(posXZ.x - corridorBend(posXZ.y));',
    '    float d = max(ax - uCorridorWidth, 0.0);',
    '    disp += pow(d, max(uCorridorSharpness, 0.001)) * uCorridorHeight;',
    '  }',
    // 막다른 벽 - 골짜기 벽과 같은 방식으로 z 축을 막아 통로가 여기서 끝난다.
    // 지형을 그대로 세우는 것이라 능선·등고선·파티클이 벽면까지 이어진다
    '  if (uWallHeight > 0.0001) {',
    '    float dz = max(uWallZ - posXZ.y, 0.0);',
    // 벽 뒤쪽은 어차피 가려지므로 높이를 묶어 정점이 멀리 튀지 않게 한다
    '    disp += min(pow(dz, max(uWallSharpness, 0.001)) * uWallHeight, 25.0);',
    '  }',
    '  return disp;',
    '}'
  ].join('\n');

  const HEAD = NOISE_GLSL + '\n' + DISP_UNIFORMS + '\n' + BEND_FN + '\n' + DISP_FN;

  // 지형·파티클·먼지가 함께 보는 유니폼
  const shared = {
    uNoiseScale: { value: C.noiseScale },
    uDisplacement: { value: C.displacement },
    uTime: { value: 0 },
    uFocusX: { value: C.focusX },
    uFocusZ: { value: C.focusZ },
    uWaveSpeed: { value: C.waveSpeed },
    uWaveAmplitude: { value: C.waveAmplitude },
    uWaveLength: { value: C.waveLength },
    uWaveFalloff: { value: C.waveFalloff },
    uPulseWidth: { value: C.pulseWidth },
    uClicks: { value: [0, 1, 2, 3].map(function () { return new THREE.Vector3(0, 0, -1); }) },
    uHoverX: { value: 0 },
    uHoverZ: { value: 0 },
    uHoverActive: { value: 0 },
    uHoverRadius: { value: C.hoverRadius },
    uHoverStrength: { value: C.hoverStrength },
    uBaseAmplitude: { value: C.baseAmplitude },
    uBaseSpeed: { value: C.baseSpeed },
    uBaseWavelength: { value: C.baseWavelength },
    uIntro: { value: 0 },
    uIntroLinear: { value: 0 },
    uCorridorWidth: { value: C.corridorWidth },
    uCorridorHeight: { value: C.corridorHeight },
    uCorridorSharpness: { value: C.corridorSharpness },
    uWallZ: { value: -1e6 },
    uWallHeight: { value: C.wallHeight },
    uWallSharpness: { value: C.wallSharpness },
    uBendAmp1: { value: C.bendAmp1 },
    uBendFreq1: { value: C.bendFreq1 },
    uBendAmp2: { value: C.bendAmp2 },
    uBendFreq2: { value: C.bendFreq2 },
    uBendEaseIn: { value: C.bendEaseIn },
    uBendEaseOut: { value: C.bendEaseOut },
    uBendEndZ: { value: -1e6 },
    uFogInner: { value: C.fogInner },
    uFogOuter: { value: C.fogOuter },
    uFogColor: { value: rgb(C.fogColor) },
    uCameraZ: { value: CAM_BASE.z }
  };

  // ── 지형 ────────────────────────────────────────────
  const surfGeo = new THREE.PlaneGeometry(PLANE, PLANE, SEG, SEG);
  surfGeo.rotateX(-Math.PI / 2);

  const SURF_VERT = HEAD + '\n' + [
    'varying float vDisp;',
    'varying vec3 vWorldPos;',
    'void main() {',

    '  vec4 worldFlat = modelMatrix * vec4(position.x, 0.0, position.z, 1.0);',
    '  float disp = computeDisplacement(worldFlat.xz);',
    '  disp *= smoothstep(0.0, 0.5, uIntro);',
    '  vec3 pos = position;',
    '  pos.y += disp;',
    '  vDisp = disp;',
    '  vec4 worldPos = modelMatrix * vec4(pos, 1.0);',
    '  vWorldPos = worldPos.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * worldPos;',
    '}'
  ].join('\n');

  const SURF_FRAG = NOISE_GLSL + '\n' + [
    'uniform vec3 uBaseColor;',
    'uniform vec3 uPeakColor;',
    'uniform vec3 uFogColor;',
    'uniform float uDisplacement;',
    'uniform float uFocusX;',
    'uniform float uFocusZ;',
    'uniform float uFogInner;',
    'uniform float uFogOuter;',
    'uniform vec3 uLightDir;',
    'uniform vec3 uLightColor;',
    'uniform float uBumpiness;',
    'uniform float uSpecularStrength;',
    'uniform float uSpecularSharpness;',
    'uniform float uBumpNoiseScale;',
    'uniform float uBumpNoiseStrength;',
    'uniform float uTime;',
    'uniform vec3 uCausticsColor;',
    'uniform float uCausticsIntensity;',
    'uniform float uCausticsScale;',
    'uniform float uCausticsSpeed;',
    'uniform float uCausticsContrast;',
    'uniform float uCausticsDistort;',
    'uniform float uIntro;',
    'uniform float uVolumeDensity;',
    'uniform float uVolumeYFalloff;',
    'uniform float uVolumeMaxDist;',
    'uniform float uVolumeSteps;',
    'uniform float uVolumeSharpness;',
    'uniform float uVolumeFocusBias;',
    'uniform vec4 uTrail[16];',
    'uniform vec3 uOilColorA;',
    'uniform vec3 uOilColorB;',
    'uniform float uOilIntensity;',
    'uniform float uOilRevealRadius;',
    'uniform float uOilTaperPower;',
    'uniform float uOilMaxArc;',
    'uniform float uOilTrailLife;',
    'uniform float uOilNoiseScale;',
    'uniform float uOilSpeed;',
    'varying float vDisp;',
    'varying vec3 vWorldPos;',

    
    'float causticRidge(vec2 xz, float ct, float distort) {',
    '  vec2 cp = xz * uCausticsScale + distort;',
    '  float c1 = snoise(cp + vec2(ct * 0.6, ct * 0.4));',
    '  float c2 = snoise(cp * 1.37 - vec2(ct * 0.3, -ct * 0.5));',
    '  float ridge = (1.0 - abs(c1)) * (1.0 - abs(c2));',
    '  return pow(clamp(ridge, 0.0, 1.0), max(uCausticsContrast, 0.001));',
    '}',

    'void main() {',
    '  float h = clamp(vDisp / max(uDisplacement, 0.0001) * 0.5 + 0.5, 0.0, 1.0);',
    '  float introMix = smoothstep(0.0, 0.7, uIntro);',
    '  vec3 col = mix(uBaseColor, uPeakColor, mix(1.0, h, introMix));',

    '  vec3 dx = dFdx(vWorldPos);',
    '  vec3 dy = dFdy(vWorldPos);',
    '  vec3 N = normalize(cross(dy, dx));',
    '  N.xz *= uBumpiness;',
    '  N = normalize(N);',

    '  if (uBumpNoiseStrength > 0.0001) {',
    '    vec2 bp = vWorldPos.xz * uBumpNoiseScale;',
    '    float eps = 0.6;',
    '    float nC = snoise(bp);',
    '    float nX = snoise(bp + vec2(eps, 0.0));',
    '    float nZ = snoise(bp + vec2(0.0, eps));',
    '    N.xz -= (vec2(nX - nC, nZ - nC) / eps) * uBumpNoiseStrength;',
    '    N = normalize(N);',
    '  }',

    '  vec3 L = normalize(uLightDir);',
    '  float ndl = clamp(dot(N, L), 0.0, 1.0);',
    '  vec3 lit = col * (0.45 + 0.55 * ndl * uLightColor);',
    '  vec3 V = normalize(cameraPosition - vWorldPos);',
    '  vec3 R = reflect(-L, N);',
    '  float spec = pow(max(dot(V, R), 0.0), max(uSpecularSharpness, 1.0));',
    '  lit += uLightColor * spec * uSpecularStrength;',

    '  float ct = uTime * uCausticsSpeed;',
    '  if (uCausticsIntensity > 0.0001) {',
    '    float ridge = causticRidge(vWorldPos.xz, ct, vDisp * uCausticsDistort);',
    '    lit += uCausticsColor * ridge * uCausticsIntensity * smoothstep(0.3, 0.85, uIntro);',
    '  }',

    '  vec2 diff = vWorldPos.xz - vec2(uFocusX, uFocusZ);',
    '  float dist = length(diff);',
    '  float fogFactor = smoothstep(uFogInner, uFogOuter, dist);',

    // 볼륨 코스틱 - 카메라에서 이 지점까지 훑으며 공중의 빛줄기를 쌓는다
    '  float volFocus = 1.0 - fogFactor;',
    '  if (uVolumeDensity > 0.0001 && volFocus > 0.01) {',
    '    vec3 toSurf = vWorldPos - cameraPosition;',
    '    float rayLen = length(toSurf);',
    '    vec3 rayDir = toSurf / max(rayLen, 0.0001);',
    '    float marchDist = min(rayLen, uVolumeMaxDist);',
    '    int volSteps = int(clamp(uVolumeSteps, 1.0, 32.0));',
    '    float volStepDist = marchDist / float(volSteps);',
    '    float volJitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5);',
    '    float vt = volJitter * volStepDist;',
    '    vec3 volAcc = vec3(0.0);',
    '    for (int j = 0; j < 32; j++) {',
    '      if (j >= volSteps) break;',
    '      vec3 vp = cameraPosition + rayDir * vt;',
    '      if (vp.y > 0.0) {',
    '        float vridge = pow(causticRidge(vp.xz, ct, 0.0), max(uVolumeSharpness, 0.001));',
    '        float vyAtten = exp(-vp.y * uVolumeYFalloff);',
    '        float sampleR = length(vp.xz - vec2(uFocusX, uFocusZ));',
    '        float sampleFocus = 1.0 - smoothstep(uFogInner * 0.6, uFogOuter, sampleR);',
    '        volAcc += vridge * vyAtten * sampleFocus;',
    '      }',
    '      vt += volStepDist;',
    '    }',
    '    float pixelFocus = pow(volFocus, max(uVolumeFocusBias, 0.001));',
    '    lit += volAcc * uCausticsColor * uVolumeDensity * volStepDist',
    '      * pixelFocus * smoothstep(0.45, 1.0, uIntro);',
    '  }',

    '  float trail = 0.0;',
    '  for (int i = 0; i < 16; i++) {',
    '    vec4 slot = uTrail[i];',
    '    if (slot.w < 0.0) continue;',
    '    float taper = pow(max(1.0 - slot.z / uOilMaxArc, 0.0), uOilTaperPower);',
    '    float life = max(1.0 - slot.w / uOilTrailLife, 0.0);',
    '    float d = length(vWorldPos.xz - slot.xy);',
    '    trail += (1.0 - smoothstep(0.0, uOilRevealRadius * (0.35 + taper), d)) * taper * life;',
    '  }',
    '  trail = clamp(trail, 0.0, 1.0);',
    '  float irid = snoise(vWorldPos.xz * uOilNoiseScale + uTime * uOilSpeed) * 0.5 + 0.5;',

    '  vec3 outCol = mix(lit, uFogColor, fogFactor);',
    '  float alpha = 1.0;',
    '  float oilGate = 1.0 - fogFactor;',
    '  vec3 oil = mix(uOilColorA, uOilColorB, irid) * trail * uOilIntensity * oilGate;',
    '  vec3 invSurf = 1.0 - clamp(outCol, 0.0, 1.0);',
    '  vec3 invOil = 1.0 - clamp(oil, 0.0, 1.0);',
    '  outCol = 1.0 - invSurf * invOil;',
    '  alpha = max(alpha, clamp(trail * uOilIntensity * oilGate, 0.0, 1.0));',
    '  if (alpha <= 0.001) discard;',
    '  gl_FragColor = vec4(outCol, alpha);',
    '}'
  ].join('\n');

  const surfaceUniforms = Object.assign({
    uBaseColor: { value: rgb(C.baseColor) },
    uPeakColor: { value: rgb(C.peakColor) },
    uLightDir: { value: dirFrom(C.lightAngle, C.lightElevation) },
    uLightColor: { value: rgb(C.lightColor) },
    uBumpiness: { value: C.bumpiness },
    uSpecularStrength: { value: C.specularStrength },
    uSpecularSharpness: { value: C.specularSharpness },
    uBumpNoiseScale: { value: C.bumpNoiseScale },
    uBumpNoiseStrength: { value: C.bumpNoiseStrength },
    uCausticsColor: { value: rgb(C.causticsColor) },
    uCausticsIntensity: { value: C.causticsIntensity },
    uCausticsScale: { value: C.causticsScale },
    uCausticsSpeed: { value: C.causticsSpeed },
    uCausticsContrast: { value: C.causticsContrast },
    uCausticsDistort: { value: C.causticsDistort },
    uVolumeDensity: { value: C.volumeDensity },
    uVolumeYFalloff: { value: C.volumeYFalloff },
    uVolumeMaxDist: { value: C.volumeMaxDist },
    uVolumeSteps: { value: C.volumeSteps },
    uVolumeSharpness: { value: C.volumeSharpness },
    uVolumeFocusBias: { value: C.volumeFocusBias },
    uTrail: { value: Array.from({ length: 16 }, function () { return new THREE.Vector4(0, 0, 0, -1); }) },
    uOilColorA: { value: rgb(C.oilColorA) },
    uOilColorB: { value: rgb(C.oilColorB) },
    uOilIntensity: { value: C.oilIntensity },
    uOilRevealRadius: { value: C.oilRevealRadius },
    uOilTaperPower: { value: C.oilTaperPower },
    uOilMaxArc: { value: 2.6 },
    uOilTrailLife: { value: C.oilTrailLife },
    uOilNoiseScale: { value: C.oilNoiseScale },
    uOilSpeed: { value: C.oilSpeed }
  }, shared);

  const surface = new THREE.Mesh(surfGeo, new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    vertexShader: SURF_VERT,
    fragmentShader: SURF_FRAG,
    uniforms: surfaceUniforms,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false
  }));
  scene.add(surface);

  // ── 능선(등고선) - 커서 주변에서만 드러난다 ──────────
  const WIRE_VERT = HEAD + '\n' + [
    'varying float vDisp;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vec4 worldFlat = modelMatrix * vec4(position.x, 0.0, position.z, 1.0);',
    '  float disp = computeDisplacement(worldFlat.xz);',
    '  vec3 pos = position;',
    '  pos.y += disp;',
    '  vDisp = disp;',
    '  vec4 worldPos = modelMatrix * vec4(pos, 1.0);',
    '  vWorldPos = worldPos.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * worldPos;',
    '}'
  ].join('\n');

  // 폭·초점·호버 유니폼은 HEAD 에서 이미 선언돼 있어 여기서 다시 쓰면 링크 에러가 난다
  const WIRE_FRAG = HEAD + '\n' + [
    'uniform vec3 uWireColor;',
    'uniform float uWireThickness;',
    'uniform float uWireOpacity;',
    'uniform float uGlowSpread;',
    'uniform float uGlowStrength;',
    'uniform float uContourSpacing;',
    'uniform float uRevealRadius;',
    'uniform float uRevealBlur;',
    'uniform float uRevealNoiseScale;',
    'uniform float uRevealNoiseStrength;',
    'uniform float uFogInner;',
    'uniform float uFogOuter;',
    'varying float vDisp;',
    'varying vec3 vWorldPos;',
    'void main() {',
    // 보간된 vDisp 가 아니라 픽셀마다 다시 계산한다.
    // 그래야 삼각형을 가로지르는 직선이 아니라 매끈한 등고선이 나온다
    '  float disp = computeDisplacement(vWorldPos.xz);',
    '  float spacing = max(uContourSpacing, 0.0001);',
    '  float band = mod(disp + spacing * 0.5, spacing) - spacing * 0.5;',
    '  float bandDist = abs(band);',
    '  float w = fwidth(disp);',
    '  float sharp = 1.0 - smoothstep(0.0, w * uWireThickness, bandDist);',
    '  float glow = 1.0 - smoothstep(0.0,',
    '    w * uWireThickness * (1.0 + uGlowSpread), bandDist);',
    '  float lineAlpha = max(sharp, glow * uGlowStrength);',
    // 커서 주변 원형 마스크 - 노이즈로 거리를 흔들어 경계가 일렁인다
    '  float dh = length(vWorldPos.xz - vec2(uHoverX, uHoverZ));',
    '  float n = snoise(vWorldPos.xz * uRevealNoiseScale) * uRevealNoiseStrength;',
    '  float dist = dh + n;',
    '  float mask = 1.0 - smoothstep(',
    '    max(uRevealRadius - uRevealBlur, 0.0),',
    '    uRevealRadius + uRevealBlur,',
    '    dist);',
    '  mask *= uHoverActive;',
    '  float focusR = length(vWorldPos.xz - vec2(uFocusX, uFocusZ));',
    '  float fogFactor = smoothstep(uFogInner, uFogOuter, focusR);',
    '  float introWire = smoothstep(0.4, 1.0, uIntro);',
    '  float alpha = lineAlpha * mask * uWireOpacity',
    '    * (1.0 - fogFactor) * introWire;',
    '  if (alpha < 0.002) discard;',
    '  gl_FragColor = vec4(uWireColor, alpha);',
    '}'
  ].join('\n');

  const wire = new THREE.Mesh(surfGeo, new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    vertexShader: WIRE_VERT,
    fragmentShader: WIRE_FRAG,
    uniforms: Object.assign({
      uWireColor: { value: rgb(C.wireColor) },
      uWireThickness: { value: C.wireThickness },
      uWireOpacity: { value: C.wireOpacity },
      uGlowSpread: { value: C.glowSpread },
      uGlowStrength: { value: C.glowStrength },
      uContourSpacing: { value: C.contourSpacing },
      uRevealRadius: { value: C.revealRadius },
      uRevealBlur: { value: C.revealBlur },
      uRevealNoiseScale: { value: C.revealNoiseScale },
      uRevealNoiseStrength: { value: C.revealNoiseStrength }
    }, shared),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  }));
  scene.add(wire);

  // ── 구슬 파티클 - 지형과 같은 격자를 그대로 쓴다 ──────
  const posAttr = surfGeo.getAttribute('position');
  const pCount = posAttr.count;
  const pRandom = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) pRandom[i] = Math.random();

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', posAttr);
  pGeo.setAttribute('aRandom', new THREE.BufferAttribute(pRandom, 1));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const P_VERT = HEAD + '\n' + [
    'uniform float uParticleLift;',
    'uniform float uParticleSize;',
    'uniform float uParticleSizeJitter;',
    'uniform float uParticleXZJitter;',
    'uniform float uParticleYJitter;',
    'uniform float uCameraZ;',
    'uniform float uParticleZRange;',
    'uniform float uPWaveBoost;',
    'uniform float uPWaveSpeed;',
    'uniform float uPWavePeriod;',
    'uniform float uPWaveWidth;',
    'attribute float aRandom;',
    'varying float vAlphaScale;',
    'varying float vFocusR;',
    'void main() {',
    '  vec3 localPos = position;',
    '  float effRandom = aRandom;',
    '  float r1 = fract(effRandom * 13.31);',
    '  float r2 = fract(effRandom * 71.17);',
    '  localPos.xz += (vec2(r1, r2) - 0.5) * uParticleXZJitter;',
    // 카메라를 기준으로 z 를 접어 넣어 파티클이 떨어져 나가지 않는다
    '  float worldX = localPos.x;',
    '  float worldZ = localPos.z;',
    '  float zRange = max(uParticleZRange, 1.0);',
    '  float relZ = worldZ - uCameraZ;',
    '  relZ = mod(relZ + zRange * 0.5, zRange) - zRange * 0.5;',
    '  worldZ = uCameraZ + relZ;',
    '  float disp = computeDisplacement(vec2(worldX, worldZ));',
    '  float worldY = disp + uParticleLift',
    '    + (fract(effRandom * 91.7) - 0.5) * uParticleYJitter;',
    '  vec3 worldXYZ = vec3(worldX, worldY, worldZ);',
    '  vec4 mvPos = viewMatrix * vec4(worldXYZ, 1.0);',
    '  gl_Position = projectionMatrix * mvPos;',
    '  float sizeRand = mix(1.0 - uParticleSizeJitter, 1.0 + uParticleSizeJitter, effRandom);',
    '  float depthAtten = clamp(8.0 / max(-mvPos.z, 0.5), 0.4, 1.6);',
    // 지면 파동 - 초점에서 태어난 고리가 주기마다 퍼져 나간다
    '  float pwR = length(vec2(worldX, worldZ) - vec2(uFocusX, uFocusZ));',
    '  float period = max(uPWavePeriod, 0.0001);',
    '  float tau = mod(uTime, period) / period;',
    '  float easedTau = 1.0 - pow(1.0 - tau, 3.0);',
    '  float pwFront = easedTau * period * uPWaveSpeed;',
    '  float pwBell = smoothstep(max(uPWaveWidth, 0.0001), 0.0, abs(pwR - pwFront));',
    '  float edge = smoothstep(0.0, 0.04, tau) * (1.0 - smoothstep(0.96, 1.0, tau));',
    '  float surfacePulse = pwBell * edge * uPWaveBoost;',
    '  gl_PointSize = uParticleSize * sizeRand * depthAtten * (1.0 + surfacePulse);',
    '  vAlphaScale = clamp(1.0 - (-mvPos.z) * 0.05, 0.2, 1.0);',
    // 인트로 - 카메라에서 바깥으로 번지는 파도가 파티클을 차례로 켠다
    '  float distFromCam = length(vec2(worldX, worldZ - uCameraZ));',
    '  float waveR = uIntroLinear * 50.0;',
    '  vAlphaScale *= 1.0 - smoothstep(waveR, waveR + 4.0, distFromCam);',
    '  vFocusR = length(vec2(worldX, worldZ) - vec2(uFocusX, uFocusZ));',
    '}'
  ].join('\n');

  const P_FRAG = [
    'uniform vec3 uParticleColor;',
    'uniform float uParticleOpacity;',
    'uniform float uFogInner;',
    'uniform float uFogOuter;',
    'uniform vec3 uPLightDir;',
    'uniform float uPAmbient;',
    'uniform float uPDiffuse;',
    'uniform float uPSpec;',
    'uniform float uPSpecPower;',
    'varying float vAlphaScale;',
    'varying float vFocusR;',
    'void main() {',
    // Safari 는 gl_PointCoord 가 mediump 라 반구 법선이 뭉개진다
    '  highp vec2 pc = gl_PointCoord;',
    '  vec2 c = pc - vec2(0.5);',
    '  float d = length(c);',
    '  if (d > 0.5) discard;',
    '  float fogFactor = smoothstep(uFogInner, uFogOuter, vFocusR);',
    '  float alpha = (1.0 - smoothstep(0.35, 0.5, d))',
    '    * uParticleOpacity * vAlphaScale * (1.0 - fogFactor);',
    '  vec2 n2 = vec2(c.x, -c.y) * 2.0;',
    '  float nz2 = clamp(1.0 - dot(n2, n2), 0.0, 1.0);',
    '  vec3 N = vec3(n2, sqrt(nz2));',
    '  vec3 L = normalize(uPLightDir);',
    '  float diff = max(dot(N, L), 0.0);',
    '  vec3 V = vec3(0.0, 0.0, 1.0);',
    '  vec3 H = normalize(L + V);',
    '  float spec = pow(max(dot(N, H), 0.0), max(uPSpecPower, 0.001));',
    '  float shade = uPAmbient + uPDiffuse * diff;',
    '  gl_FragColor = vec4(uParticleColor * shade + vec3(uPSpec * spec), alpha);',
    '}'
  ].join('\n');

  const particleUniforms = Object.assign({
      uParticleLift: { value: C.particleLift },
      uParticleSize: { value: C.particleSize },
      uParticleSizeJitter: { value: C.particleSizeJitter },
      uParticleXZJitter: { value: C.particleXZJitter },
      uParticleYJitter: { value: C.particleYJitter },
      uParticleColor: { value: rgb(C.particleColor) },
      uParticleOpacity: { value: C.particleOpacity },
      uPLightDir: { value: C.pLightDir.clone() },
      uPAmbient: { value: C.pAmbient },
      uPDiffuse: { value: C.pDiffuse },
      uPSpec: { value: C.pSpec },
      uPSpecPower: { value: C.pSpecPower },
      uPWaveBoost: { value: C.pWaveBoost },
      uPWaveSpeed: { value: C.pWaveSpeed },
      uPWavePeriod: { value: C.pWavePeriod },
      uPWaveWidth: { value: C.pWaveWidth },
      uParticleZRange: { value: PLANE }
  }, shared);

  const particles = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    vertexShader: P_VERT,
    fragmentShader: P_FRAG,
    uniforms: particleUniforms,
    transparent: true,
    depthWrite: false
  }));
  particles.frustumCulled = false;
  scene.add(particles);

  // ── 먼지 ────────────────────────────────────────────
  const dGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(C.dustCount * 3);
  const dSeed = new Float32Array(C.dustCount);
  const dPhase = new Float32Array(C.dustCount);
  for (let i = 0; i < C.dustCount; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * C.dustSpawnRadius * 2;
    dPos[i * 3 + 1] = 0;
    dPos[i * 3 + 2] = (Math.random() - 0.5) * 32;
    dSeed[i] = Math.random();
    dPhase[i] = Math.random();
  }
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
  dGeo.setAttribute('aPhase', new THREE.BufferAttribute(dPhase, 1));
  dGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const D_VERT = HEAD + '\n' + [
    'uniform float uDustSpeed;',
    'uniform float uDustRise;',
    'uniform float uDustSize;',
    'uniform float uDustSizeJitter;',
    'uniform float uDustWander;',
    'uniform float uCameraZ;',
    'uniform float uDustZRange;',
    'attribute float aSeed;',
    'attribute float aPhase;',
    'varying float vAge;',
    'varying float vFocusR;',
    'varying float vIntroMul;',
    'void main() {',
    '  float age = fract(uTime * uDustSpeed + aPhase);',
    '  float wx = sin(uTime * 0.7 + aSeed * 31.7) * uDustWander;',
    '  float wz = cos(uTime * 0.5 + aSeed * 17.3) * uDustWander;',
    '  float worldX = position.x + wx;',
    '  float worldZ = position.z + wz;',
    '  float zRange = max(uDustZRange, 1.0);',
    '  float relZ = worldZ - uCameraZ;',
    '  relZ = mod(relZ + zRange * 0.5, zRange) - zRange * 0.5;',
    '  worldZ = uCameraZ + relZ;',
    '  float surfY = computeDisplacement(vec2(worldX, worldZ));',
    '  float worldY = surfY + age * uDustRise;',
    '  vec4 mvPos = viewMatrix * vec4(worldX, worldY, worldZ, 1.0);',
    '  gl_Position = projectionMatrix * mvPos;',
    '  float sizeRand = mix(1.0 - uDustSizeJitter, 1.0 + uDustSizeJitter, fract(aSeed * 0.71));',
    '  float depthAtten = clamp(8.0 / max(-mvPos.z, 0.5), 0.4, 1.6);',
    '  gl_PointSize = uDustSize * sizeRand * depthAtten;',
    '  vAge = age;',
    '  vFocusR = length(vec2(worldX, worldZ) - vec2(uFocusX, uFocusZ));',
    '  float distFromCam = length(vec2(worldX, worldZ - uCameraZ));',
    '  float waveR = uIntroLinear * 50.0;',
    '  vIntroMul = 1.0 - smoothstep(waveR, waveR + 4.0, distFromCam);',
    '}'
  ].join('\n');

  const D_FRAG = [
    'uniform vec3 uDustColor;',
    'uniform float uDustOpacity;',
    'uniform float uFogInner;',
    'uniform float uFogOuter;',
    'varying float vAge;',
    'varying float vFocusR;',
    'varying float vIntroMul;',
    'void main() {',
    '  vec2 c = gl_PointCoord - vec2(0.5);',
    '  float d = length(c);',
    '  if (d > 0.5) discard;',
    // 수명 곡선을 종 모양으로 잡아 주기 경계에서 튀지 않고 피고 진다
    '  float a = (1.0 - smoothstep(0.35, 0.5, d)) * sin(vAge * 3.14159)',
    '    * uDustOpacity * (1.0 - smoothstep(uFogInner, uFogOuter, vFocusR)) * vIntroMul;',
    '  gl_FragColor = vec4(uDustColor, a);',
    '}'
  ].join('\n');

  const dustUniforms = Object.assign({
    uDustSpeed: { value: C.dustSpeed },
    uDustRise: { value: C.dustRise },
    uDustSize: { value: C.dustSize },
    uDustSizeJitter: { value: C.dustSizeJitter },
    uDustWander: { value: C.dustWander },
    uDustZRange: { value: 32 },
    uDustColor: { value: rgb(C.dustColor) },
    uDustOpacity: { value: C.dustOpacity }
  }, shared);

  const dust = new THREE.Points(dGeo, new THREE.ShaderMaterial({
    vertexShader: D_VERT,
    fragmentShader: D_FRAG,
    uniforms: dustUniforms,
    transparent: true,
    depthWrite: false
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  // ── 구간 스테이션 - 파티클이 모여 이미지 카드가 되고 그 아래 문구가 올라온다 ──
  const ST = {
    firstZ: -5.5, spacing: 6.5, triggerOffset: 1,
    formInMs: 490, formOutMs: 1440,
    count: 6000, pixelSize: 220, worldHeight: 1.4,
    // 이미지 카드(타일 격자) - 크기·칸수·간격은 참고 사이트 값 그대로다.
    // 높이는 이미지 비율에서 뽑아 원본이 찌그러지지 않게 한다
    cardWidth: 1.2, cardLift: 0.2,
    tilesX: 12, tilesY: 10, tileGap: 0.965, tileDepth: 0.015,
    tileEnterStart: 7, tileEnterEnd: 1, tileExitStart: 2, tileExitEnd: -1,
    tileHoverStrength: 1.5, tileHoverRadius: 0.24, tileHoverScale: -0.67,
    matcapStrength: 0.81, matcapAngle: 2.46, matcapElevation: 0.6,
    matcapSharpness: 8.5, matcapColor: '#ffffff',
    colorA: '#005CA7', colorB: '#f4f5f0',
    yOffset: 0.75, particleSize: 1.7,
    scatterRadius: 20, scatterHeight: 4.3,
    formJitter: 0.019, idleWiggle: 0.026,
    hoverRadius: 0.09, hoverRepel: 0.05, hoverScale: 1.8,
    labelAppear: 5.6, labelDisappear: -0.9
  };

  function textToPoints(text, count) {
    const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const px = ST.pixelSize;
    const w = Math.ceil(text.length * px * 0.7 + px * 0.4);
    const h = Math.ceil(px * 1.3);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + px + 'px ' + family;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    const data = ctx.getImageData(0, 0, w, h).data;
    const out = new Float32Array(count * 2);
    const scale = ST.worldHeight / px;
    let got = 0;
    let tries = 0;
    while (got < count && tries < count * 200) {
      tries++;
      const x = (Math.random() * w) | 0;
      const y = (Math.random() * h) | 0;
      if (data[(y * w + x) * 4 + 3] <= 80) continue;
      out[got * 2] = (x - w / 2) * scale;
      out[got * 2 + 1] = -(y - h / 2) * scale;
      got++;
    }
    return out;
  }

  // ── 이미지 카드 - 타일 격자 ──────────────────────────
  // 판 하나에 이미지를 통째로 입히는 게 아니라, 타일마다 텍스처의 제 몫만
  // 잘라 보게 만든다. instUvOffset/instUvScale 이 그 칸의 위치와 크기다.
  // 타일은 아래 줄부터 차례로 서고, 지나가면 같은 순서로 눕는다
  const TILE_VERT = [
    'attribute vec2 instUvOffset;',
    'attribute vec2 instUvScale;',
    'varying vec2 vTileUv;',
    'varying vec3 vNormalV;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vTileUv = uv * instUvScale + instUvOffset;',
    '  vNormalV = normalize(normalMatrix * mat3(instanceMatrix) * normal);',
    '  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);',
    '  vWorldPos = wp.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}'
  ].join('\n');

  const TILE_FRAG = [
    'uniform sampler2D uMap;',
    'uniform float uOpacity;',
    'uniform float uMatcapStrength;',
    'uniform float uMatcapAngle;',
    'uniform float uMatcapElevation;',
    'uniform float uMatcapSharpness;',
    'uniform vec3 uMatcapColor;',
    'uniform float uFocusX;',
    'uniform float uFocusZ;',
    'uniform float uFogInner;',
    'uniform float uFogOuter;',
    'uniform vec3 uFogColor;',
    'varying vec2 vTileUv;',
    'varying vec3 vNormalV;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vec3 col = texture2D(uMap, vTileUv).rgb;',
    // 매트캡 - 시점 기준 법선을 정해둔 방향과 내적해서 유리에 비친 하이라이트를 흉내낸다
    '  vec3 keyDir = normalize(vec3(',
    '    cos(uMatcapAngle), sin(uMatcapAngle), max(uMatcapElevation, 0.05)));',
    '  float key = pow(max(dot(normalize(vNormalV), keyDir), 0.0),',
    '    max(uMatcapSharpness, 0.01));',
    '  col += uMatcapColor * key * uMatcapStrength;',
    // 밝은 쪽만 부드럽게 눕혀 흰색으로 타지 않게 한다
    '  col = vec3(1.0) - exp(-col * 1.5);',
    // 지형과 같은 안개를 먹여 카드만 동떨어져 보이지 않게 한다
    '  float focusR = length(vWorldPos.xz - vec2(uFocusX, uFocusZ));',
    '  col = mix(col, uFogColor, smoothstep(uFogInner, uFogOuter, focusR));',
    '  if (uOpacity < 0.002) discard;',
    '  gl_FragColor = vec4(col, uOpacity);',
    '}'
  ].join('\n');

  // 카드 하나. 로드가 끝나야 칸 수를 알 수 있어 텍스처를 받은 뒤에 만든다
  function createTileCard(url, z, onReady) {
    new THREE.TextureLoader().load(url, function (tex) {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;

      const img = tex.image;
      const aspect = (img && img.width / Math.max(img.height, 1)) || 1.5;
      const w = ST.cardWidth;
      const h = w / aspect;
      const rows = ST.tilesY;
      const cols = ST.tilesX;
      const count = cols * rows;
      const tw = w / cols;
      const th = h / rows;

      const geo = new THREE.BoxGeometry(tw * ST.tileGap, th * ST.tileGap, ST.tileDepth);
      const uvOff = new Float32Array(count * 2);
      const uvScale = new Float32Array(count * 2);
      const px = new Float32Array(count);
      const py = new Float32Array(count);
      const delay = new Float32Array(count);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          uvOff[i * 2] = c / cols;
          // 텍스처 v 는 아래가 0 인데 격자는 위에서부터 세므로 뒤집는다
          uvOff[i * 2 + 1] = (rows - 1 - r) / rows;
          uvScale[i * 2] = 1 / cols;
          uvScale[i * 2 + 1] = 1 / rows;
          px[i] = (c - (cols - 1) / 2) * tw;
          py[i] = ((rows - 1) / 2 - r) * th;
          // 아래 줄이 먼저 서고 가로로도 물결이 지도록 지연을 준다
          const up = rows - 1 - r;
          delay[i] = up / rows * 0.45 + 0.06 * Math.sin(0.45 * c + 0.2 * up);
        }
      }
      geo.setAttribute('instUvOffset', new THREE.InstancedBufferAttribute(uvOff, 2));
      geo.setAttribute('instUvScale', new THREE.InstancedBufferAttribute(uvScale, 2));

      const uniforms = {
        uMap: { value: tex },
        uOpacity: { value: 0 },
        uMatcapStrength: { value: ST.matcapStrength },
        uMatcapAngle: { value: ST.matcapAngle },
        uMatcapElevation: { value: ST.matcapElevation },
        uMatcapSharpness: { value: ST.matcapSharpness },
        uMatcapColor: { value: rgb(ST.matcapColor) },
        uFocusX: shared.uFocusX,
        uFocusZ: shared.uFocusZ,
        uFogInner: shared.uFogInner,
        uFogOuter: shared.uFogOuter,
        uFogColor: shared.uFogColor
      };

      const mesh = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
        vertexShader: TILE_VERT,
        fragmentShader: TILE_FRAG,
        uniforms: uniforms,
        transparent: true,
        side: THREE.DoubleSide
      }), count);
      mesh.frustumCulled = false;
      mesh.position.set(0, ST.cardLift + h / 2, z);
      scene.add(mesh);

      const mat4 = new THREE.Matrix4();
      const quat = new THREE.Quaternion();
      const euler = new THREE.Euler();
      const pos = new THREE.Vector3();
      const scl = new THREE.Vector3();
      const ndc = new THREE.Vector3();

      onReady({
        mesh: mesh,
        setX: function (x) { mesh.position.x = x; },
        // rel - 카메라가 이 카드를 얼마나 지났는지. 들어올 때 0→1, 나갈 때 1→2
        update: function (rel, cursorX, cursorY, hover, cam) {
          const enter = ramp(ST.tileEnterStart, ST.tileEnterEnd, rel);
          const exit = 1 - ramp(ST.tileExitEnd, ST.tileExitStart, rel);
          const o = enter + exit;
          if (o <= 0.0001 || o >= 2) {
            mesh.visible = false;
            return;
          }
          mesh.visible = true;
          uniforms.uOpacity.value = Math.max(0, Math.min(1, o < 1 ? o : 2 - o));
          const useHover = hover > 0.001 && ST.tileHoverStrength !== 0;
          if (useHover) mesh.updateMatrixWorld();
          for (let i = 0; i < count; i++) {
            const a = o - delay[i];
            let t;
            if (a <= 0 || a >= 1.5) t = 0;
            else if (a < 0.5) { const k = a / 0.5; t = k * k * (3 - 2 * k); }
            else if (a < 1) t = 1;
            else { const k = (a - 1) / 0.5; t = 1 - k * k * (3 - 2 * k); }
            let s = 0.001 + 0.999 * t;
            // 아직 안 선 타일은 눕혀 둔다. 세워지면서 정면을 향한다
            let rx = (1 - t) * Math.PI;
            const ry = (1 - t) * 0.6 * Math.sin(0.7 * i);
            if (useHover) {
              pos.set(px[i], py[i], 0);
              ndc.copy(pos).applyMatrix4(mesh.matrixWorld).project(cam);
              const dx = ndc.x - cursorX;
              const dy = ndc.y - cursorY;
              const r2 = (dx * dx + dy * dy) / (ST.tileHoverRadius * ST.tileHoverRadius);
              if (r2 < 1) {
                const fall = (1 - r2) * (1 - r2) * hover;
                rx += fall * ST.tileHoverStrength;
                s = Math.max(0, s * (1 + fall * ST.tileHoverScale));
              }
            }
            euler.set(rx, ry, 0);
            quat.setFromEuler(euler);
            pos.set(px[i], py[i], 0);
            scl.set(s, s, s);
            mat4.compose(pos, quat, scl);
            mesh.setMatrixAt(i, mat4);
          }
          mesh.instanceMatrix.needsUpdate = true;
        }
      });
    });
  }

  const ST_VERT = [
    'attribute vec2 aBase;',
    'attribute float aSeed;',
    'uniform vec3 uStationCenter;',
    'uniform float uFormProgress;',
    'uniform float uVisProgress;',
    'uniform float uYOffset;',
    'uniform float uScatterRadius;',
    'uniform float uScatterHeight;',
    'uniform float uFormJitter;',
    'uniform vec2 uCursorNDC;',
    'uniform float uHoverActive;',
    'uniform float uHoverRadius;',
    'uniform float uHoverRepel;',
    'uniform float uHoverScale;',
    'uniform float uParticleSize;',
    'uniform float uTime;',
    'uniform float uIdleWiggle;',
    'varying float vForm;',
    'varying float vVis;',
    'varying float vPAlpha;',
    'varying float vHoverFall;',
    'void main() {',
    '  vec3 jitter = vec3(',
    '    (fract(aSeed * 41.7) - 0.5),',
    '    (fract(aSeed * 79.3) - 0.5),',
    '    (fract(aSeed * 17.1) - 0.5)',
    '  ) * uFormJitter;',
    '  vec3 formed = uStationCenter + vec3(aBase.x, aBase.y + uYOffset, 0.0) + jitter;',
    '  float rx = (fract(aSeed * 11.3) - 0.5) * 2.0;',
    '  float rz = (fract(aSeed * 71.1) - 0.5) * 2.0;',
    '  vec3 scattered = uStationCenter + vec3(',
    '    rx * uScatterRadius,',
    '    -uScatterHeight - fract(aSeed * 31.9) * 0.6,',
    '    rz * uScatterRadius',
    '  );',
    '  float perOffset = fract(aSeed * 53.7);',
    '  float stagger = 0.35;',
    '  float pEase = clamp((uFormProgress - perOffset * stagger)',
    '    / max(1.0 - stagger, 0.0001), 0.0, 1.0);',
    '  pEase = 1.0 - pow(1.0 - pEase, 4.0);',
    '  float xzEase = smoothstep(0.0, 1.0, pEase);',
    '  float yEase = smoothstep(0.0, 1.0, pEase);',
    '  vec3 worldPos;',
    '  worldPos.x = mix(scattered.x, formed.x, xzEase);',
    '  worldPos.y = mix(scattered.y, formed.y, yEase);',
    '  worldPos.z = mix(scattered.z, formed.z, xzEase);',
    // 자리를 잡은 뒤에도 미세하게 떨려서 붙박이 그림으로 안 보인다
    '  float wiggleAmt = uIdleWiggle * pEase;',
    '  worldPos += vec3(',
    '    sin(uTime * 1.7 + aSeed * 13.0),',
    '    cos(uTime * 1.3 + aSeed * 7.0),',
    '    sin(uTime * 2.1 + aSeed * 23.0)',
    '  ) * wiggleAmt;',
    '  vPAlpha = smoothstep(0.35, 1.0, pEase);',
    '  vec4 mvPos = viewMatrix * vec4(worldPos, 1.0);',
    '  vec4 clip = projectionMatrix * mvPos;',
    // 커서 반응은 화면 좌표에서 계산한 뒤 마지막에 클립 좌표로 더한다
    '  float hoverFall = 0.0;',
    '  vec2 pushNDC = vec2(0.0);',
    '  if (uHoverActive > 0.0) {',
    '    vec2 partNDC = clip.xy / max(clip.w, 0.0001);',
    '    vec2 toCursor = partNDC - uCursorNDC;',
    '    float dn = length(toCursor);',
    '    hoverFall = exp(-(dn * dn) / max(uHoverRadius * uHoverRadius, 0.0001)) * uHoverActive;',
    '    if (uHoverRepel > 0.0001) {',
    '      float r = max(uHoverRadius, 0.0001);',
    '      float t = dn / r;',
    '      float radial = t * exp(1.0 - t * t);',
    '      vec2 dir = toCursor / max(dn, 0.0001);',
    '      vec2 tangent = vec2(-dir.y, dir.x);',
    '      pushNDC = (dir * radial + tangent * radial * 0.35)',
    '        * uHoverRepel * 0.5 * uHoverActive;',
    '    }',
    '  }',
    '  clip.xy += pushNDC * clip.w;',
    '  gl_Position = clip;',
    '  float depthAtten = clamp(8.0 / max(-mvPos.z, 0.5), 0.4, 1.6);',
    '  gl_PointSize = uParticleSize * depthAtten * (1.0 + hoverFall * uHoverScale);',
    '  vForm = pEase;',
    '  vVis = clamp(uVisProgress, 0.0, 1.0);',
    '  vHoverFall = hoverFall;',
    '}'
  ].join('\n');

  const ST_FRAG = [
    'uniform vec3 uColorA;',
    'uniform vec3 uColorB;',
    'uniform vec3 uPLightDir;',
    'uniform float uPAmbient;',
    'uniform float uPDiffuse;',
    'uniform float uPSpec;',
    'uniform float uPSpecPower;',
    'varying float vForm;',
    'varying float vVis;',
    'varying float vPAlpha;',
    'varying float vHoverFall;',
    'void main() {',
    '  highp vec2 pc = gl_PointCoord;',
    '  vec2 c = pc - vec2(0.5);',
    '  float d = length(c);',
    '  if (d > 0.5) discard;',
    '  float disc = 1.0 - smoothstep(0.35, 0.5, d);',
    '  float edge = smoothstep(0.18, 0.5, d);',
    '  vec3 formedCol = mix(uColorA, uColorB, vForm);',
    '  vec3 col = mix(formedCol, uColorA, edge * 0.65);',
    // 지면 파티클과 같은 반구 법선 조명이라 재질이 따로 놀지 않는다
    '  vec2 n2 = vec2(c.x, -c.y) * 2.0;',
    '  float nz2 = clamp(1.0 - dot(n2, n2), 0.0, 1.0);',
    '  vec3 N = vec3(n2, sqrt(nz2));',
    '  vec3 L = normalize(uPLightDir);',
    '  float diff = max(dot(N, L), 0.0);',
    '  vec3 V = vec3(0.0, 0.0, 1.0);',
    '  vec3 H = normalize(L + V);',
    '  float spec = pow(max(dot(N, H), 0.0), max(uPSpecPower, 0.001));',
    '  col = col * (uPAmbient + uPDiffuse * diff) + vec3(uPSpec * spec);',
    '  gl_FragColor = vec4(col, disc * vVis * vPAlpha);',
    '}'
  ].join('\n');

  // 0..1 사이를 부드럽게 잇는다
  function ramp(a, b, v) {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  const stations = [];
  Array.prototype.forEach.call(document.querySelectorAll('.sc-intro .station'), function (el, i) {
    const value = el.getAttribute('data-value') || '';
    const imgSrc = el.getAttribute('data-img') || '';
    if (!value && !imgSrc) return;

    const z = ST.firstZ - i * ST.spacing;
    const entry = {
      el: el, z: z, uniforms: null, card: null, cells: 0,
      form: 0, on: false, onAt: 0, holdMs: 0, want: false
    };

    // 이미지 카드는 타일 격자로, 숫자는 예전처럼 파티클로 만든다
    if (imgSrc) {
      createTileCard(imgSrc, z, function (card) {
        card.setX(corridorBend(z));
        entry.card = card;
      });
    }

    if (value) {
    const base = textToPoints(value, ST.count);
    const seeds = new Float32Array(ST.count);
    for (let k = 0; k < ST.count; k++) seeds[k] = Math.random();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ST.count * 3), 3));
    geo.setAttribute('aBase', new THREE.BufferAttribute(base, 2));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const uniforms = {
      uStationCenter: { value: new THREE.Vector3(0, 0, z) },
      uFormProgress: { value: 0 },
      uVisProgress: { value: 0 },
      uYOffset: { value: ST.yOffset },
      uScatterRadius: { value: ST.scatterRadius },
      uScatterHeight: { value: ST.scatterHeight },
      uFormJitter: { value: ST.formJitter },
      uCursorNDC: { value: new THREE.Vector2(0, 0) },
      uHoverActive: { value: 0 },
      uHoverRadius: { value: ST.hoverRadius },
      uHoverRepel: { value: ST.hoverRepel },
      uHoverScale: { value: ST.hoverScale },
      uParticleSize: { value: ST.particleSize },
      uTime: { value: 0 },
      uIdleWiggle: { value: ST.idleWiggle },
      uColorA: { value: rgb(ST.colorA) },
      uColorB: { value: rgb(ST.colorB) },
      uPLightDir: { value: C.pLightDir.clone().normalize() },
      uPAmbient: { value: 0.45 },
      uPDiffuse: { value: 0.7 },
      uPSpec: { value: 0.4 },
      uPSpecPower: { value: 16 }
    };

    const points = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: ST_VERT,
      fragmentShader: ST_FRAG,
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false
    }));
    points.frustumCulled = false;
    points.renderOrder = 100;
    scene.add(points);
    entry.uniforms = uniforms;
    }

    // 문구를 글자 단위 칸에 담는다. 칸이 넘치는 부분을 잘라 아래에서 올라온다
    let idx = 0;
    Array.prototype.forEach.call(el.querySelectorAll('.pre, .label, .post'), function (part) {
      const frag = document.createDocumentFragment();
      Array.from(part.textContent).forEach(function (ch) {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(' '));
          idx++;
          return;
        }
        const cell = document.createElement('span');
        cell.className = 'cell';
        const inner = document.createElement('i');
        inner.textContent = ch;
        inner.style.setProperty('--i', idx);
        cell.appendChild(inner);
        frag.appendChild(cell);
        idx++;
      });
      part.textContent = '';
      part.appendChild(frag);
    });

    // cells - 마지막 글자의 순번. 문구가 다 나오는 데 걸리는 시간을 여기서 구한다
    entry.cells = idx;
    stations.push(entry);
  });


  if (stations.length) {
    C.outroStartCamZ = stations[stations.length - 1].z - 1;
  }
  C.outroCamZ = C.outroStartCamZ - C.outroApproach - 2;
  C.outroSplitCamZ = C.outroCamZ - 3;
  C.diveEndCamZ = C.outroSplitCamZ - 3;
  // 막다른 벽 - 스크롤이 끝나는 지점 바로 앞을 막아 통로가 여기서 끝난다
  C.wallZ = C.diveEndCamZ - C.wallGap;
  shared.uWallZ.value = C.wallZ;
  // 굽이는 카메라가 멈춰 서기 전에 다 펴져야 절벽을 비스듬히 만나지 않는다
  C.bendEndZ = C.diveEndCamZ - 2;
  shared.uBendEndZ.value = C.bendEndZ;

  // 셰이더의 corridorBend 와 같은 식. 카메라와 스테이션을 골목 한가운데에 놓는 데 쓴다.
  // 둘 중 하나만 고치면 카메라가 골짜기 벽을 뚫고 지나가므로 항상 같이 고쳐야 한다
  function smoothStep(e0, e1, v) {
    const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }
  function corridorBend(z) {
    const easeIn = 1 - smoothStep(-C.bendEaseIn, 0, z);
    const easeOut = smoothStep(C.bendEndZ, C.bendEndZ + C.bendEaseOut, z);
    const sway = Math.sin(z * C.bendFreq1) * C.bendAmp1
      + Math.sin(z * C.bendFreq2 + 2.1) * C.bendAmp2;
    return sway * easeIn * easeOut;
  }

  // 스테이션도 골목을 따라 옆으로 밀려야 벽 속에 박히지 않는다
  stations.forEach(function (st) {
    // 카드는 텍스처를 받은 뒤에 생기므로 그쪽에서 따로 자리를 잡는다
    if (st.uniforms) st.uniforms.uStationCenter.value.x = corridorBend(st.z);
    if (st.card) st.card.setX(corridorBend(st.z));
  });

  // ── 후처리 - 색수차와 렌즈 왜곡 ──────────────────────
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
  });
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postUniforms = {
    tDiffuse: { value: rt.texture },
    uCA: { value: C.postCA },
    uLens: { value: C.postLens }
  };
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: postUniforms,
    vertexShader: [
      'varying vec2 vUv;',
      'void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform float uCA;',
      'uniform float uLens;',
      'varying vec2 vUv;',
      'void main() {',
      '  vec2 uv = vUv - 0.5;',
      '  float r2 = dot(uv, uv);',
      '  uv *= 1.0 + uLens * r2;',
      '  uv += 0.5;',
      '  vec2 dir = uv - 0.5;',
      '  float d = length(dir);',
      '  vec2 off = dir * d * uCA;',
      '  float r = texture2D(tDiffuse, uv - off).r;',
      '  float g = texture2D(tDiffuse, uv      ).g;',
      '  float b = texture2D(tDiffuse, uv + off).b;',
      '  gl_FragColor = vec4(r, g, b, 1.0);',
      '}'
    ].join('\n'),
    depthTest: false,
    depthWrite: false
  })));

  // ── 크기 / 입력 ─────────────────────────────────────
  function resize() {
    const box = canvas.getBoundingClientRect();
    const w = Math.round(box.width) || window.innerWidth;
    const h = Math.round(box.height) || window.innerHeight;
    const dpr = renderer.getPixelRatio();
    renderer.setSize(w, h, false);
    rt.setSize(Math.round(w * dpr), Math.round(h * dpr));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(resize);
  if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', resize);

  let mx = 0;
  let my = 0;
  let elev = 0;
  let azim = 0;
  let hoverTarget = 0;

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  let hoverX = 0;
  let hoverZ = 0;

  const TRAIL = 16;
  const trail = [];

  window.addEventListener('pointermove', function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
    hoverTarget = 1;

    ndc.set(mx, -my);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(ground, hit)) return;
    hoverX = hit.x;
    hoverZ = hit.z;

    const last = trail[0];
    // 너무 촘촘하면 같은 자리에 계속 찍힌다
    if (last && Math.hypot(hit.x - last.x, hit.z - last.z) < 0.02) return;
    trail.unshift({ x: hit.x, z: hit.z, born: performance.now() });
    if (trail.length > TRAIL) trail.length = TRAIL;
  });
  window.addEventListener('pointerleave', function () { hoverTarget = 0; });

  // 클릭하면 그 자리에서 파문이 퍼진다
  let clickSlot = 0;
  canvas.addEventListener('pointerdown', function (e) {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(ground, hit)) return;
    shared.uClicks.value[clickSlot].set(hit.x, hit.z, shared.uTime.value);
    clickSlot = (clickSlot + 1) % 4;
  });

  // ── 인트로 ──────────────────────────────────────────
  let introStart = -1;
  document.addEventListener('intro:done', function () {
    if (introStart < 0) introStart = performance.now();
  });

  // ── 스크롤 - 고정된 채 골짜기를 파고든다 ──────────────
  
  const DIVE_DEPTH = CAM_BASE.z - C.diveEndCamZ;
  const dive = { px: 0, len: 1 };
  const hero = document.querySelector('.sc-intro');
  if (hero && window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: '+=360%',
      pin: true,
      pinSpacing: true,
      // 아래 rAF 루프에서 한 번 더 부드럽게 따라가므로 여기서는 지연을 두지 않는다
      scrub: true,
      onRefresh: function (self) { dive.len = Math.max(self.end - self.start, 1); },
      onUpdate: function (self) { dive.px = self.progress * Math.max(self.end - self.start, 1); }
    });
  }

  let visible = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { rootMargin: '100px 0px' }).observe(canvas);
  }

  const clock = new THREE.Clock();
  const lookTarget = new THREE.Vector3();
  let stationTick = performance.now();
 
  // 여기서는 스크롤 픽셀 대신 카메라가 나아간 거리로 환산해 같은 지점에서 일어나게 한다
  const INTRO_CENTER_DIST = 480 * C.scrollSpeed;   // 3.12 월드 단위
  const INTRO_OUT_DIST = 700 * C.scrollSpeed;      // 4.55
  const INTRO_BACK_DIST = 640 * C.scrollSpeed;     // 4.16
  const introInner = document.querySelector('.sc-intro .intro-inner');
  // 줄 구성이 바뀌면 상자도 새로 만들어지므로 그때마다 다시 모은다
  let introMoves = [];
  function collectMoves() {
    introMoves = Array.prototype.map.call(
      document.querySelectorAll('.sc-intro .intro-inner .move'),
      function (el) { return { el: el, shift: 0 }; }
    );
  }
  function measureIntro() {
    introMoves.forEach(function (m) {
      m.el.style.transform = 'none';
      const r = m.el.getBoundingClientRect();
      m.shift = window.innerWidth / 2 - (r.left + r.width / 2);
      m.el.style.transform = '';
    });
  }

  const introLines = Array.prototype.slice.call(
    document.querySelectorAll('.sc-intro .title-line')
  );

  // 가장 긴 줄이 폭의 이만큼만 차지하게 맞춘다. 남는 양옆이 곧 가운데로 모이는 거리라
  // 화면 폭이나 글자 수가 달라져도 움직이는 양이 일정하게 유지된다.
  // 1 에 가까울수록 글자가 커지고 움직임은 줄어든다
  const INTRO_FIT = 0.72;
  function fitIntro() {
    introLines.forEach(function (line) { line.style.fontSize = ''; });

    // 가로 - 가장 긴 줄을 목표 폭에 맞추는 비율 (CSS 크기보다 키우지는 않는다)
    let scale = 1;
    introLines.forEach(function (line) {
      const avail = line.clientWidth * INTRO_FIT;
      if (avail <= 0) return;
      Array.prototype.forEach.call(line.querySelectorAll('.move'), function (move) {
        const w = move.getBoundingClientRect().width;
        if (w > avail) scale = Math.min(scale, avail / w);
      });
    });

   
    const cs = getComputedStyle(introInner);
    const availH = introInner.clientHeight
      - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    let titleH = 0;
    let otherH = 0;
    Array.prototype.forEach.call(introInner.children, function (child) {
      const h = child.getBoundingClientRect().height;
      if (introLines.indexOf(child) >= 0) titleH += h; else otherH += h;
    });
    // 덩어리 사이가 붙지 않도록 12% 는 여백으로 남긴다
    const room = availH * 0.88 - otherH;
    if (titleH > room && room > 0) scale = Math.min(scale, room / titleH);

    if (scale >= 1) return;
    introLines.forEach(function (line) {
      const base = parseFloat(getComputedStyle(line).fontSize);
      line.style.fontSize = (base * scale).toFixed(2) + 'px';
    });
  }

  function relayoutIntro() {
    collectMoves();
    fitIntro();
    measureIntro();
  }
  relayoutIntro();
  window.addEventListener('resize', relayoutIntro);
  document.addEventListener('intro:rebuilt', relayoutIntro);
  // 핀이 걸리면 .sc-intro 가 fixed 로 바뀌며 기준 박스가 달라진다. 그때 다시 잰다
  if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', relayoutIntro);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayoutIntro);
  let introEase = 0;
  let introAbove = false;
  const outroLines = Array.prototype.slice.call(
    document.querySelectorAll('.sc-intro .outro-line')
  );
  const outroCells = outroLines.map(function (el) {
    return el.querySelectorAll('.cell').length;
  });
  let outroPhase = 0;
  let outroAt = 0;
  let outroHold = 0;     // 첫 문구가 다 나올 때까지 걸리는 시간
  let scrollSm = 0;      // 부드럽게 따라가는 스크롤량
  let prevScroll = 0;
  let velAvg = 0;        // 평소 속도
  let boost = 0;         // 급하게 굴렸을 때만 오르는 값 - 화각과 기울기를 흔든다
  let lastT = 0;
  let prevX = 0;
  let rush = 0;          // 장면이 흘러가는 속도 0..1 - 글자 모션 길이를 여기에 맞춘다

  // 글자 간격과 지속 시간. 빠르게 지나갈수록 짧아져 짧은 구간에서도 문구가 완성된다
  const STEP_MS = 35;
  const DUR_MS = 700;
  const DUR_MIN = 220;
  const OUTRO_LINE1_EXTRA_MS = 900; // 첫 문구가 다 뜬 뒤 최소한 이만큼은 더 붙잡아둔다
  function cellTiming(el) {
    el.style.setProperty('--cell-step', (STEP_MS * (1 - rush)).toFixed(1) + 'ms');
    el.style.setProperty('--cell-dur', (DUR_MS - (DUR_MS - DUR_MIN) * rush).toFixed(0) + 'ms');
  }
  // 지금 속도에서 글자 n 칸짜리 문구가 다 나오는 데 걸리는 시간
  function revealMs(cells) {
    return cells * STEP_MS * (1 - rush) + (DUR_MS - (DUR_MS - DUR_MIN) * rush);
  }

  gsap.ticker.add(function () {
    if (!visible) return;
    const t = clock.getElapsedTime();
    shared.uTime.value = t;

    // 인트로 - 3.5초에 걸쳐 지형이 자라고 코스틱, 빛줄기가 차례로 올라온다
    const lin = introStart < 0 ? 0 : Math.min((performance.now() - introStart) / INTRO_MS, 1);
    shared.uIntroLinear.value = lin;
    shared.uIntro.value = 1 - Math.pow(1 - lin, 3);

    shared.uHoverX.value += (hoverX - shared.uHoverX.value) * C.hoverEasing;
    shared.uHoverZ.value += (hoverZ - shared.uHoverZ.value) * C.hoverEasing;
    shared.uHoverActive.value += (hoverTarget - shared.uHoverActive.value) * C.hoverEasing;

    // 카메라 - 기준점을 중심으로 아주 조금 돌고, 인트로에는 위에서 내려앉는다
    elev += (-my * 0.05 - elev) * 0.05;
    azim += (mx * 0.05 - azim) * 0.05;
    const m = CAM_BASE.distanceTo(CAM_TARGET);
    const ph = Math.asin((CAM_BASE.y - CAM_TARGET.y) / m) + elev;
    const th = Math.atan2(CAM_BASE.x - CAM_TARGET.x, CAM_BASE.z - CAM_TARGET.z) + azim;
    camera.position.set(
      CAM_TARGET.x + Math.sin(th) * Math.cos(ph) * m,
      CAM_TARGET.y + Math.sin(ph) * m,
      CAM_TARGET.z + Math.cos(th) * Math.cos(ph) * m
    );
    camera.position.y += (1 - shared.uIntro.value) * 8;

    scrollSm += (dive.px - scrollSm) * 0.18;
    const speed = DIVE_DEPTH / dive.len;
    const x = -(scrollSm * speed);

    // 장면이 초당 몇 월드 단위로 흐르는지 재서, 글자 모션 길이를 여기에 맞춘다
    const dtSec = Math.min(Math.max(t - lastT, 1 / 240), 0.1);
    lastT = t;
    const flow = Math.abs(x - prevX) / dtSec;
    prevX = x;
    rush += (Math.min(1, Math.max(0, (flow - 2) / 8)) - rush) * 0.25;

    camera.position.z += x;
    // 골목이 휘면 카메라도 한가운데를 따라 옆으로 흐른다
    camera.position.x += corridorBend(camera.position.z);

    // 시선은 카메라보다 앞선 z 의 한가운데를 보므로, 굽이를 돌 때 저절로 방향이 틀어진다
    lookTarget.copy(CAM_TARGET);
    lookTarget.z += x;
    lookTarget.x += corridorBend(lookTarget.z);
    camera.lookAt(lookTarget);

    // 굴리는 속도가 평소보다 빠를 때만 화각이 벌어지고 화면이 살짝 기운다
    const delta = Math.abs(scrollSm - prevScroll);
    prevScroll = scrollSm;
    velAvg += (delta - velAvg) * 0.04;
    const target = 1 - Math.exp(-0.18 * Math.max(0, delta - velAvg));
    boost += (target - boost) * (target > boost ? 0.09 : 0.04);
    camera.rotation.x += boost * C.scrollRotateX;
    camera.rotation.y += boost * C.scrollRotateY;
    camera.rotation.z += boost * C.scrollRotateZ;
    camera.fov = Math.max(15, Math.min(FOV_BASE + boost * C.scrollZoom, 110));
    camera.updateProjectionMatrix();

    // 지형은 카메라를 따라 움직이고 노이즈는 월드에 박혀 있어 새 지형이 흘러온다
    surface.position.z = x;
    wire.position.z = x;
    shared.uFocusZ.value = C.focusZ + x;
    // 초점이 안개와 잔물결의 중심이라, 이것도 골목을 따라가야 밝은 자리가 통로 안에 남는다
    shared.uFocusX.value = corridorBend(C.focusZ + x);
    shared.uCameraZ.value = camera.position.z;

    if (introInner) {
      // x 는 스크롤로 흘러간 거리(음수). 마우스 시선에 흔들리지 않는 값이라 이걸 쓴다
      const gone = -x;
      introEase += (Math.min(1, gone / INTRO_CENTER_DIST) - introEase) * 0.12;
      const k = 1 - Math.pow(1 - Math.min(1, introEase), 3);
      for (let i = 0; i < introMoves.length; i++) {
        const m = introMoves[i];
        m.el.style.transform = 'translateX(' + (k * m.shift).toFixed(2) + 'px)';
      }
      // 걷을 때와 되돌릴 때 지점을 어긋나게 해서 경계에서 깜빡이지 않는다
      const above = introAbove ? gone > INTRO_BACK_DIST : gone > INTRO_OUT_DIST;
      if (above !== introAbove) {
        introAbove = above;
        cellTiming(introInner);
        introInner.classList.toggle('is-above', above);
      }
    }

    // 구간 스테이션 - 다가가면 파티클이 숫자로 모이고, 지나가면 다시 흩어진다.
    const now = performance.now();
    if (stations.length) {
      const dt = Math.min(now - stationTick, 100);
      stationTick = now;
      const off = ST.triggerOffset;
      for (let i = 0; i < stations.length; i++) {
        const st = stations[i];
        const rel = camera.position.z - st.z;
        if (st.uniforms) {
          // 다가올 때 차오르고 지나가면 빠진다
          const target = (1 - ramp(off, off + 6, rel)) * ramp(-(off + 6), -off, rel);
          const gap = target - st.form;
          // 파티클이 모이고 흩어지는 시간도 같이 줄여야 숫자가 덜 만들어진 채 지나가지 않는다
          const rate = (gap >= 0 ? ST.formInMs : ST.formOutMs) * (1 - 0.75 * rush);
          const step = dt / Math.max(rate, 1);
          st.form = Math.abs(gap) <= step ? target : st.form + Math.sign(gap) * step;
          st.uniforms.uFormProgress.value = st.form;
          st.uniforms.uVisProgress.value =
            ramp(-(off + 10), -off, rel) * (1 - ramp(off, off + 10, rel));
          st.uniforms.uTime.value = t;
          st.uniforms.uCursorNDC.value.set(mx, -my);
          st.uniforms.uHoverActive.value = shared.uHoverActive.value;
        }
        if (st.card) st.card.update(rel, mx, -my, shared.uHoverActive.value, camera);

        // 문구는 스테이션에 닿기 조금 전 구간에서만 올라와 있는다
        st.want = rel > -ST.labelDisappear && rel < ST.labelAppear;
      }

      // 문구가 다 나오기 전에 구간을 지나쳐 버리면 글자가 잘린 채 사라진다.
      // 그래서 켤 때 지금 속도에 맞는 모션 길이를 박아 두고, 그 시간만큼은 붙잡아 둔다.
      // 다음 스테이션이 들어오면 겹치지 않도록 바로 놓는다
      let anyWant = false;
      for (let i = 0; i < stations.length; i++) {
        if (stations[i].want) { anyWant = true; break; }
      }
      for (let i = 0; i < stations.length; i++) {
        const st = stations[i];
        const held = st.on && !anyWant && now - st.onAt < st.holdMs;
        const on = st.want || held;
        if (on !== st.on) {
          st.on = on;
          cellTiming(st.el);
          if (on) {
            st.onAt = now;
            st.holdMs = revealMs(st.cells);
          }
          st.el.classList.toggle('is-on', on);
        }
      }
    }

    // 마무리 문구 - 벽이 다 막히면 첫 문구가 뜨고,
    if (outroLines.length) {
      let phase = 0;
      if (camera.position.z <= C.outroCamZ) {
        if (outroPhase === 0) {
          outroAt = now;
          outroHold = revealMs(outroCells[0] || 0);
        }
        // 한 프레임에 두 지점을 다 지나쳐도 첫 문구를 건너뛰지 않도록,
        // 첫 문구가 뜬 시점부터 재서 다 나올 시간을 확보한 뒤에만 다음으로 넘긴다
        const shown = outroAt > 0 ? now - outroAt : 0;
        const wants2 = camera.position.z <= C.outroSplitCamZ || shown >= C.outroHoldMs;
        // 빠르게 스크롤해 회전점을 바로 지나쳐도 첫 문구가 다 뜨자마자 사라지지 않도록 최소 노출 시간을 둔다
        phase = (wants2 && shown >= outroHold + OUTRO_LINE1_EXTRA_MS) ? 2 : 1;
      }
      if (phase !== outroPhase) {
        outroPhase = phase;
        if (phase === 0) outroAt = 0;
        outroLines.forEach(function (el, i) {
          const on = phase === i + 1;
          cellTiming(el);
          el.classList.toggle('is-on', on);
          // 지나간 문구는 위로 빠지고, 아직 안 나온 문구는 아래에 대기한다
          el.classList.toggle('is-out', !on && phase > i);
        });
      }
    }

    // 커서 자취를 셰이더로 넘긴다. 커서에서 멀어진 마디일수록 가늘어진다
    let arc = 0;
    for (let i = 0; i < TRAIL; i++) {
      const slot = surfaceUniforms.uTrail.value[i];
      const node = trail[i];
      if (!node) { slot.set(0, 0, 0, -1); continue; }
      if (i > 0) {
        const prev = trail[i - 1];
        arc += Math.hypot(node.x - prev.x, node.z - prev.z);
      }
      slot.set(node.x, node.z, arc, (now - node.born) / 1000);
    }

    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  });
})();




(function () {
  const title = document.querySelector('.sc-projects .desc-area .title');
  if (!title) return;

  const words = [];
  const frag = document.createDocumentFragment();

  Array.from(title.childNodes).forEach(function (node) {
    if (node.nodeName === 'BR') {
      frag.appendChild(node.cloneNode());
      return;
    }

    node.textContent.split(/(\s+)/).forEach(function (part) {
      if (!part) return;
      if (!part.trim()) {
        frag.appendChild(document.createTextNode(' '));
        return;
      }
      const mask = document.createElement('span');
      mask.className = 'w-mask';
      const inner = document.createElement('span');
      inner.className = 'w-in';
      inner.textContent = part;
      mask.appendChild(inner);
      frag.appendChild(mask);
      words.push(inner);
    });
  });

  title.textContent = '';
  title.appendChild(frag);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 화면에 들어올 때 비스듬히 솟아오른다
  gsap.from(words, {
    yPercent: 130,
    skewY: 7,
    opacity: 0,
    duration: 1.3,
    ease: 'expo.out',
    stagger: 0.085,
    scrollTrigger: {
      trigger: title,
      start: 'top 82%',
      once: true
    }
  });

  // 짚은 단어는 밝아지며 떠오르고 나머지는 물러난다
  words.forEach(function (word) {
    word.parentNode.addEventListener('mouseenter', function () {
      gsap.to(word, { y: -8, color: '#ffffff', duration: 0.45, ease: 'expo.out' });
      words.forEach(function (other) {
        if (other !== word) gsap.to(other, { opacity: 0.35, duration: 0.45 });
      });
    });
  });

  title.addEventListener('mouseleave', function () {
    gsap.to(words, { y: 0, opacity: 1, color: '#888888', duration: 0.6, ease: 'power3.out' });
  });
})();


//sc-project

(function () {
  const section = document.querySelector('.sc-projects');
  const sliderEls = Array.from(document.querySelectorAll('.sc-projects .slider'));
  if (!section || !sliderEls.length || !window.THREE) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CAM_Z = 1500;
  const GAP = 20;           // 카드 사이 간격(px). CSS의 카드 폭 계산과 같은 값이어야 한다
  const LERP = 0.09;
  const VEL_NORM = 70;      // 이 속도(px/프레임)에서 변형이 최대가 된다
  const MAX_TEXTURE = 1600;

  // 띠 모양을 정하는 값들
  const SHEET_T = 1.15;     // S가 프레임의 얼마를 도는가
  const SHEET_C = 1;        // 0이면 대칭 그릇(=원통), 1이면 비대칭 S
  const SHEET_DEPTH = 0.2;  // 파고. 프러스텀 반너비에 대한 비율
  const SHEET_VEL = 1.1;    // 빠를수록 파고가 커지는 정도
  const LEAN_DOOR = -0.12;  // 문짝처럼 한쪽으로 기우는 정도

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (err) {
    return;
  }
  if (!renderer || !renderer.getContext()) return;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'slider-canvas';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 20000);
  camera.position.z = CAM_Z;

  let dirty = true;
  let onScreen = true;

  // ── 띠(sheet) — 원본과 같은 수식 ─────────────────────────────
  const SHEET_GLSL = [
    'const float SHEET_PI = 3.141592653589793;',
    'const float SHEET_BANK = -0.16;',   // 파형 기울기를 따라 눕는 각
    'const float SHEET_DIAG = 0.03;',    // 띠 전체가 오른쪽으로 살짝 올라간다
    'const float SHEET_REAR_Y = 0.1;',   // 흐를 때 뒤쪽이 들린다
    'const float SHEET_REAR_Z = 0.2;',
    'const float SHEET_VTWIST = 1.8;',   // 흐를 때 양 끝이 비틀린다
    'const float SHEET_TAIL = 1.0;',
    'const float SHEET_SHIFT = -0.2;',
    'uniform float u_sheetW;',
    'uniform float u_sheetD;',
    'uniform float u_sheetT;',
    'uniform float u_sheetC;',
    'uniform float u_sheetP;',
    'uniform float u_sheetV;',
    'uniform float u_leanA;',
    'uniform float u_leanW;',
    'float sheetQ(float wx) {',
    '  return wx / max(u_sheetW, 0.0001) * u_sheetT + SHEET_SHIFT;',
    '}',
    'float sheetShape(float q) {',
    '  return mix(1.0 - q * q, sin(SHEET_PI * q), u_sheetC) * exp(-SHEET_TAIL * q * q);',
    '}',
    'float sheetShapeSlope(float q) {',
    '  float g = exp(-SHEET_TAIL * q * q);',
    '  float bowl = -2.0 * q * (1.0 + SHEET_TAIL * (1.0 - q * q));',
    '  float ess = SHEET_PI * cos(SHEET_PI * q) - 2.0 * SHEET_TAIL * q * sin(SHEET_PI * q);',
    '  return mix(bowl, ess, u_sheetC) * g;',
    '}',
    'float sheetZ(float wx) {',
    '  return -u_sheetD * sheetShape(sheetQ(wx));',
    '}',
    'float sheetRoll(float wx) {',
    '  if (u_sheetW < 0.001) return 0.0;',
    '  return SHEET_BANK * sheetShapeSlope(sheetQ(wx)) / SHEET_PI * u_sheetC * u_sheetP;',
    '}',
    'vec4 sheetWind(vec4 w) {',
    '  float a = sheetRoll(w.x);',
    '  if (u_sheetV > 0.001 && u_sheetW > 0.001 && u_sheetP > 0.001) {',
    '    float qe = w.x / u_sheetW;',
    '    a += SHEET_VTWIST * u_sheetV * smoothstep(0.3, 0.9, abs(qe)) * sign(qe) * u_sheetP;',
    '  }',
    '  if (abs(a) < 0.0001) return w;',
    '  float s = sin(a);',
    '  float c = cos(a);',
    '  return vec4(w.x, w.y * c - w.z * s, w.y * s + w.z * c, w.w);',
    '}',
    'vec4 sheet(vec4 w) {',
    '  w = sheetWind(w);',
    '  w.z += sheetZ(w.x) * u_sheetP;',
    '  if (u_sheetW > 0.001) {',
    '    float qw = w.x / u_sheetW;',
    '    w.y += SHEET_DIAG * w.x * u_sheetP;',
    '    if (u_sheetV > 0.001) {',
    '      float m = 1.0 - smoothstep(-1.0, 0.3, qw);',
    '      w.y += SHEET_REAR_Y * u_sheetW * u_sheetV * m * u_sheetP;',
    '      w.z += SHEET_REAR_Z * u_sheetW * u_sheetV * m * u_sheetP;',
    '    }',
    '  }',
    '  return w;',
    '}',
    'float leanRamp(float s) {',
    '  s = clamp(s, -1.0, 1.0);',
    '  return s * (1.5 - 0.5 * s * s);',
    '}',
    'vec4 lean(vec4 w, float k) {',
    '  if (u_leanW > 0.001 && k > 0.001) {',
    '    w.z += u_leanA * leanRamp(w.x / u_leanW) * k;',
    '  }',
    '  return w;',
    '}'
  ].join('\n');

  const CARD_VERT = SHEET_GLSL + '\n' + [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  vec4 w = modelMatrix * vec4(position, 1.0);',
    '  w = sheet(w);',
    '  w = lean(w, u_sheetP);',
    '  gl_Position = projectionMatrix * viewMatrix * w;',
    '}'
  ].join('\n');

  const CARD_FRAG = [
    'uniform sampler2D uTexture;',
    'uniform vec2 uCover;',
    'uniform vec2 uSize;',
    'uniform float uRadius;',
    'uniform float uOpacity;',
    'uniform float uMirror;',
    'uniform float uBorder;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec2 uv = (vUv - 0.5) * uCover + 0.5;',
    '  vec4 color = texture2D(uTexture, uv);',
    '  vec2 p = (vUv - 0.5) * uSize;',
    '  vec2 d = abs(p) - (uSize * 0.5 - vec2(uRadius));',
    '  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - uRadius;',
    '  float alpha = 1.0 - smoothstep(-1.0, 1.0, dist);',
    // 테두리를 텍스처에 그리면 사각형이라 둥근 마스크에 모서리가 잘린다.
    // 마스크와 같은 거리장으로 그려야 네 모서리가 정확히 맞물린다
    '  if (uBorder > 0.0) {',
    '    float inner = smoothstep(-uBorder - 1.0, -uBorder + 1.0, dist);',
    '    color.rgb = mix(color.rgb, vec3(1.0), inner * alpha * 0.18);',
    '  }',
    '  if (uMirror > 0.5) alpha *= pow(vUv.y, 4.0);',
    '  gl_FragColor = vec4(color.rgb, color.a * alpha * uOpacity);',
    '}'
  ].join('\n');

  // ── 바닥 — 카드와 같은 lean을 먹어야 두 면이 한 덩어리로 보인다 ──
  const FLOOR_VERT = SHEET_GLSL + '\n' + [
    'uniform float u_run;',
    'varying vec2 vUv;',
    'varying float vFar;',
    'void main() {',
    '  vUv = uv;',
    '  vec4 w = modelMatrix * vec4(position, 1.0);',
    '  vFar = -w.z / max(u_run, 0.0001);',
    '  w = lean(w, u_sheetP);',
    '  gl_Position = projectionMatrix * viewMatrix * w;',
    '}'
  ].join('\n');

  const FLOOR_FRAG = [
    'uniform vec3 u_c0;',
    'uniform vec3 u_c1;',
    'uniform float u_alpha;',
    'uniform float u_grid;',
    'uniform vec2 u_gridF;',
    'varying vec2 vUv;',
    'varying float vFar;',
    'void main() {',
    '  float fade = 1.0 - smoothstep(0.2, 0.95, vFar);',
    '  float contact = exp(-abs(vFar) * 14.0);',
    '  vec3 col = mix(u_c1, u_c0, smoothstep(0.0, 0.8, vFar));',
    '  col *= 1.0 - contact * 0.55;',
    '  vec2 g = vec2(vUv.x * u_gridF.x, vFar * u_gridF.y);',
    '  vec2 gf = abs(fract(g) - 0.5);',
    '  vec2 gw = fwidth(g) * 1.5;',
    '  vec2 lines = vec2(1.0) - smoothstep(vec2(0.0), gw, gf);',
    '  float line = max(lines.x, lines.y);',
    '  col += line * u_grid * fade;',
    '  gl_FragColor = vec4(col, u_alpha * fade);',
    '}'
  ].join('\n');

  // 셰이더가 옮긴 정점을 JS에서도 똑같이 따라가야 DOM 캡션이 카드에 붙는다
  const SHEET_PI = Math.PI;
  const SHEET_BANK = -0.16;
  const SHEET_DIAG = 0.03;
  const SHEET_REAR_Y = 0.1;
  const SHEET_REAR_Z = 0.2;
  const SHEET_VTWIST = 1.8;
  const SHEET_TAIL = 1.0;
  const SHEET_SHIFT = -0.2;

  function smoothstep(a, b, x) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function sheetShape(q) {
    const bowl = 1 - q * q;
    const ess = Math.sin(SHEET_PI * q);
    return (bowl + (ess - bowl) * SHEET_C) * Math.exp(-SHEET_TAIL * q * q);
  }
  function sheetShapeSlope(q) {
    const g = Math.exp(-SHEET_TAIL * q * q);
    const bowl = -2 * q * (1 + SHEET_TAIL * (1 - q * q));
    const ess = SHEET_PI * Math.cos(SHEET_PI * q) - 2 * SHEET_TAIL * q * Math.sin(SHEET_PI * q);
    return (bowl + (ess - bowl) * SHEET_C) * g;
  }
  function leanRamp(s) {
    s = Math.min(1, Math.max(-1, s));
    return s * (1.5 - 0.5 * s * s);
  }

  function deform(x, y, u) {
    let z = 0;
    const q = x / Math.max(u.W, 0.0001) * SHEET_T + SHEET_SHIFT;

    let a = u.W < 0.001 ? 0 : SHEET_BANK * sheetShapeSlope(q) / SHEET_PI * SHEET_C;
    if (u.V > 0.001 && u.W > 0.001) {
      const qe = x / u.W;
      a += SHEET_VTWIST * u.V * smoothstep(0.3, 0.9, Math.abs(qe)) * Math.sign(qe);
    }
    if (Math.abs(a) >= 0.0001) {
      const s = Math.sin(a);
      const c = Math.cos(a);
      const ny = y * c - z * s;
      z = y * s + z * c;
      y = ny;
    }

    z += -u.D * sheetShape(q);

    if (u.W > 0.001) {
      const qw = x / u.W;
      y += SHEET_DIAG * x;
      if (u.V > 0.001) {
        const m = 1 - smoothstep(-1, 0.3, qw);
        y += SHEET_REAR_Y * u.W * u.V * m;
        z += SHEET_REAR_Z * u.W * u.V * m;
      }
    }

    if (u.W > 0.001) z += u.leanA * leanRamp(x / u.W);

    const scale = CAM_Z / (CAM_Z - z);
    return {
      sx: u.stageW / 2 + x * scale,
      sy: u.stageH / 2 - (y - u.camY) * scale
    };
  }

  function makeSource(item) {
    const video = item.querySelector('.thumb-area video');
    if (video) {
      const texture = new THREE.VideoTexture(video);
      texture.minFilter = THREE.LinearFilter;
      texture.encoding = THREE.sRGBEncoding;
      // iOS 는 playsinline 없이 재생하면 영상을 전체화면으로 띄운다.
      // 여기서 텍스처용으로 강제 재생하므로 마크업과 별개로 한 번 더 잠근다
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.muted = true;
      const played = video.play();
      if (played && played.catch) played.catch(function () {});
      video.addEventListener('loadedmetadata', function () { dirty = true; });
      return {
        texture: texture,
        aspect: function () { return (video.videoWidth || 16) / (video.videoHeight || 9); }
      };
    }

    const img = item.querySelector('.thumb-area img');
    if (img) {
      const texture = new THREE.Texture();
      texture.minFilter = THREE.LinearFilter;
      texture.encoding = THREE.sRGBEncoding;

      function useImage() {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return;
        // 원본이 크면 그대로 올릴 때 GPU 메모리를 크게 먹는다. 캔버스로 줄여서 올린다
        if (Math.max(w, h) > MAX_TEXTURE) {
          const scale = MAX_TEXTURE / Math.max(w, h);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          texture.image = canvas;
        } else {
          texture.image = img;
        }
        texture.needsUpdate = true;
        dirty = true;
      }

      if (img.complete && img.naturalWidth) useImage();
      else img.addEventListener('load', useImage, { once: true });

      return {
        texture: texture,
        aspect: function () { return (img.naturalWidth || 16) / (img.naturalHeight || 9); }
      };
    }

    // 이미지가 없는 준비중 카드는 라벨만 그린 캔버스를 텍스처로 쓴다
    const label = item.querySelector('.thumb-empty span');
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#16181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 테두리는 여기서 그리지 않는다. 사각형이라 둥근 마스크에 모서리가 잘린다.
    // 셰이더가 마스크와 같은 거리장으로 그린다(uBorder)
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '500 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label ? label.textContent : '', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return { texture: texture, aspect: function () { return 16 / 9; }, border: 2 };
  }

  // 모든 카드가 같은 띠 위에 있어야 하므로 sheet 유니폼은 하나를 공유한다
  const sheetUniforms = {
    u_sheetW: { value: 0 },
    u_sheetD: { value: 0 },
    u_sheetT: { value: SHEET_T },
    u_sheetC: { value: SHEET_C },
    u_sheetP: { value: 1 },
    u_sheetV: { value: 0 },
    u_leanA: { value: 0 },
    u_leanW: { value: 0 }
  };

  function makeMaterial(source, mirror) {
    const uniforms = {
      uTexture: { value: source.texture },
      uCover: { value: new THREE.Vector2(1, 1) },
      uSize: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: 26 },
      uOpacity: { value: mirror ? 0.13 : 1 },
      uMirror: { value: mirror ? 1 : 0 },
      uBorder: { value: source.border || 0 }
    };
    Object.keys(sheetUniforms).forEach(function (key) { uniforms[key] = sheetUniforms[key]; });

    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: !mirror,
      vertexShader: CARD_VERT,
      fragmentShader: CARD_FRAG,
      uniforms: uniforms
    });
  }

  const floorUniforms = {
    u_run: { value: 1 },
    u_c0: { value: new THREE.Color(0x0b0c0e) },
    u_c1: { value: new THREE.Color(0x1c2026) },
    u_alpha: { value: 1 },
    u_grid: { value: 0.34 },
    u_gridF: { value: new THREE.Vector2(30, 11) }
  };
  Object.keys(sheetUniforms).forEach(function (key) { floorUniforms[key] = sheetUniforms[key]; });

  const floorMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    extensions: { derivatives: true },
    vertexShader: FLOOR_VERT,
    fragmentShader: FLOOR_FRAG,
    uniforms: floorUniforms
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 64, 64), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -100;
  scene.add(floor);

  const panels = sliderEls.map(function (el) {
    const items = Array.from(el.querySelectorAll('.content-item'));
    if (!items.length) return null;

    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);

    const cards = items.map(function (item) {
      const source = makeSource(item);
      const geometry = new THREE.PlaneGeometry(1, 1, 64, 24);

      const material = makeMaterial(source, false);
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);

      const mirrorMaterial = makeMaterial(source, true);
      const mirror = new THREE.Mesh(geometry, mirrorMaterial);
      mirror.renderOrder = -50;
      group.add(mirror);

      return {
        item: item,
        mesh: mesh,
        mirror: mirror,
        material: material,
        mirrorMaterial: mirrorMaterial,
        aspect: source.aspect
      };
    });

    const panel = {
      el: el,
      cards: cards,
      group: group,
      cardW: 0,
      cardH: 0,
      cardY: 0,
      camY: 0,
      floorY: 0,
      slot: 0,
      total: 0,
      stageW: 0,
      stageH: 0,
      ready: false,
      revealHold: false,
      target: 0,
      current: 0,
      vel: 0
    };

    // 숨은 패널은 폭이 0이라 잴 수 없다. 탭으로 보일 때 다시 잰다
    panel.measure = function () {
      const first = items[0];
      const thumb = first.querySelector('.thumb-area');
      panel.cardW = first.offsetWidth;
      panel.cardH = thumb ? thumb.offsetHeight : 0;
      if (!panel.cardW || !panel.cardH) {
        panel.ready = false;
        return;
      }

      
      panel.cardY = 0;
      panel.camY = 0;
      panel.floorY = -panel.cardH / 2 - 24;
      panel.stageH = Math.round(panel.cardH * 2.5);

      section.style.setProperty('--card-w', panel.cardW + 'px');
      panel.slot = panel.cardW + GAP;
      panel.total = cards.length * panel.slot;

      el.style.height = panel.stageH + 'px';
      panel.stageW = el.clientWidth;
      panel.ready = true;
    };

    panel.resize = function () {
      if (!panel.ready) return;
      renderer.setSize(panel.stageW, panel.stageH, false);
      camera.aspect = panel.stageW / panel.stageH;
      camera.fov = 2 * Math.atan((panel.stageH / 2) / CAM_Z) * 180 / Math.PI;
      camera.position.y = panel.camY;
      camera.updateProjectionMatrix();

      // 프러스텀 반너비·반높이. 원본이 띠의 기준으로 쓰는 값
      const halfH = panel.stageH / 2;
      const halfW = panel.stageW / 2;
      const run = halfW * 4;

     
      const drop = Math.max(panel.camY - panel.floorY, 1);
      const needScale = panel.stageH / (2 * drop) + 0.4;
      const nearZ = Math.min(CAM_Z * 0.72, CAM_Z * (1 - 1 / needScale));
      const depth = nearZ + run;

      // 가장 먼 가장자리까지 화면을 덮을 만큼 넓혀야 좌우도 안 잘린다
      const width = Math.max(halfW * 2 / (CAM_Z / (CAM_Z + run)), halfW * 4) * 2.2;

      floor.position.y = panel.floorY;
      floor.position.z = (nearZ - run) / 2;
      floor.scale.set(width, depth, 1);
      floorUniforms.u_run.value = run;

      // 칸이 월드 기준으로 같은 크기가 되도록 판 크기에 맞춰 칸 수를 잡는다
      const cell = 150;
      floorUniforms.u_gridF.value.set(width / cell, run / cell);

      panel.halfW = halfW;
      panel.halfH = halfH;
    };

    panel.layout = function () {
      if (!panel.ready) return;

      const W = panel.halfW;
      const V = panel.vel;

      sheetUniforms.u_sheetW.value = W;
      sheetUniforms.u_sheetD.value = W * SHEET_DEPTH * (1 + SHEET_VEL * V);
      sheetUniforms.u_sheetV.value = V;
      sheetUniforms.u_leanA.value = W * LEAN_DOOR;
      sheetUniforms.u_leanW.value = W;

      const shape = {
        W: W,
        D: W * SHEET_DEPTH * (1 + SHEET_VEL * V),
        V: V,
        leanA: W * LEAN_DOOR,
        stageW: panel.stageW,
        stageH: panel.stageH,
        camY: panel.camY
      };

      const half = panel.total / 2;
      const halfCardW = panel.cardW / 2;
      const halfCardH = panel.cardH / 2;

      cards.forEach(function (card, i) {
        const raw = i * panel.slot - panel.current + half;
        const x = ((raw % panel.total) + panel.total) % panel.total - half;

        // 회전도 호 배치도 없다. 평평한 한 줄. 휘는 건 셰이더가 한다
        card.mesh.position.set(x, panel.cardY, 0);
        card.mesh.scale.set(panel.cardW, panel.cardH, 1);
        card.mesh.renderOrder = -Math.abs(x);

        card.mirror.position.set(x, 2 * panel.floorY - panel.cardY, 0);
        card.mirror.scale.set(panel.cardW, -panel.cardH, 1);

        const texAspect = card.aspect();
        const planeAspect = panel.cardW / panel.cardH;
        const cover = planeAspect > texAspect
          ? [1, texAspect / planeAspect]
          : [planeAspect / texAspect, 1];

        [card.material, card.mirrorMaterial].forEach(function (material) {
          material.uniforms.uSize.value.set(panel.cardW, panel.cardH);
          material.uniforms.uCover.value.set(cover[0], cover[1]);
        });

        // 카드 네 변의 중점을 셰이더와 같은 식으로 옮겨 화면 좌표를 낸다
        const left = deform(x - halfCardW, panel.cardY, shape);
        const right = deform(x + halfCardW, panel.cardY, shape);
        const top = deform(x, panel.cardY + halfCardH, shape);
        const bottom = deform(x, panel.cardY - halfCardH, shape);

        const cx = (left.sx + right.sx) / 2;
        const cy = (top.sy + bottom.sy) / 2;
        const sx = Math.abs(right.sx - left.sx) / panel.cardW;
        const sy = Math.abs(bottom.sy - top.sy) / panel.cardH;

        const inView = cx > -panel.cardW && cx < panel.stageW + panel.cardW;
        card.mesh.visible = inView;
        card.mirror.visible = inView;

        // 카드 중심이 무대 밖으로 나가면 캡션끼리 겹친다. 그 전에 접는다
        const edge = panel.cardW * 0.28;
        const style = card.item.style;
        if (!inView || cx < edge || cx > panel.stageW - edge) {
          style.visibility = 'hidden';
          // 다시 들어올 때 캡션이 처음부터 올라오도록 되돌린다
          card.item.classList.remove('is-in');
          return;
        }
        style.visibility = '';
        if (!panel.revealHold && !card.item.classList.contains('is-in')) {
          // 화면 왼쪽 카드부터 차례로 올라온다
          const delay = Math.max(0, Math.min(1, cx / panel.stageW)) * 0.22;
          style.setProperty('--reveal-delay', delay.toFixed(2) + 's');
          card.item.classList.add('is-in');
        }
        style.left = cx + 'px';
        style.top = cy + 'px';
        style.transformOrigin = '50% 50%';
        style.transform = 'translate(-50%, -50%) scale(' + sx + ',' + sy + ')';
        style.zIndex = String(Math.round(100 - Math.abs(x) / 10));
      });
    };

    panel.refresh = function () {
      panel.measure();
      panel.resize();
      panel.layout();
    };

    return panel;
  }).filter(Boolean);

  if (!panels.length) return;

  let active = panels[0];

  function activate(panel) {
    panels.forEach(function (p) { p.group.visible = p === panel; });
    active = panel;
    panel.el.appendChild(renderer.domElement);
   
    panel.cards.forEach(function (card) { card.item.classList.remove('is-in'); });
    panel.revealHold = true;
    panel.refresh();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panel.revealHold = false;
        dirty = true;
      });
    });
    dirty = true;
  }

  // 마우스 그랩 / 터치 스와이프
  let dragging = false;
  let captured = false;
  let pointerX = 0;
  let moved = 0;
  let velocity = 0;

  sliderEls.forEach(function (el) {
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !active.ready) return;
      // 카드 대부분이 링크라 링크 위에서도 드래그를 받아야 한다.
      // 실제로 끌었을 때만 아래 click 핸들러가 이동을 막는다
      dragging = true;
      captured = false;
      pointerX = e.clientX;
      moved = 0;
      velocity = 0;
      el.classList.add('grabbing');
    });

    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - pointerX;
      pointerX = e.clientX;
      moved += Math.abs(dx);

      // 포인터는 실제로 끌기 시작한 뒤에 잡는다. pointerdown에서 곧바로 잡으면
      // 브라우저가 click 대상을 링크가 아닌 슬라이더로 바꿔 카드 링크가 죽는다
      if (!captured && moved > 4) {
        captured = true;
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
      active.target -= dx;
      // 마지막 몇 프레임을 섞어야 손 떨림에 관성이 튀지 않는다
      velocity = velocity * 0.6 + dx * 0.4;
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      captured = false;
      el.classList.remove('grabbing');
      // 관성만큼 더 흐른 뒤 가장 가까운 카드에 물린다
      const flick = Math.max(-3, Math.min(3, -velocity * 8 / active.slot));
      active.target = (Math.round(active.target / active.slot) + Math.round(flick)) * active.slot;
      velocity = 0;
    }

    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    // 가로 휠(트랙패드)만 받는다. 세로 휠은 페이지 스크롤로 넘긴다
    let wheelTimer;
    el.addEventListener('wheel', function (e) {
      if (!active.ready || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      active.target += e.deltaX;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () {
        active.target = Math.round(active.target / active.slot) * active.slot;
      }, 160);
    }, { passive: false });

    el.addEventListener('keydown', function (e) {
      if (!active.ready || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      active.target = (Math.round(active.target / active.slot) + step) * active.slot;
    });

    // 드래그로 끝난 동작은 링크 이동으로 이어지지 않게
    el.addEventListener('click', function (e) {
      if (moved > 10) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  gsap.ticker.add(function () {
    if (!onScreen || !active.ready) return;

    const distance = active.target - active.current;
    const speed = distance * (reduceMotion ? 1 : LERP);

    if (Math.abs(distance) > 0.05 || dragging) {
      active.current += speed;
      dirty = true;
    }

    // 흐르는 속도가 그대로 띠의 파고와 비틀림이 된다
    const wanted = reduceMotion ? 0 : Math.min(1, Math.abs(speed) / VEL_NORM);
    if (Math.abs(wanted - active.vel) > 0.002) {
      active.vel += (wanted - active.vel) * 0.12;
      dirty = true;
    }

    if (dirty) {
      active.layout();
      dirty = false;
    }

    renderer.render(scene, camera);
  });

  // 화면 밖일 때까지 WebGL을 돌릴 이유가 없다
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
    }, { rootMargin: '200px 0px' }).observe(section);

    // 섹션이 아니라 슬라이더를 본다. 섹션은 위쪽 소개 문단이 길어서
    // 카드가 화면에 나타나기 한참 전에 발동해 버린다
    const reveal = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      section.classList.add('is-ready');
      reveal.disconnect();
    }, { threshold: 0.3 });
    sliderEls.forEach(function (el) { reveal.observe(el); });
  } else {
    section.classList.add('is-ready');
  }

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      // 숨은 패널은 지금 잴 수 없으니 다음에 보일 때 다시 재도록 표시만 해둔다
      panels.forEach(function (panel) {
        if (panel !== active) panel.ready = false;
      });
      active.refresh();
      // 슬라이더 높이가 여기서 바뀐다. ScrollTrigger는 이미 갱신을 끝냈으므로
      // 다시 불러주지 않으면 핀 구간이 낡은 높이로 남아 레이아웃이 어긋난다
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 200);
  });

  document.querySelectorAll('.btn-tab').forEach(function (button) {
    button.addEventListener('click', function () {
      const tab = button.getAttribute('data-tab');

      document.querySelectorAll('.btn-tab').forEach(function (btn) {
        btn.classList.toggle('active', btn === button);
      });

      let next = null;
      panels.forEach(function (panel) {
        const visible = panel.el.getAttribute('data-panel') === tab;
        panel.el.classList.toggle('hidden', !visible);
        if (visible) next = panel;
      });
      if (next) activate(next);

      // 패널마다 카드 높이가 달라 핀 구간 길이가 바뀐다
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  // WebGL이 준비된 뒤에야 DOM 썸네일을 감춘다. 초기화에 실패하면 기존 화면이 그대로 남는다
  section.classList.add('is-gl');
  activate(panels[0]);
})();


$(window).mousemove(function(e){

  x=e.clientX;
  y=e.clientY;

  gsap.to('.cursor',{
      x:x,
      y:y,
  })

});


// 히어로 영역에서는 보라 점 커서를 감춘다
(function () {
  const hero = document.querySelector('.sc-intro');
  const cursor = document.querySelector('.curser-wrap');
  if (!hero || !cursor) return;

  hero.addEventListener('mouseenter', function () {
    cursor.classList.add('is-hidden');
  });
  hero.addEventListener('mouseleave', function () {
    cursor.classList.remove('is-hidden');
  });
})();










// 프로젝트 섹션이 화면 하단에 걸린 채 멈추고, 어바웃 섹션이 그 위로 올라와 덮는다
(function () {
  const projects = document.querySelector('.sc-projects');
  const about = document.querySelector('.sc-about');
  if (!projects || !about || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  ScrollTrigger.create({
    trigger: projects,
    start: 'bottom bottom',
    endTrigger: about,
    end: 'top top',
    pin: projects,
    pinSpacing: false,
    anticipatePin: 1
  });
})();

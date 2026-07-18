"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "ready" | "countdown" | "playing" | "transition" | "celebrating" | "over" | "won";
type Stage = "campus" | "laboratory" | "hospital" | "graduation";
type ObstacleKind = "backpack" | "cart" | "banner" | "sampleTray" | "microscopeCart" | "labLight" | "medicalCase" | "wheelchair" | "clinicalMonitor" | "graduationLow" | "photoCase" | "graduationGarland";
type Obstacle = { x: number; kind: ObstacleKind; passed: boolean };
type Coin = { x: number; y: number; taken: boolean };
type SoundName = "start" | "jump" | "coin" | "collision" | "phase" | "flash" | "victory";

const SPEED_RAMP_SECONDS = 75;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const characterImagesRef = useRef<HTMLImageElement[]>([]);
  const graduationImagesRef = useRef<HTMLImageElement[]>([]);
  const finaleImagesRef = useRef<HTMLImageElement[]>([]);
  const backgroundImagesRef = useRef<Partial<Record<Stage, HTMLImageElement>> | null>(null);
  const obstacleImagesRef = useRef<Record<ObstacleKind, HTMLImageElement> | null>(null);
  const coinImageRef = useRef<HTMLImageElement | null>(null);
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode; music: GainNode; timer: number; step: number } | null>(null);
  const soundOnRef = useRef(true);
  const stateRef = useRef({
    mode: "ready" as Mode,
    y: 0,
    vy: 0,
    ducking: false,
    score: 0,
    coins: 0,
    elapsed: 0,
    celebration: 0,
    speed: 340,
    distance: 0,
    spawnAt: 720,
    obstacles: [] as Obstacle[],
    coinItems: [] as Coin[],
    last: 0,
    lastStageCue: 0,
    transitionRemaining: 0,
    transitionStage: null as Stage | null,
    lastFlashCue: -1,
  });
  const [view, setView] = useState({ mode: "ready" as Mode, score: 0, coins: 0, time: 0, speed: 1, stage: "campus" as Stage });
  const [countdown, setCountdown] = useState<number | "CORRA!" | null>(null);
  const [phaseTransition, setPhaseTransition] = useState<{ stage: Stage; remaining: number } | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [graduate, setGraduate] = useState("");
  const [helperName, setHelperName] = useState("");
  const touchStartRef = useRef<{ x: number; y: number; handled: boolean; action: "jump" | "duck" | null } | null>(null);
  const graduates = ["Artur Morais", "Elen Ludmilla", "Flávia", "Judi Emily", "Leonardo Ferreira", "Luan Brito", "Maria Teresa", "Matheus Godoy"];

  const note = useCallback((frequency: number, duration: number, volume: number, type: OscillatorType = "sine", delay = 0) => {
    const audio = audioRef.current;
    if (!audio) return;
    const now = audio.ctx.currentTime + delay;
    const oscillator = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain); gain.connect(audio.master);
    oscillator.start(now); oscillator.stop(now + duration + .03);
  }, []);

  const playSound = useCallback((sound: SoundName) => {
    if (!soundOnRef.current || !audioRef.current) return;
    if (sound === "start") { note(392, .16, .07, "triangle"); note(587, .24, .06, "triangle", .11); }
    if (sound === "jump") { note(330, .1, .05, "sine"); note(523, .16, .045, "sine", .06); }
    if (sound === "coin") { note(880, .1, .055, "sine"); note(1175, .14, .05, "sine", .07); note(1568, .18, .04, "sine", .14); }
    if (sound === "collision") { note(145, .32, .08, "sawtooth"); note(92, .45, .06, "square", .08); }
    if (sound === "phase") { note(523, .22, .05, "triangle"); note(659, .25, .045, "triangle", .12); note(784, .34, .04, "triangle", .24); }
    if (sound === "flash") { note(2100, .035, .035, "square"); note(900, .055, .025, "square", .015); }
    if (sound === "victory") { [523,659,784,1047].forEach((f,i)=>note(f,.42,.055,"triangle",i*.13)); }
  }, [note]);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) {
      void audioRef.current.ctx.resume();
      return audioRef.current.ctx;
    }
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const master = ctx.createGain();
    const music = ctx.createGain();
    master.gain.value = soundOnRef.current ? .95 : 0;
    music.gain.value = .42;
    music.connect(master); master.connect(ctx.destination);
    const audio = { ctx, master, music, timer: 0, step: 0 };
    audio.timer = window.setInterval(() => {
      const s = stateRef.current;
      if (!soundOnRef.current || !["playing","celebrating","won"].includes(s.mode) || ctx.state !== "running") return;
      const roots = s.elapsed >= 90 ? [261.63,329.63,392,523.25] : s.elapsed >= 60 ? [220,277.18,329.63,440] : s.elapsed >= 30 ? [246.94,311.13,369.99,493.88] : [196,246.94,293.66,392];
      const step = audio.step++;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = step % 4 === 0 ? "triangle" : "sine";
      oscillator.frequency.value = roots[step % roots.length] * (step % 8 >= 4 ? 2 : 1);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(step % 4 === 0 ? .055 : .03, now + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .22);
      oscillator.connect(gain); gain.connect(music); oscillator.start(now); oscillator.stop(now + .24);
    }, 235);
    audioRef.current = audio;
    // A fonte curta, iniciada dentro do gesto do usuário, desbloqueia áudio no iOS/Safari.
    const unlock = ctx.createBufferSource();
    unlock.buffer = ctx.createBuffer(1, 1, 22050);
    unlock.connect(master);
    unlock.start(0);
    void ctx.resume();
    return ctx;
  }, []);

  const sync = useCallback(() => {
    const s = stateRef.current;
    setView({ mode: s.mode, score: Math.floor(s.score), coins: s.coins, time: Math.floor(s.elapsed), speed: +(s.speed / 340).toFixed(1), stage: s.elapsed >= 90 ? "graduation" : s.elapsed >= 60 ? "hospital" : s.elapsed >= 30 ? "laboratory" : "campus" });
  }, []);

  const start = useCallback(() => {
    if (!graduate || !helperName.trim()) return;
    const ctx = ensureAudio();
    const finaleTest = window.location.hostname === "terminal.local" && new URLSearchParams(window.location.search).has("finale");
    stateRef.current = { mode: "countdown", y: 0, vy: 0, ducking: false, score: 0, coins: 0, elapsed: finaleTest ? 118 : 0, celebration: 0, speed: finaleTest ? 850 : 340, distance: finaleTest ? 32000 : 0, spawnAt: finaleTest ? 32650 : 650, obstacles: [], coinItems: [], last: performance.now(), lastStageCue: finaleTest ? 3 : 0, transitionRemaining: 0, transitionStage: null, lastFlashCue: -1 };
    setCountdown(3);
    sync();

    const runCountdown = async () => {
      if (ctx.state !== "running") await ctx.resume();
      [3, 2, 1].forEach((value, index) => {
        window.setTimeout(() => {
          setCountdown(value);
          note(420 + index * 90, .12, .055, "triangle");
        }, index * 850);
      });
      window.setTimeout(() => {
        setCountdown("CORRA!");
        playSound("start");
      }, 2550);
      window.setTimeout(() => {
        stateRef.current.mode = "playing";
        stateRef.current.last = performance.now();
        setCountdown(null);
        sync();
      }, 3200);
    };
    void runCountdown();
  }, [ensureAudio, graduate, helperName, note, playSound, sync]);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.mode === "celebrating") return;
    if (s.mode !== "playing") return start();
    if (s.y === 0 && !s.ducking) { s.vy = 780; playSound("jump"); }
  }, [playSound, start]);

  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    if (audioRef.current) {
      const now = audioRef.current.ctx.currentTime;
      audioRef.current.master.gain.cancelScheduledValues(now);
      audioRef.current.master.gain.linearRampToValueAtTime(next ? .95 : 0, now + .08);
      if (next) void audioRef.current.ctx.resume();
    } else if (next) ensureAudio();
  }, [ensureAudio]);

  const duck = useCallback((active: boolean) => {
    const s = stateRef.current;
    if (s.mode === "playing" && s.y === 0) s.ducking = active;
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (stateRef.current.mode !== "playing") return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, handled: false, action: null };
  }, []);

  const triggerGesture = useCallback((dx: number, dy: number) => {
    if (stateRef.current.mode !== "playing") return null;
    if (Math.abs(dy) < 18 || Math.abs(dy) < Math.abs(dx)) return null;
    if (dy < 0) {
      jump();
      return "jump" as const;
    }
    duck(true);
    return "duck" as const;
  }, [duck, jump]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    const startPoint = touchStartRef.current;
    const touch = event.touches[0];
    if (!startPoint || !touch || startPoint.handled) return;
    const dx = touch.clientX - startPoint.x;
    const dy = touch.clientY - startPoint.y;
    const action = triggerGesture(dx, dy);
    if (action) {
      startPoint.handled = true;
      startPoint.action = action;
      event.preventDefault();
    }
  }, [triggerGesture]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    const startPoint = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!startPoint || !touch) return;
    if (startPoint.action === "duck") {
      duck(false);
      event.preventDefault();
      return;
    }
    if (!startPoint.handled) triggerGesture(touch.clientX - startPoint.x, touch.clientY - startPoint.y);
  }, [triggerGesture]);

  const handleTouchCancel = useCallback(() => {
    if (touchStartRef.current?.action === "duck") duck(false);
    touchStartRef.current = null;
  }, [duck]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) { window.clearInterval(audio.timer); void audio.ctx.close(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const sources = [
      "/characters/run/frame-01.png",
      "/characters/run/frame-02.png",
      "/characters/run/frame-03.png",
      "/characters/run/frame-04.png",
      "/characters/jump.png",
      "/characters/duck.png",
    ];
    characterImagesRef.current = sources.map(source => {
      const image = new Image();
      image.src = source;
      return image;
    });
    const graduationSources = [
      "/characters/graduation/run/frame-01.png",
      "/characters/graduation/run/frame-02.png",
      "/characters/graduation/run/frame-03.png",
      "/characters/graduation/run/frame-04.png",
      "/characters/graduation/jump.png",
      "/characters/graduation/duck.png",
    ];
    graduationImagesRef.current = graduationSources.map(source => {
      const image = new Image();
      image.src = source;
      return image;
    });
    const finaleSources = ["/finale/character-victory.png", "/finale/photographer-01.png", "/finale/photographer-02.png"];
    finaleImagesRef.current = finaleSources.map(source => { const image = new Image(); image.src = source; return image; });
    const backgroundSources: Partial<Record<Stage, string>> = { campus: "/backgrounds/campus-01.png", laboratory: "/backgrounds/laboratory-01.png", hospital: "/backgrounds/hospital-01.png", graduation: "/backgrounds/graduation-01.png" };
    backgroundImagesRef.current = Object.fromEntries(Object.entries(backgroundSources).map(([stage, source]) => {
      const image = new Image(); image.src = source; return [stage, image];
    })) as Partial<Record<Stage, HTMLImageElement>>;
    const obstacleSources: Record<ObstacleKind, string> = {
      backpack: "/obstacles/backpack.png",
      cart: "/obstacles/cart.png",
      banner: "/obstacles/banner.png",
      sampleTray: "/obstacles/sample-tray.png",
      microscopeCart: "/obstacles/microscope-cart.png",
      labLight: "/obstacles/lab-light.png",
      medicalCase: "/obstacles/medical-case.png",
      wheelchair: "/obstacles/wheelchair.png",
      clinicalMonitor: "/obstacles/clinical-monitor.png",
      graduationLow: "/obstacles/graduation-low.png",
      photoCase: "/obstacles/photo-case.png",
      graduationGarland: "/obstacles/graduation-garland.png",
    };
    obstacleImagesRef.current = Object.fromEntries(
      Object.entries(obstacleSources).map(([kind, source]) => {
        const image = new Image(); image.src = source; return [kind, image];
      })
    ) as Record<ObstacleKind, HTMLImageElement>;
    const coin = new Image(); coin.src = "/collectibles/eleven-coin.png"; coinImageRef.current = coin;
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
      if (e.code === "Space" || e.code === "ArrowUp") jump();
      if (e.code === "ArrowDown") duck(true);
    };
    const up = (e: KeyboardEvent) => e.code === "ArrowDown" && duck(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [jump, duck]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = box.width * dpr; canvas.height = box.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener("resize", resize);

    const rounded = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    };
    const draw = (now: number) => {
      const s = stateRef.current;
      const w = canvas.clientWidth, h = canvas.clientHeight, ground = h * .79;
      const dt = Math.min((now - (s.last || now)) / 1000, .034); s.last = now;
      if (s.mode === "celebrating") {
        s.celebration += dt;
        if (s.celebration >= 4.6) { s.mode = "won"; sync(); }
      }
      if (s.mode === "won") s.celebration += dt;
      if ((s.mode === "celebrating" || s.mode === "won") && s.celebration > 1.25) {
        const interval = s.mode === "won" ? 2.9 : .84;
        const flashCue = Math.floor((s.celebration - 1.25) / interval);
        if (flashCue !== s.lastFlashCue) { s.lastFlashCue = flashCue; playSound("flash"); }
      }
      if (s.mode === "playing") {
        s.elapsed += dt; s.speed = 340 + (850 - 340) * Math.min(s.elapsed / SPEED_RAMP_SECONDS, 1); s.distance += s.speed * dt; s.score += dt * 18 * (s.speed / 340);
        const stageCue = s.elapsed >= 90 ? 3 : s.elapsed >= 60 ? 2 : s.elapsed >= 30 ? 1 : 0;
        if (stageCue > s.lastStageCue) {
          s.lastStageCue = stageCue;
          s.mode = "transition";
          s.transitionRemaining = 5;
          s.transitionStage = stageCue === 1 ? "laboratory" : stageCue === 2 ? "hospital" : "graduation";
          s.ducking = false;
          touchStartRef.current = null;
          s.obstacles = [];
          s.coinItems = [];
          setPhaseTransition({ stage: s.transitionStage, remaining: 5 });
          sync();
        }
        s.vy -= 1900 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0 && s.vy < 0) s.vy = 0;
        s.obstacles.forEach(o => o.x -= s.speed * dt); s.coinItems.forEach(c => c.x -= s.speed * dt);
        if (s.distance > s.spawnAt) {
          const roll = Math.random();
          const kind: ObstacleKind = s.elapsed >= 90
            ? roll < .36 ? "graduationLow" : roll < .68 ? "photoCase" : "graduationGarland"
            : s.elapsed >= 60
            ? roll < .36 ? "medicalCase" : roll < .68 ? "wheelchair" : "clinicalMonitor"
            : s.elapsed >= 30
              ? roll < .36 ? "sampleTray" : roll < .68 ? "microscopeCart" : "labLight"
              : roll < .36 ? "backpack" : roll < .68 ? "cart" : "banner";
          const obstacleX = w + 150;
          s.obstacles.push({ x: obstacleX, kind, passed: false });

          // Mantém no máximo um Ponto Eleven visível por vez, sempre em rota segura.
          if (s.coinItems.length === 0) {
            const coinX = obstacleX - 115;
            const aerial = kind === "banner" || kind === "labLight" || kind === "clinicalMonitor" || kind === "graduationGarland";
            const large = kind === "cart" || kind === "microscopeCart" || kind === "wheelchair" || kind === "photoCase";
            const coinY = aerial ? 24 : large ? 132 : 108;
            s.coinItems.push({ x: coinX, y: coinY, taken: false });
          }
          s.spawnAt = s.distance + 720 + Math.random() * 360;
        }
        const px = Math.max(64, w * .17), pw = 45, ph = s.ducking ? 48 : 82, py = ground - ph - s.y;
        for (const o of s.obstacles) {
          const aerial = o.kind === "banner" || o.kind === "labLight" || o.kind === "clinicalMonitor" || o.kind === "graduationGarland";
          const large = o.kind === "cart" || o.kind === "microscopeCart" || o.kind === "wheelchair" || o.kind === "photoCase";
          const ow = aerial ? 160 : large ? 108 : 92;
          const oh = aerial ? 50 : large ? 58 : 50;
          const oy = aerial ? ground - 124 : ground - oh;
          if (px+10 < o.x+ow && px+pw-9 > o.x && py+8 < oy+oh && py+ph > oy+5 && s.mode === "playing") { s.mode="over"; s.ducking=false; s.transitionRemaining=0; s.transitionStage=null; setPhaseTransition(null); playSound("collision"); sync(); }
        }
        for (const c of s.coinItems) { const cy=ground-c.y; if (!c.taken && Math.abs((px+pw/2)-c.x)<38 && Math.abs((py+ph/2)-cy)<48) { c.taken=true; s.coins++; s.score+=100; playSound("coin"); } }
        s.obstacles = s.obstacles.filter(o=>o.x>-100); s.coinItems=s.coinItems.filter(c=>c.x>-60&&!c.taken);
        if (s.mode === "playing" && s.elapsed >= 120) { s.elapsed = 120; s.mode = "celebrating"; s.celebration = 0; s.obstacles = []; s.coinItems = []; playSound("victory"); sync(); }
      }
      if (s.mode === "transition") {
        s.transitionRemaining = Math.max(0, s.transitionRemaining - dt);
        s.obstacles = [];
        s.coinItems = [];
        const slowedSpeed = Math.max(150, s.speed * .42);
        s.distance += slowedSpeed * dt;
        s.vy -= 1900 * dt;
        s.y = Math.max(0, s.y + s.vy * dt);
        if (s.y === 0 && s.vy < 0) s.vy = 0;
        setPhaseTransition(current => current && Math.ceil(current.remaining) !== Math.ceil(s.transitionRemaining) ? { ...current, remaining: s.transitionRemaining } : current);
        if (s.transitionRemaining <= 0) {
          s.mode = "playing";
          s.transitionStage = null;
          s.last = now;
          setPhaseTransition(null);
          sync();
        }
      }

      const backgrounds = backgroundImagesRef.current;
      const drawBackground = (image: HTMLImageElement | undefined, alpha: number) => {
        if (!image?.complete || image.naturalWidth === 0 || alpha <= 0) return false;
        const sourceH = image.naturalHeight * .84;
        const tileW = image.naturalWidth * (h / sourceH);
        const totalScroll = s.distance * .24;
        const firstTile = Math.floor(totalScroll / tileW) - 1;
        const lastTile = Math.ceil((totalScroll + w) / tileW) + 1;
        ctx.save(); ctx.globalAlpha = alpha;
        for (let tile = firstTile; tile <= lastTile; tile++) {
          const x = tile * tileW - totalScroll;
          if (Math.abs(tile) % 2 === 1) {
            ctx.save();
            ctx.translate(x + tileW + 1, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(image, 0, 0, image.naturalWidth, sourceH, 0, 0, tileW + 1, h);
            ctx.restore();
          } else {
            ctx.drawImage(image, 0, 0, image.naturalWidth, sourceH, x, 0, tileW + 1, h);
          }
        }
        ctx.restore(); return true;
      };
      const labProgress = Math.max(0, Math.min(1, (s.elapsed - 28) / 4));
      const hospitalProgress = Math.max(0, Math.min(1, (s.elapsed - 58) / 4));
      const graduationProgress = Math.max(0, Math.min(1, (s.elapsed - 88) / 4));
      const campusAlpha = 1 - labProgress;
      const laboratoryAlpha = labProgress * (1 - hospitalProgress);
      const hospitalAlpha = hospitalProgress * (1 - graduationProgress);
      const graduationAlpha = graduationProgress;
      const backgroundReady = Boolean(backgrounds?.campus?.complete || backgrounds?.laboratory?.complete || backgrounds?.hospital?.complete || backgrounds?.graduation?.complete);
      drawBackground(backgrounds?.campus, campusAlpha);
      drawBackground(backgrounds?.laboratory, laboratoryAlpha);
      drawBackground(backgrounds?.hospital, hospitalAlpha);
      drawBackground(backgrounds?.graduation, graduationAlpha);
      if (backgroundReady) {
        const shade = ctx.createLinearGradient(0, ground - 30, 0, h);
        shade.addColorStop(0, "rgba(13,23,55,0)"); shade.addColorStop(1, "rgba(13,23,55,.34)");
        ctx.fillStyle = shade; ctx.fillRect(0, ground - 30, w, h - ground + 30);
      } else {
        const sky=ctx.createLinearGradient(0,0,0,h); sky.addColorStop(0,"#15204d"); sky.addColorStop(.58,"#3c59a7"); sky.addColorStop(1,"#9bc7ef"); ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
        ctx.fillStyle="rgba(255,255,255,.07)"; for(let i=0;i<9;i++){const x=((i*210-s.distance*.08)%(w+240))-120;ctx.beginPath();ctx.arc(x,90+(i%3)*42,70,0,Math.PI*2);ctx.fill();}
        const scroll=s.distance*.22;
        for(let i=-1;i<Math.ceil(w/170)+2;i++){const x=i*170-(scroll%170); rounded(x,ground-230,145,230,12,i%2?"#dfe9f5":"#f5f8fc"); ctx.fillStyle="#7890bb";for(let row=0;row<3;row++)for(let col=0;col<3;col++)ctx.fillRect(x+18+col*40,ground-190+row*52,23,29);ctx.fillStyle="#40d9b3";ctx.fillRect(x,ground-13,145,13);}
        ctx.fillStyle="#26345b";ctx.fillRect(0,ground,w,h-ground);ctx.fillStyle="#40517c";ctx.fillRect(0,ground,w,12);
      }

      for(const c of s.coinItems){
        const cy=ground-c.y, coin=coinImageRef.current;
        if(coin?.complete&&coin.naturalWidth>0){const size=42;ctx.drawImage(coin,c.x-size/2,cy-size/2,size,size);}else{ctx.beginPath();ctx.arc(c.x,cy,16,0,Math.PI*2);ctx.fillStyle="#ffc83d";ctx.fill();ctx.fillStyle="#243361";ctx.font="bold 15px Arial";ctx.textAlign="center";ctx.fillText("11",c.x,cy+5);}
      }
      for(const o of s.obstacles){
        const obstacleImage=obstacleImagesRef.current?.[o.kind];
        if(obstacleImage?.complete&&obstacleImage.naturalWidth>0){
          if(o.kind==="backpack") ctx.drawImage(obstacleImage,o.x-28,ground-66,150,75);
          else if(o.kind==="cart") ctx.drawImage(obstacleImage,o.x-8,ground-55,124,62);
          else if(o.kind==="banner") ctx.drawImage(obstacleImage,o.x-20,ground-145,200,100);
          else if(o.kind==="sampleTray") ctx.drawImage(obstacleImage,o.x-28,ground-65,150,75);
          else if(o.kind==="microscopeCart") ctx.drawImage(obstacleImage,o.x-5,ground-76,122,69);
          else if(o.kind==="labLight") ctx.drawImage(obstacleImage,o.x-15,ground-151,190,107);
          else if(o.kind==="medicalCase") ctx.drawImage(obstacleImage,o.x-28,ground-62,150,75);
          else if(o.kind==="wheelchair") ctx.drawImage(obstacleImage,o.x-4,ground-82,116,74);
          else if(o.kind==="clinicalMonitor") ctx.drawImage(obstacleImage,o.x-15,ground-151,190,107);
          else if(o.kind==="graduationLow") ctx.drawImage(obstacleImage,o.x-25,ground-64,148,81);
          else if(o.kind==="photoCase") ctx.drawImage(obstacleImage,o.x-8,ground-71,124,74);
          else ctx.drawImage(obstacleImage,o.x-18,ground-148,196,98);
        }else{
          const aerial=o.kind==="banner"||o.kind==="labLight"||o.kind==="clinicalMonitor"||o.kind==="graduationGarland", large=o.kind==="cart"||o.kind==="microscopeCart"||o.kind==="wheelchair"||o.kind==="photoCase";
          const ow=aerial?160:large?108:92, oh=aerial?50:large?58:50;
          rounded(o.x,aerial?ground-124:ground-oh,ow,oh,8,aerial?"#25345d":"#ff5b62");
        }
      }

      const px=Math.max(64,w*.17), ph=s.ducking?48:82, py=ground-ph-s.y;
      const frames = s.elapsed >= 90 ? graduationImagesRef.current : characterImagesRef.current;
      const runSequence = [0, 3, 1, 2];
      const runFrame = runSequence[Math.floor(now / 90) % runSequence.length];
      const characterImage = s.ducking ? frames[5] : s.y > 0 ? frames[4] : frames[runFrame];
      if (s.mode === "celebrating" || s.mode === "won") {
        const t = s.celebration;
        const ease = (v: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
        const zoom = ease(t / 1.25);
        const arrivals = ease((t - .45) / .9);
        const isVictoryScreen = s.mode === "won";
        const finale = finaleImagesRef.current;
        const victory = finale[0]?.complete && finale[0].naturalWidth > 0 ? finale[0] : frames[4];
        if (victory?.complete && victory.naturalWidth > 0) {
          const drawH = isVictoryScreen ? Math.min(330, h * .58) : 190 + zoom * 105;
          const drawW = drawH * (victory.naturalWidth / victory.naturalHeight);
          const drawX = isVictoryScreen ? w * .73 - drawW / 2 : w / 2 - drawW / 2;
          ctx.drawImage(victory, drawX, ground - drawH + 18, drawW, drawH);
        }
        const photographerH = isVictoryScreen ? Math.min(245, h * .42) : Math.min(210, h * .34);
        const leftPhotographer = finale[1], rightPhotographer = finale[2];
        if (leftPhotographer?.complete && leftPhotographer.naturalWidth > 0) {
          const photographerW = photographerH * leftPhotographer.naturalWidth / leftPhotographer.naturalHeight;
          const x = isVictoryScreen ? w * .53 - photographerW / 2 : -photographerW + arrivals * (w * .17 + photographerW);
          ctx.drawImage(leftPhotographer, x, ground - photographerH + 20, photographerW, photographerH);
        }
        if (rightPhotographer?.complete && rightPhotographer.naturalWidth > 0) {
          const photographerW = photographerH * rightPhotographer.naturalWidth / rightPhotographer.naturalHeight;
          const x = isVictoryScreen ? Math.min(w - photographerW - 18, w * .88 - photographerW / 2) : w - arrivals * (w * .18 + photographerW);
          ctx.drawImage(rightPhotographer, x, ground - photographerH + 20, photographerW, photographerH);
        }
        const flashInterval = isVictoryScreen ? 1.45 : .42;
        if (t > 1.25 && Math.floor((t - 1.25) / flashInterval) % 2 === 0) {
          const pulse = 1 - (((t - 1.25) % flashInterval) / flashInterval);
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0, pulse) * (isVictoryScreen ? .18 : .42)})`;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.fillStyle = "#f4c95d";
        for (let i = 0; i < 18; i++) {
          const fall = ((t * (42 + i * 2) + i * 57) % (h * .72));
          const x = (i * 83 + Math.sin(t * 2 + i) * 28) % w;
          ctx.save(); ctx.translate(x, fall); ctx.rotate(t * 3 + i); ctx.fillRect(-3, -7, 6, 14); ctx.restore();
        }
      } else if (characterImage?.complete && characterImage.naturalWidth > 0) {
        const drawH = s.ducking ? 112 : 164;
        const drawW = drawH * (characterImage.naturalWidth / characterImage.naturalHeight);
        const drawX = px + 22 - drawW / 2;
        const drawY = ground - drawH - s.y + (s.ducking ? 19 : 17);
        ctx.drawImage(characterImage, drawX, drawY, drawW, drawH);
      } else {
        ctx.save();ctx.translate(px,py);ctx.fillStyle="#17264f";ctx.beginPath();ctx.arc(23,s.ducking?13:15,14,0,Math.PI*2);ctx.fill();rounded(10,s.ducking?20:30,28,s.ducking?23:35,9,"#f7fafc");ctx.fillStyle="#52d6b0";ctx.fillRect(11,s.ducking?25:35,26,7);ctx.strokeStyle="#dce7f4";ctx.lineWidth=8;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(15,s.ducking?38:59);ctx.lineTo(7,s.ducking?46:78);ctx.moveTo(33,s.ducking?38:59);ctx.lineTo(42,s.ducking?45:77);ctx.stroke();ctx.restore();
      }
      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    const ticker=window.setInterval(sync,250);
    return()=>{cancelAnimationFrame(rafRef.current);clearInterval(ticker);window.removeEventListener("resize",resize);};
  },[playSound,sync]);

  return <main className="shell">
    <header>
      <div className="brand"><span className="mark">11</span><div><b>ELEVENS <em>RUN</em></b><small>JORNADA DA MEDICINA</small></div></div>
      <div className="header-actions"><button className="sound-toggle" onClick={toggleSound} aria-label={soundOn?"Silenciar áudio":"Ativar áudio"}>{soundOn?"🔊":"🔇"}</button>{view.mode!=="ready"&&<div className="phase">FASE {view.stage==="campus"?"01":view.stage==="laboratory"?"02":view.stage==="hospital"?"03":"04"} <strong>• {view.stage==="campus"?"CAMPUS":view.stage==="laboratory"?"LABORATÓRIO":view.stage==="hospital"?"INTERNATO":"COLAÇÃO"}</strong></div>}</div>
    </header>
    <section className={`game-wrap ${view.mode==="ready"?"is-ready":""}`}>
      {view.mode!=="ready"&&view.mode!=="countdown"&&<div className="hud"><div><small>PONTUAÇÃO</small><strong>{String(view.score).padStart(5,"0")}</strong></div><div><small>PONTOS ELEVENS</small><strong className="gold">● {view.coins}</strong></div><div><small>TEMPO</small><strong>{view.time}s</strong></div><div><small>RITMO</small><strong>{view.speed}x</strong></div></div>}
      <canvas ref={canvasRef} aria-label="Jogo Elevens Run" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel} />
      {view.mode==="ready"&&<div className="start-screen">
        <div className="start-copy"><span className="eyebrow">SUA JORNADA COMEÇA AGORA</span><h1>Corra rumo à<br/><em>Formatura.</em></h1><p>Colete Pontos Elevens, supere os obstáculos do campus e avance na sua jornada da Medicina.</p></div>
        <img className="hero-character" src="/characters/run/frame-01.png" alt="Personagem médica do Elevens Run" />
        <div className="identity-card">
          <label><span>FORMANDO</span><select value={graduate} onChange={event=>setGraduate(event.target.value)}><option value="">Selecione ou pesquise o formando</option>{graduates.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
          <label><span>QUEM ESTÁ AJUDANDO HOJE?</span><input value={helperName} onChange={event=>setHelperName(event.target.value)} placeholder="Digite o nome de quem está ajudando" autoComplete="name" /></label>
          <button className="start-button" onClick={start} disabled={!graduate||!helperName.trim()}>INICIAR JORNADA <span>→</span></button>
          <div className="gesture-guide"><span>☝️ <b>Deslize para cima</b><small>para pular</small></span><i/><span>👇 <b>Deslize para baixo</b><small>para abaixar</small></span></div>
        </div>
      </div>}
      {view.mode==="transition"&&phaseTransition&&<div className="phase-transition-overlay"><div className="phase-transition-card"><span>PRÓXIMA ETAPA</span><h2>{phaseTransition.stage==="laboratory"?"LABORATÓRIO":phaseTransition.stage==="hospital"?"INTERNATO":"COLAÇÃO"}</h2><p>{phaseTransition.stage==="laboratory"?"Uma nova etapa de aprendizado, prática e descobertas.":phaseTransition.stage==="hospital"?"A rotina se intensifica e os desafios ficam mais exigentes.":"A reta final da jornada até a conquista da formatura."}</p><small>Continuando em {Math.max(1,Math.ceil(phaseTransition.remaining))}s</small></div></div>}
      {view.mode==="countdown"&&<div className="countdown-overlay"><div className="countdown-card"><span className="countdown-kicker">PREPARE-SE, {graduate}</span><strong>{countdown}</strong><div className="countdown-gestures"><span>↑ <b>Deslize para cima</b><small>para pular</small></span><span>↓ <b>Deslize para baixo</b><small>para abaixar</small></span></div></div></div>}
      {view.mode!=="ready"&&view.mode!=="playing"&&view.mode!=="countdown"&&view.mode!=="celebrating"&&view.mode!=="transition"&&<div className={view.mode==="won"?"overlay victory-overlay":"overlay"}><div className="modal"><span className="eyebrow">{view.mode==="won"?"JORNADA CONCLUÍDA":"PLANTÃO ENCERRADO"}</span><h1>{view.mode==="won"?<>Você chegou à<br/><em>Formatura!</em></>:<>Quase! Tente<br/><em>mais uma vez.</em></>}</h1><p>{graduate && <strong>{graduate}: </strong>}Sua pontuação foi {view.score} com {view.coins} Pontos Elevens.</p><button onClick={start}>JOGAR NOVAMENTE<span>→</span></button></div></div>}
    </section>
    <footer><span>STUDIO ONZE • ELEVENS RUN</span><span className="legend"><i/> TOUCH-SCREEN <i/> JORNADA DA MEDICINA</span></footer>
  </main>;
}

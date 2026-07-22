"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "ready" | "countdown" | "playing" | "transition" | "celebrating" | "over" | "won";
type Stage = "campus" | "laboratory" | "hospital" | "graduation";
type ObstacleKind = "backpack" | "cart" | "banner" | "sampleTray" | "microscopeCart" | "labLight" | "medicalCase" | "wheelchair" | "clinicalMonitor" | "graduationLow" | "photoCase" | "graduationGarland";
type Obstacle = { x: number; kind: ObstacleKind; passed: boolean };
type Coin = { x: number; y: number; taken: boolean };
type SoundName = "start" | "jump" | "coin" | "collision" | "phase" | "flash" | "victory";
type Graduate = { id: number; name: string; display_name: string; contract: string };
type SavedResult = { result_code: string; elevens_confirmed: number; completion_bonus: number; position: number | null };

const SPEED_RAMP_SECONDS = 110;
const STAGE_SECONDS = 40;
const GAME_SECONDS = STAGE_SECONDS * 4;



type ResultData = {
  result_code: string;
  helper_name: string;
  score: number;
  elevens_confirmed: number;
  completed: boolean;
  graduate: { id: number; name: string; display_name: string } | null;
  event: { name: string; event_code: string } | null;
};

type RankingRow = { position: number; graduate_id: number; graduate_name: string; best_score: number; elevens_total: number; completed_games: number };

function navigate(path: string) { window.location.href = path; }

async function loadClientImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof Image === "undefined") return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function ResultPage({ code }: { code: string }) {
  const [result, setResult] = useState<ResultData | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/.netlify/functions/get-result?code=${encodeURIComponent(code)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Resultado não encontrado.");
        const rankingResponse = await fetch("/.netlify/functions/get-ranking?event_code=MED15-UNIRV-AP-2026", { cache: "no-store" });
        let currentPosition: number | null = null;
        if (rankingResponse.ok) {
          const ranking = await rankingResponse.json();
          const row = Array.isArray(ranking.accumulated) ? ranking.accumulated.find((item: RankingRow) => item.graduate_id === data.graduate_id) : null;
          currentPosition = row?.position ?? null;
        }
        if (!cancelled) {
          setResult(data);
          setPosition(currentPosition);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível abrir o resultado.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const buildStoryCanvas = useCallback(async () => {
    if (!result) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const roundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    const drawContain = (image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
      const ratio = Math.min(width / image.width, height / image.height);
      const drawWidth = image.width * ratio;
      const drawHeight = image.height * ratio;
      const drawX = x + (width - drawWidth) / 2;
      const drawY = y + (height - drawHeight) / 2;
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    };

    const drawCover = (image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
      const ratio = Math.max(width / image.width, height / image.height);
      const drawWidth = image.width * ratio;
      const drawHeight = image.height * ratio;
      const drawX = x + (width - drawWidth) / 2;
      const drawY = y + (height - drawHeight) / 2;
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    };

    const [background, photographerOne, graduateImage, photographerTwo] = await Promise.all([
      loadClientImage("/backgrounds/graduation-01.png"),
      loadClientImage("/finale/photographer-01.png"),
      loadClientImage("/finale/character-victory.png"),
      loadClientImage("/finale/photographer-02.png"),
    ]);

    ctx.fillStyle = "#03111d";
    ctx.fillRect(0, 0, 1080, 1920);

    if (background) {
      drawCover(background, 0, 0, 1080, 1920);
    }

    const pageGradient = ctx.createLinearGradient(0, 0, 0, 1920);
    pageGradient.addColorStop(0, "rgba(2, 9, 18, 0.32)");
    pageGradient.addColorStop(0.18, "rgba(2, 9, 18, 0.58)");
    pageGradient.addColorStop(0.56, "rgba(2, 9, 18, 0.76)");
    pageGradient.addColorStop(1, "rgba(2, 8, 15, 0.96)");
    ctx.fillStyle = pageGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    const warmGlow = ctx.createRadialGradient(860, 240, 80, 860, 240, 520);
    warmGlow.addColorStop(0, "rgba(255, 117, 20, 0.22)");
    warmGlow.addColorStop(1, "rgba(255, 117, 20, 0)");
    ctx.fillStyle = warmGlow;
    ctx.fillRect(0, 0, 1080, 1920);

    const panelGradient = ctx.createLinearGradient(0, 160, 0, 1760);
    panelGradient.addColorStop(0, "rgba(5, 10, 18, 0.92)");
    panelGradient.addColorStop(0.45, "rgba(7, 14, 24, 0.76)");
    panelGradient.addColorStop(1, "rgba(4, 8, 14, 0.90)");
    ctx.fillStyle = panelGradient;
    roundedRect(58, 74, 964, 1770, 56);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 80px Arial";
    ctx.fillText("FAMILY WEEK", 540, 206);
    ctx.fillStyle = "#ff7a1f";
    ctx.font = "800 42px Arial";
    ctx.fillText("NO STUDIO ONZE", 540, 262);

    ctx.fillStyle = "rgba(154, 23, 12, 0.92)";
    roundedRect(300, 318, 480, 88, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 40px Arial";
    ctx.fillText("JORNADA CONCLUÍDA", 540, 375);

    const graduateName = (result.graduate?.display_name || result.graduate?.name || "FORMANDO").toUpperCase();
    ctx.fillStyle = "#ffffff";
    ctx.font = graduateName.length > 22 ? "900 62px Arial" : "900 78px Arial";
    const words = graduateName.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const testLine = `${line} ${word}`.trim();
      if (ctx.measureText(testLine).width > 820 && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((value, index) => {
      ctx.fillText(value, 540, 520 + index * 84);
    });

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundedRect(96, 642, 888, 520, 36);
    ctx.fill();

    if (background) {
      ctx.save();
      roundedRect(96, 642, 888, 520, 36);
      ctx.clip();
      drawCover(background, 96, 642, 888, 520);
      const stageGradient = ctx.createLinearGradient(0, 642, 0, 1162);
      stageGradient.addColorStop(0, "rgba(5, 11, 20, 0.05)");
      stageGradient.addColorStop(1, "rgba(5, 11, 20, 0.72)");
      ctx.fillStyle = stageGradient;
      ctx.fillRect(96, 642, 888, 520);
      ctx.restore();
    }

    ctx.fillStyle = "rgba(5, 10, 18, 0.42)";
    ctx.fillRect(96, 972, 888, 190);

    if (photographerOne) drawContain(photographerOne, 136, 730, 220, 360);
    if (graduateImage) drawContain(graduateImage, 398, 676, 282, 430);
    if (photographerTwo) drawContain(photographerTwo, 722, 740, 220, 350);

    ctx.fillStyle = "rgba(5, 10, 18, 0.88)";
    roundedRect(88, 1198, 904, 196, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.stroke();

    const metrics = [
      { label: "lugar", value: position ? `${position}º` : "—" },
      { label: "pontos", value: result.score.toLocaleString("pt-BR") },
      { label: "Pontos Elevens", value: String(result.elevens_confirmed) },
    ];
    metrics.forEach((metric, index) => {
      const startX = 88 + index * (904 / 3);
      if (index < 2) {
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.moveTo(startX + 904 / 3, 1228);
        ctx.lineTo(startX + 904 / 3, 1362);
        ctx.stroke();
      }
      ctx.fillStyle = "#ff7a1f";
      ctx.font = "900 68px Arial";
      ctx.fillText(metric.value, startX + 904 / 6, 1288);
      ctx.fillStyle = "#b2bcc9";
      ctx.font = "500 24px Arial";
      ctx.fillText(metric.label, startX + 904 / 6, 1340);
    });

    ctx.fillStyle = "rgba(5, 10, 18, 0.82)";
    roundedRect(88, 1426, 904, 112, 26);
    ctx.fill();
    ctx.fillStyle = "#c9d1db";
    ctx.font = "500 40px Arial";
    ctx.fillText(`Jogado por ${result.helper_name}`, 540, 1496);

    ctx.fillStyle = "#f3f5f8";
    ctx.font = "600 40px Arial";
    ctx.fillText("Você viveu cada fase.", 540, 1636);
    ctx.fillText("Nós registramos cada momento.", 540, 1694);

    ctx.fillStyle = "#ff7a1f";
    ctx.font = "900 50px Arial";
    ctx.fillText("@studioonze", 540, 1788);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "600 24px Arial";
    ctx.fillText(`Código ${result.result_code}`, 540, 1844);

    return canvas;
  }, [position, result]);

  const saveImage = useCallback(async () => {
    const canvas = await buildStoryCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `family-week-${code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [buildStoryCanvas, code]);

  const share = useCallback(async () => {
    if (!result) return;
    const url = window.location.href;
    const text = `${result.graduate?.display_name || result.graduate?.name} concluiu a Jornada Elevens na Family Week no Studio Onze!`;
    try {
      const canvas = await buildStoryCanvas();
      if (canvas && navigator.share && navigator.canShare) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          const file = new File([blob], `family-week-${code}.png`, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title: "Family Week no Studio Onze", text, files: [file] });
            return;
          }
        }
      }
      if (navigator.share) await navigator.share({ title: "Family Week no Studio Onze", text, url });
      else await saveImage();
    } catch {
      /* compartilhamento cancelado */
    }
  }, [buildStoryCanvas, code, result, saveImage]);

  if (loading) return <main className="public-page center-page"><div className="loading-card">Preparando sua conquista…</div></main>;
  if (error || !result) return <main className="public-page center-page"><div className="loading-card"><h1>Resultado indisponível</h1><p>{error}</p><button onClick={() => navigate("/")}>Voltar ao jogo</button></div></main>;

  const graduateName = result.graduate?.display_name || result.graduate?.name || "Formando";

  return <main className="public-page result-page">
    <section className="story-card story-card--share story-card--cinematic">
      <div className="story-background" style={{ backgroundImage: "url('/backgrounds/graduation-01.png')" }} />
      <div className="story-background-overlay" />
      <div className="story-confetti" aria-hidden="true" />
      <div className="story-shell">
        <div className="story-logo">ELEVENS <span>RUN</span></div>
        <div className="story-brand story-brand--large"><strong>FAMILY WEEK</strong><span>NO STUDIO ONZE</span></div>
        <span className="story-ribbon story-ribbon--outline">★ &nbsp; JORNADA CONCLUÍDA &nbsp; ★</span>
        <h1 className="story-name story-name--hero">{graduateName}</h1>

        <div className="story-stage story-stage--fullbleed">
          <div className="story-stage-bg" style={{ backgroundImage: "url('/backgrounds/graduation-01.png')" }} />
          <div className="story-stage-overlay" />
          <div className="story-stage-light" />
          <div className="story-stage-characters">
            <img className="story-figure story-figure--left" src="/finale/photographer-01.png" alt="Fotógrafo do Studio Onze" />
            <img className="story-figure story-figure--main" src="/finale/character-victory.png" alt="Personagem celebrando a formatura" />
            <img className="story-figure story-figure--right" src="/finale/photographer-02.png" alt="Fotógrafo do Studio Onze" />
          </div>
        </div>

        <div className="story-metrics story-metrics--showcase story-metrics--premium">
          <div><span className="metric-icon">🏅</span><strong>{position ? `${position}º` : "—"}</strong><span>lugar</span></div>
          <div><span className="metric-icon">★</span><strong>{result.score.toLocaleString("pt-BR")}</strong><span>pontos</span></div>
          <div><span className="metric-icon">11</span><strong>{result.elevens_confirmed}</strong><span>Pontos Elevens</span></div>
        </div>

        <p className="played-by story-helper story-helper--compact">🎮 Jogado por <strong>{result.helper_name}</strong></p>
        <p className="campaign-line story-cta-copy">Você viveu cada fase.<br />Nós registramos <em>cada momento.</em></p>
        <div className="story-footer-brand">
          <b className="instagram">@studioonze</b>
          <small>Código {result.result_code}</small>
        </div>
      </div>
    </section>

    <section className="result-actions">
      <div className="story-actions-intro">
        <span>RESULTADO OFICIAL</span>
        <h2>Compartilhe sua conquista</h2>
        <p>Abra o card, salve a imagem e poste seu momento da Family Week no Studio Onze.</p>
      </div>
      <button className="primary-action" onClick={share}>Compartilhar resultado</button>
      <button onClick={saveImage}>Salvar imagem</button>
      <button onClick={() => navigate('/ranking')}>Ver ranking geral</button>
      <button className="text-action" onClick={() => navigate('/')}>Voltar ao jogo</button>
    </section>
  </main>;
}

function RankingPage() {
  const [tab,setTab]=useState<'accumulated'|'records'>('accumulated');
  const [rows,setRows]=useState<RankingRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{let cancelled=false; const load=async()=>{try{const response=await fetch('/.netlify/functions/get-ranking?event_code=MED15-UNIRV-AP-2026',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data?.error||'Não foi possível carregar o ranking.');if(!cancelled)setRows(tab==='accumulated'?data.accumulated:data.records)}catch(err){if(!cancelled)setError(err instanceof Error?err.message:'Erro ao carregar ranking.')}finally{if(!cancelled)setLoading(false)}};setLoading(true);void load();return()=>{cancelled=true}},[tab]);
  return <main className="public-page ranking-page"><header className="ranking-header"><div><span>FAMILY WEEK NO STUDIO ONZE</span><h1>Ranking geral</h1></div><button onClick={()=>navigate('/')}>Voltar ao jogo</button></header><div className="ranking-tabs"><button className={tab==='accumulated'?'active':''} onClick={()=>setTab('accumulated')}>Pontos Elevens acumulados</button><button className={tab==='records'?'active':''} onClick={()=>setTab('records')}>Melhores pontuações</button></div>{loading?<div className="ranking-empty">Atualizando ranking…</div>:error?<div className="ranking-empty">{error}</div>:rows.length===0?<div className="ranking-empty">O ranking será exibido após a primeira jornada concluída.</div>:<div className="ranking-table"><div className="ranking-row ranking-head"><span>Posição</span><span>Formando</span><span>{tab==='accumulated'?'Pontos Elevens':'Pontuação'}</span><span>Partidas</span></div>{rows.map(row=><div className="ranking-row" key={row.graduate_id}><strong className={`rank rank-${row.position}`}>{row.position}º</strong><b>{row.graduate_name}</b><strong className="rank-value">{tab==='accumulated'?row.elevens_total:row.best_score.toLocaleString('pt-BR')}</strong><span>{row.completed_games}</span></div>)}</div>}</main>;
}

export default function Home() {
  const path = typeof window === "undefined" ? "/" : window.location.pathname;
  if (path.startsWith("/resultado/")) return <ResultPage code={decodeURIComponent(path.split('/').filter(Boolean)[1] || '')} />;
  if (path === "/ranking" || path.startsWith("/ranking/")) return <RankingPage />;
  return <Game />;
}

function Game() {
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
    photoMomentActive: false,
    photoMomentElapsed: 0,
    photoMomentsTriggered: 0,
    photoMomentIndex: -1,
    photoMomentFlashPlayed: false,
  });
  const [view, setView] = useState({ mode: "ready" as Mode, score: 0, coins: 0, time: 0, speed: 1, stage: "campus" as Stage });
  const [countdown, setCountdown] = useState<number | "CORRA!" | null>(null);
  const [phaseTransition, setPhaseTransition] = useState<{ stage: Stage; remaining: number } | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [graduate, setGraduate] = useState("");
  const [graduateQuery, setGraduateQuery] = useState("");
  const [graduateSearchOpen, setGraduateSearchOpen] = useState(false);
  const [helperName, setHelperName] = useState("");
  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [graduatesLoading, setGraduatesLoading] = useState(true);
  const [graduatesError, setGraduatesError] = useState("");
  const [savingResult, setSavingResult] = useState(false);
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [saveError, setSaveError] = useState("");
  const resultSavedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; handled: boolean; action: "jump" | "duck" | null } | null>(null);


  useEffect(() => {
    let cancelled = false;
    const loadGraduates = async () => {
      try {
        setGraduatesLoading(true);
        const response = await fetch("/.netlify/functions/get-graduates?event_code=MED15-UNIRV-AP-2026", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Não foi possível carregar os formandos.");
        if (!cancelled) {
          setGraduates(Array.isArray(data.graduates) ? data.graduates : []);
          setGraduatesError("");
        }
      } catch (error) {
        if (!cancelled) setGraduatesError(error instanceof Error ? error.message : "Não foi possível carregar os formandos.");
      } finally {
        if (!cancelled) setGraduatesLoading(false);
      }
    };
    void loadGraduates();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (view.mode !== "won" || resultSavedRef.current || !graduate) return;
    resultSavedRef.current = true;
    const save = async () => {
      try {
        setSavingResult(true);
        setSaveError("");
        const selected = graduates.find(item => String(item.id) === graduate);
        if (!selected) throw new Error("Formando selecionado não encontrado.");
        const response = await fetch("/.netlify/functions/save-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_code: "MED15-UNIRV-AP-2026",
            graduate_id: selected.id,
            helper_name: helperName.trim(),
            score: view.score,
            elevens_collected: view.coins,
            completed: true,
            duration_seconds: GAME_SECONDS
          })
        });
        const saved = await response.json();
        if (!response.ok) throw new Error(saved?.error || "Não foi possível salvar o resultado.");

        let position: number | null = null;
        const rankingResponse = await fetch("/.netlify/functions/get-ranking?event_code=MED15-UNIRV-AP-2026", { cache: "no-store" });
        if (rankingResponse.ok) {
          const ranking = await rankingResponse.json();
          const row = Array.isArray(ranking.accumulated)
            ? ranking.accumulated.find((item: { graduate_id: number }) => item.graduate_id === selected.id)
            : null;
          position = row?.position ?? null;
        }

        setSavedResult({
          result_code: saved.result_code,
          elevens_confirmed: saved.elevens_confirmed,
          completion_bonus: saved.completion_bonus,
          position
        });
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Não foi possível salvar o resultado.");
      } finally {
        setSavingResult(false);
      }
    };
    void save();
  }, [graduate, graduates, helperName, view.coins, view.mode, view.score]);

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
      const roots = s.elapsed >= 120 ? [261.63,329.63,392,523.25] : s.elapsed >= 80 ? [220,277.18,329.63,440] : s.elapsed >= 40 ? [246.94,311.13,369.99,493.88] : [196,246.94,293.66,392];
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
    setView({ mode: s.mode, score: Math.floor(s.score), coins: s.coins, time: Math.floor(s.elapsed), speed: +(s.speed / 340).toFixed(1), stage: s.elapsed >= 120 ? "graduation" : s.elapsed >= 80 ? "hospital" : s.elapsed >= 40 ? "laboratory" : "campus" });
  }, []);

  const start = useCallback(() => {
    if (!graduate || !helperName.trim()) return;
    setSavedResult(null);
    setSaveError("");
    resultSavedRef.current = false;
    resultSavedRef.current = false;
    setSavedResult(null);
    setSaveError("");
    const ctx = ensureAudio();
    const finaleTest = window.location.hostname === "terminal.local" && new URLSearchParams(window.location.search).has("finale");
    stateRef.current = { mode: "countdown", y: 0, vy: 0, ducking: false, score: 0, coins: 0, elapsed: finaleTest ? 158 : 0, celebration: 0, speed: finaleTest ? 850 : 340, distance: finaleTest ? 32000 : 0, spawnAt: finaleTest ? 32650 : 650, obstacles: [], coinItems: [], last: performance.now(), lastStageCue: finaleTest ? 3 : 0, transitionRemaining: 0, transitionStage: null, lastFlashCue: -1, photoMomentActive: false, photoMomentElapsed: 0, photoMomentsTriggered: 0, photoMomentIndex: -1, photoMomentFlashPlayed: false };
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

        // Um Momento Elevens em cada uma das três primeiras fases.
        const photoMomentTimes = [22, 62, 102];
        const nextPhotoMoment = photoMomentTimes[s.photoMomentsTriggered];
        if (nextPhotoMoment !== undefined && s.elapsed >= nextPhotoMoment) {
          s.photoMomentIndex = s.photoMomentsTriggered;
          s.photoMomentsTriggered += 1;
          s.photoMomentActive = true;
          s.photoMomentElapsed = 0;
          s.photoMomentFlashPlayed = false;
          s.obstacles = [];
          s.coinItems = [];
        }
        if (s.photoMomentActive) {
          s.photoMomentElapsed += dt;
          s.obstacles = [];
          s.coinItems = [];
          if (!s.photoMomentFlashPlayed && s.photoMomentElapsed >= 1.35) {
            s.photoMomentFlashPlayed = true;
            const momentBonuses = [200, 250, 300];
            s.score += momentBonuses[s.photoMomentIndex] ?? 200;
            playSound("flash");
            sync();
          }
          if (s.photoMomentElapsed >= 3.2) {
            s.photoMomentActive = false;
            s.spawnAt = Math.max(s.spawnAt, s.distance + 650);
          }
        }

        const stageCue = s.elapsed >= 120 ? 3 : s.elapsed >= 80 ? 2 : s.elapsed >= 40 ? 1 : 0;
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
        if (!s.photoMomentActive && s.distance > s.spawnAt) {
          const roll = Math.random();
          const kind: ObstacleKind = s.elapsed >= 120
            ? roll < .36 ? "graduationLow" : roll < .68 ? "photoCase" : "graduationGarland"
            : s.elapsed >= 80
            ? roll < .36 ? "medicalCase" : roll < .68 ? "wheelchair" : "clinicalMonitor"
            : s.elapsed >= 40
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
          if (!s.photoMomentActive && px+10 < o.x+ow && px+pw-9 > o.x && py+8 < oy+oh && py+ph > oy+5 && s.mode === "playing") { s.mode="over"; s.ducking=false; s.transitionRemaining=0; s.transitionStage=null; setPhaseTransition(null); playSound("collision"); sync(); }
        }
        for (const c of s.coinItems) { const cy=ground-c.y; if (!c.taken && Math.abs((px+pw/2)-c.x)<38 && Math.abs((py+ph/2)-cy)<48) { c.taken=true; s.coins++; s.score+=100; playSound("coin"); } }
        s.obstacles = s.obstacles.filter(o=>o.x>-100); s.coinItems=s.coinItems.filter(c=>c.x>-60&&!c.taken);
        if (s.mode === "playing" && s.elapsed >= GAME_SECONDS) { s.elapsed = GAME_SECONDS; s.mode = "celebrating"; s.celebration = 0; s.obstacles = []; s.coinItems = []; playSound("victory"); sync(); }
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
      let campusAlpha = s.elapsed < 40 ? 1 : 0;
      let laboratoryAlpha = s.elapsed >= 40 && s.elapsed < 80 ? 1 : 0;
      let hospitalAlpha = s.elapsed >= 80 && s.elapsed < 120 ? 1 : 0;
      let graduationAlpha = s.elapsed >= 120 ? 1 : 0;

      // A troca visual acontece somente durante a tela de transição,
      // depois que os 40 segundos da fase foram concluídos.
      if (s.mode === "transition" && s.transitionStage) {
        const transitionProgress = Math.max(0, Math.min(1, 1 - s.transitionRemaining / 5));
        if (s.transitionStage === "laboratory") {
          campusAlpha = 1 - transitionProgress;
          laboratoryAlpha = transitionProgress;
          hospitalAlpha = 0;
          graduationAlpha = 0;
        } else if (s.transitionStage === "hospital") {
          campusAlpha = 0;
          laboratoryAlpha = 1 - transitionProgress;
          hospitalAlpha = transitionProgress;
          graduationAlpha = 0;
        } else {
          campusAlpha = 0;
          laboratoryAlpha = 0;
          hospitalAlpha = 1 - transitionProgress;
          graduationAlpha = transitionProgress;
        }
      }
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
      const frames = s.elapsed >= 120 ? graduationImagesRef.current : characterImagesRef.current;
      const runSequence = [0, 3, 1, 2];
      const runFrame = runSequence[Math.floor(now / 90) % runSequence.length];
      const characterImage = s.ducking ? frames[5] : s.y > 0 ? frames[4] : frames[runFrame];
      if (s.photoMomentActive && s.mode === "playing") {
        const finale = finaleImagesRef.current;
        const momentPhotographers = [finale[1], finale[2], finale[1]];
        const photographer = momentPhotographers[s.photoMomentIndex] ?? finale[1];
        const momentTitles = ["Primeiros passos no Campus", "Descobertas no Laboratório", "Vivência no Internato"];
        const momentBonuses = [200, 250, 300];
        const momentT = s.photoMomentElapsed;
        const enter = Math.min(1, momentT / .65);
        const exit = momentT > 2.55 ? Math.min(1, (momentT - 2.55) / .65) : 0;
        const ease = (v: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
        const photographerH = Math.min(180, h * .31);
        if (photographer?.complete && photographer.naturalWidth > 0) {
          const photographerW = photographerH * photographer.naturalWidth / photographer.naturalHeight;
          const targetX = w * .84 - photographerW / 2;
          const x = w + 30 - ease(enter) * (w + 30 - targetX) + ease(exit) * (photographerW + 90);
          const y = ground - photographerH + 22;
          const shouldFlip = s.photoMomentIndex !== 1;
          ctx.save();
          if (shouldFlip) {
            ctx.translate(x + photographerW / 2, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(photographer, -photographerW / 2, y, photographerW, photographerH);
          } else {
            ctx.drawImage(photographer, x, y, photographerW, photographerH);
          }
          ctx.restore();
        }
        const cardW = Math.min(390, w * .72);
        const cardX = Math.max(18, w * .5 - cardW / 2);
        rounded(cardX, 92, cardW, 82, 18, "rgba(8,11,16,.88)");
        ctx.strokeStyle = "rgba(255,106,0,.65)"; ctx.lineWidth = 1.5; ctx.strokeRect(cardX, 92, cardW, 82);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff7a19"; ctx.font = "900 11px Arial"; ctx.fillText("MOMENTO ELEVENS", cardX + cardW / 2, 116);
        ctx.fillStyle = "#ffffff"; ctx.font = "800 20px Arial"; ctx.fillText(momentTitles[s.photoMomentIndex] ?? "Momento registrado", cardX + cardW / 2, 143);
        ctx.fillStyle = "#ffc83d"; ctx.font = "800 13px Arial"; ctx.fillText(`+${momentBonuses[s.photoMomentIndex] ?? 200} PONTOS`, cardX + cardW / 2, 164);
        if (momentT >= 1.35 && momentT <= 1.58) {
          const flashAlpha = 1 - (momentT - 1.35) / .23;
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0, flashAlpha) * .72})`;
          ctx.fillRect(0, 0, w, h);
        }
      }

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
          <label className="graduate-search"><span>FORMANDO</span><input value={graduateQuery} onFocus={()=>setGraduateSearchOpen(true)} onBlur={()=>window.setTimeout(()=>setGraduateSearchOpen(false),140)} onChange={event=>{setGraduateQuery(event.target.value);setGraduate("");setGraduateSearchOpen(true)}} placeholder={graduatesLoading?"Carregando formandos...":"Digite o nome do formando"} disabled={graduatesLoading||!!graduatesError} autoComplete="off" role="combobox" aria-expanded={graduateSearchOpen}/>{graduateSearchOpen&&!graduatesLoading&&!graduatesError&&<div className="graduate-options">{graduates.filter(item=>item.display_name.toLocaleLowerCase('pt-BR').includes(graduateQuery.trim().toLocaleLowerCase('pt-BR'))).slice(0,8).map(item=><button type="button" key={item.id} onMouseDown={event=>event.preventDefault()} onClick={()=>{setGraduate(String(item.id));setGraduateQuery(item.display_name);setGraduateSearchOpen(false)}}><b>{item.display_name}</b><small>{item.contract}</small></button>)}{graduateQuery.trim()&&graduates.filter(item=>item.display_name.toLocaleLowerCase('pt-BR').includes(graduateQuery.trim().toLocaleLowerCase('pt-BR'))).length===0&&<p>Nenhum formando encontrado.</p>}</div>}{graduatesError&&<small className="form-error">{graduatesError}</small>}</label>
          <label><span>QUEM ESTÁ AJUDANDO HOJE?</span><input value={helperName} onChange={event=>setHelperName(event.target.value)} placeholder="Digite o nome de quem está ajudando" autoComplete="name" /></label>
          <button className="start-button" onClick={start} disabled={!graduate||!helperName.trim()}>INICIAR JORNADA <span>→</span></button>
          <div className="gesture-guide"><span>☝️ <b>Deslize para cima</b><small>para pular</small></span><i/><span>👇 <b>Deslize para baixo</b><small>para abaixar</small></span></div>
        </div>
      </div>}
      {view.mode==="transition"&&phaseTransition&&<div className="phase-transition-overlay"><div className="phase-transition-card"><span>PRÓXIMA ETAPA</span><h2>{phaseTransition.stage==="laboratory"?"LABORATÓRIO":phaseTransition.stage==="hospital"?"INTERNATO":"COLAÇÃO"}</h2><p>{phaseTransition.stage==="laboratory"?"Uma nova etapa de aprendizado, prática e descobertas.":phaseTransition.stage==="hospital"?"A rotina se intensifica e os desafios ficam mais exigentes.":"A reta final da jornada até a conquista da formatura."}</p><small>Continuando em {Math.max(1,Math.ceil(phaseTransition.remaining))}s</small></div></div>}
      {view.mode==="countdown"&&<div className="countdown-overlay"><div className="countdown-card"><span className="countdown-kicker">PREPARE-SE, {graduates.find(item=>String(item.id)===graduate)?.display_name||"FORMANDO"}</span><strong>{countdown}</strong><div className="countdown-gestures"><span>↑ <b>Deslize para cima</b><small>para pular</small></span><span>↓ <b>Deslize para baixo</b><small>para abaixar</small></span></div></div></div>}
      {view.mode==="won"&&<div className="overlay victory-overlay"><div className="victory-panel"><div className="victory-copy"><span className="family-week-label">FAMILY WEEK NO STUDIO ONZE</span><span className="eyebrow">JORNADA CONCLUÍDA</span><h1>{graduates.find(item=>String(item.id)===graduate)?.display_name||"Formando"}</h1><p>Você chegou à Formatura com <strong>{view.score.toLocaleString('pt-BR')}</strong> pontos e coletou <strong>{view.coins}</strong> Pontos Elevens.</p>{savingResult&&<div className="ranking-status"><p>Registrando sua conquista...</p></div>}{savedResult&&<div className="victory-data"><div><small>PONTOS CONFIRMADOS</small><strong>{savedResult.elevens_confirmed}</strong><span>inclui bônus de {savedResult.completion_bonus}</span></div><div><small>POSIÇÃO NO RANKING</small><strong>{savedResult.position?`${savedResult.position}º`:'—'}</strong><span>ranking acumulado</span></div><div><small>CÓDIGO</small><strong className="result-code">{savedResult.result_code}</strong></div></div>}{saveError&&<p className="form-error">{saveError}</p>}</div><div className="victory-share">{savedResult?<><img className="qr-code" src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(`${typeof window!=="undefined"?window.location.origin:""}/resultado/${savedResult.result_code}`)}`} alt="QR Code do resultado"/><h2>Leve sua conquista com você</h2><p>Escaneie para abrir seu card no celular, compartilhar e ver o ranking.</p><button className="secondary-button" onClick={()=>navigate('/ranking')}>VER RANKING GERAL</button></>:<div className="qr-placeholder">O QR Code aparecerá após a confirmação.</div>}<button className="start-button" onClick={start} disabled={savingResult}>JOGAR NOVAMENTE <span>→</span></button></div></div></div>}
      {view.mode==="over"&&<div className="overlay"><div className="modal"><span className="eyebrow">PLANTÃO ENCERRADO</span><h1>Quase! Tente<br/><em>mais uma vez.</em></h1><p>{graduate&&<strong>{graduates.find(item=>String(item.id)===graduate)?.display_name}: </strong>}Sua pontuação foi {view.score} com {view.coins} Pontos Elevens.</p><button onClick={start}>JOGAR NOVAMENTE<span>→</span></button></div></div>}
    </section>
    <footer><span>STUDIO ONZE • ELEVENS RUN</span><span className="legend"><i/> TOUCH-SCREEN <i/> JORNADA DA MEDICINA</span></footer>
  </main>;
}

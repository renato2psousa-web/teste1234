export type CharacterCatalogEntry = {
  id: string;
  name: string;
  photo?: string;
  assetsBase: string;
};


export type CharacterBundle = {
  normal: HTMLImageElement[];
  graduation: HTMLImageElement[];
  victory: HTMLImageElement;
  entry: CharacterCatalogEntry | null;
  usedFallback: boolean;
};


const CATALOG_URL = "/characters/manifest.json";
const DEFAULT_NORMAL = [
  "/characters/run/frame-01.png",
  "/characters/run/frame-02.png",
  "/characters/run/frame-03.png",
  "/characters/run/frame-04.png",
  "/characters/jump.png",
  "/characters/duck.png",
];
const DEFAULT_GRADUATION = [
  "/characters/graduation/run/frame-01.png",
  "/characters/graduation/run/frame-02.png",
  "/characters/graduation/run/frame-03.png",
  "/characters/graduation/run/frame-04.png",
  "/characters/graduation/jump.png",
  "/characters/graduation/duck.png",
];
const DEFAULT_VICTORY = "/finale/character-victory.png";


let catalogPromise: Promise<CharacterCatalogEntry[]> | null = null;


function loadImage(source: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}


async function loadCatalog(): Promise<CharacterCatalogEntry[]> {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) return [];
        const data = await response.json() as { characters?: CharacterCatalogEntry[] };
        return Array.isArray(data.characters) ? data.characters : [];
      })
      .catch(() => []);
  }
  return catalogPromise;
}


function clientSources(base: string) {
  const cleanBase = base.replace(/\/+$/, "");
  return {

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

const CATALOG_URL = "/characters/clients/manifest.json";
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
    normal: [
      `${cleanBase}/normal/run/frame-01.png`,
      `${cleanBase}/normal/run/frame-02.png`,
      `${cleanBase}/normal/run/frame-03.png`,
      `${cleanBase}/normal/run/frame-04.png`,
      `${cleanBase}/normal/jump.png`,
      `${cleanBase}/normal/duck.png`,
    ],
    graduation: [
      `${cleanBase}/graduation/run/frame-01.png`,
      `${cleanBase}/graduation/run/frame-02.png`,
      `${cleanBase}/graduation/run/frame-03.png`,
      `${cleanBase}/graduation/run/frame-04.png`,
      `${cleanBase}/graduation/jump.png`,
      `${cleanBase}/graduation/duck.png`,
    ],
    victory: `${cleanBase}/finale/character-victory.png`,
  };
}

async function loadWithFallback(primary: string, fallback: string) {
  const selected = await loadImage(primary);
  if (selected) return { image: selected, usedFallback: false };
  const defaultImage = await loadImage(fallback);
  if (!defaultImage) throw new Error(`Não foi possível carregar o asset padrão: ${fallback}`);
  return { image: defaultImage, usedFallback: true };
}

export async function loadCharacterBundle(clientId?: string): Promise<CharacterBundle> {
  const catalog = clientId ? await loadCatalog() : [];
  const entry = catalog.find(item => String(item.id) === String(clientId)) ?? null;
  const selected = entry ? clientSources(entry.assetsBase) : null;

  const normalResults = await Promise.all(
    DEFAULT_NORMAL.map((fallback, index) =>
      selected ? loadWithFallback(selected.normal[index], fallback) : loadWithFallback(fallback, fallback)
    )
  );
  const graduationResults = await Promise.all(
    DEFAULT_GRADUATION.map((fallback, index) =>
      selected ? loadWithFallback(selected.graduation[index], fallback) : loadWithFallback(fallback, fallback)
    )
  );
  const victoryResult = await loadWithFallback(selected?.victory ?? DEFAULT_VICTORY, DEFAULT_VICTORY);

  return {
    normal: normalResults.map(result => result.image),
    graduation: graduationResults.map(result => result.image),
    victory: victoryResult.image,
    entry,
    usedFallback:
      !entry ||
      normalResults.some(result => result.usedFallback) ||
      graduationResults.some(result => result.usedFallback) ||
      victoryResult.usedFallback,
  };
}

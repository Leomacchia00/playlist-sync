export type PlatformLink = { url: string; native?: string };

export type ResolveResult = {
  input: string;
  title: string | null;
  artist: string | null;
  thumbnail: string | null;
  pageUrl: string | null;
  links: Record<string, PlatformLink>;
  source: string;
};

const ODESLI_API = 'https://api.song.link/v1-alpha.1/links';
const SPOTIFY_OEMBED = 'https://open.spotify.com/oembed';
const ITUNES_LOOKUP = 'https://itunes.apple.com/lookup';

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} da ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

type OdesliResponse = {
  entityUniqueId?: string;
  pageUrl?: string;
  entitiesByUniqueId?: Record<string, { title?: string; artistName?: string; thumbnailUrl?: string }>;
  linksByPlatform?: Record<string, { url?: string; nativeAppUriMobile?: string }>;
};

export async function resolveTrack(input: string): Promise<ResolveResult> {
  const result: ResolveResult = {
    input,
    title: null,
    artist: null,
    thumbnail: null,
    pageUrl: null,
    links: {},
    source: 'none',
  };

  try {
    const data = (await fetchJson(
      `${ODESLI_API}?url=${encodeURIComponent(input)}&userCountry=IT`
    )) as OdesliResponse;
    const entity = data.entitiesByUniqueId?.[data.entityUniqueId ?? ''];
    result.title = entity?.title ?? null;
    result.artist = entity?.artistName ?? null;
    result.thumbnail = entity?.thumbnailUrl ?? null;
    result.pageUrl = data.pageUrl ?? null;
    for (const [platform, link] of Object.entries(data.linksByPlatform ?? {})) {
      if (link.url) result.links[platform] = { url: link.url, native: link.nativeAppUriMobile };
    }
    if (result.title || Object.keys(result.links).length > 0) result.source = 'song.link';
  } catch (err) {
    console.warn('song.link non disponibile:', (err as Error).message);
  }

  const host = new URL(input).hostname;

  if (!result.title && host.includes('spotify.com')) {
    try {
      const data = (await fetchJson(`${SPOTIFY_OEMBED}?url=${encodeURIComponent(input)}`)) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };
      result.title = data.title ?? null;
      result.artist = data.author_name ?? null;
      result.thumbnail = data.thumbnail_url ?? null;
      result.links.spotify = { url: input };
      result.source = 'spotify-oembed';
    } catch {}
  }

  if (!result.title && host.includes('music.apple.com')) {
    const songId = input.match(/[?&]i=(\d+)/)?.[1] ?? input.match(/\/song\/[^/]+\/(\d+)/)?.[1];
    if (songId) {
      try {
        const data = (await fetchJson(`${ITUNES_LOOKUP}?id=${songId}&entity=song&country=IT`)) as {
          results?: Array<{ trackName?: string; artistName?: string; artworkUrl100?: string; trackViewUrl?: string }>;
        };
        const track = data.results?.[0];
        if (track) {
          result.title = track.trackName ?? null;
          result.artist = track.artistName ?? null;
          result.thumbnail = track.artworkUrl100 ?? null;
          result.links.appleMusic = { url: track.trackViewUrl ?? input };
          result.source = 'itunes';
        }
      } catch {}
    }
  }

  if (!result.title && Object.keys(result.links).length === 0) {
    throw new Error('Nessun servizio ha riconosciuto il link');
  }
  return result;
}

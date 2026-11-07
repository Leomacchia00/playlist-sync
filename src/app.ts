import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chatCompletion, type ChatMessage } from './mistral.js';
import { resolveTrack } from './resolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = `Sei l'assistente di Playlist Sync, un'app che sincronizza le playlist tra Spotify, Apple Music, Tidal e altri servizi musicali.
- Aiuta l'utente a tenere sincronizzate le playlist tra i vari servizi.
- Se l'utente incolla il link di una canzone (es. un link Spotify o Apple Music che gli è stato mandato), riconosci artista e titolo quando possibile e spiega come ritrovare il brano sugli altri servizi: cerca "artista - titolo" su Tidal, oppure apri il brano tramite un link universale (es. song.link / odesli), che si apre direttamente nell'app installata (Tidal, Spotify, Apple Music, ecc.).
- Rispondi in italiano, in modo breve e pratico.`;

export const app = express();

app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  if (req.path.endsWith('.webmanifest')) {
    res.setHeader('Content-Type', 'application/manifest+json');
  }
  if (req.path === '/sw.js') {
    res.setHeader('Cache-Control', 'no-cache');
  }
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/resolve', async (req, res) => {
  const url = typeof req.query.url === 'string' ? req.query.url : '';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Parametro "url" mancante o non valido.' });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Sono accettati solo link http/https.' });
  }
  try {
    const result = await resolveTrack(url);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res
      .status(502)
      .json({ error: 'Impossibile risolvere il link: i servizi esterni non rispondono.' });
  }
});

app.post('/api/chat', async (req, res) => {
  const raw: unknown[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages: ChatMessage[] = raw
    .filter(
      (m: unknown): m is { role: 'user' | 'assistant'; content: string } =>
        typeof m === 'object' &&
        m !== null &&
        ((m as { role?: unknown }).role === 'user' ||
          (m as { role?: unknown }).role === 'assistant') &&
        typeof (m as { content?: unknown }).content === 'string'
    )
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Invia almeno un messaggio con ruolo "user".' });
  }

  try {
    const reply = await chatCompletion([
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ]);
    return res.json({ reply });
  } catch (err) {
    console.error(err);
    const statusCode =
      typeof (err as { statusCode?: unknown }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : undefined;
    return res.status(502).json({
      error:
        err instanceof Error && err.message.includes('MISTRAL_API_KEY')
          ? err.message
          : `Errore nella chiamata all'API Mistral${statusCode ? ` (HTTP ${statusCode})` : ''}.`,
    });
  }
});

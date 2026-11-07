import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chatCompletion, type ChatMessage } from './mistral.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

const SYSTEM_PROMPT = `Sei l'assistente di Playlist Sync, un'app che sincronizza le playlist tra Spotify, Apple Music, Tidal e altri servizi musicali.
- Aiuta l'utente a tenere sincronizzate le playlist tra i vari servizi.
- Se l'utente incolla il link di una canzone (es. un link Spotify o Apple Music che gli è stato mandato), riconosci artista e titolo quando possibile e spiega come ritrovare il brano sugli altri servizi: cerca "artista - titolo" su Tidal, oppure apri il brano tramite un link universale (es. song.link / odesli), che si apre direttamente nell'app installata (Tidal, Spotify, Apple Music, ecc.).
- Rispondi in italiano, in modo breve e pratico.`;

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
    return res.status(502).json({
      error:
        err instanceof Error && err.message.includes('MISTRAL_API_KEY')
          ? err.message
          : "Errore nella chiamata all'API Mistral.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Playlist Sync in ascolto su http://localhost:${PORT}`);
});

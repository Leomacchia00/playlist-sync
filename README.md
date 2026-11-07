# Playlist Sync — chat minima con Mistral

App web minima in TypeScript che chiama l'API Mistral con l'SDK ufficiale
[`@mistralai/mistralai`](https://www.npmjs.com/package/@mistralai/mistralai),
con un'interfaccia chat semplice servita dallo stesso server.

L'assistente è pensató per l'app Playlist Sync: sincronizza le playlist tra
Spotify, Apple Music, Tidal e altri servizi, e se incolli un link di una
canzone (es. un link Spotify che ti è stato mandato) ti dice di che brano si
tratta e come aprirlo/cercarlo sul servizio che usi (es. Tidal), anche tramite
link universali (song.link / odesli) che si aprono direttamente nell'app
installata.

## Struttura

```
src/server.ts    server Express: serve la UI statica e l'endpoint POST /api/chat
src/mistral.ts   client Mistral (SDK ufficiale), usa mistral-small-latest
public/          interfaccia chat (HTML/CSS/JS vanilla)
```

## Sicurezza

- `MISTRAL_API_KEY` vive **solo sul server** (file `.env`, mai committed:
  vedi `.gitignore`). Il client browser non la vede mai: parla solo con
  `/api/chat`.
- Il server limita e sanifica i messaggi ricevuti prima di passarli a Mistral.

## Installazione ed esecuzione locale

Prerequisito: Node.js 18+ (consigliato 20+).

```bash
# 1. installa le dipendenze
npm install

# 2. configura la chiave API (solo lato server)
cp .env.example .env
# poi modifica .env e inserisci: MISTRAL_API_KEY=la-tua-chiave

# 3. avvia in sviluppo (con auto-reload)
npm run dev
# oppure in produzione:
npm run build
npm start
```

Poi apri <http://localhost:3000> e scrivi un messaggio, oppure incolla un
link di una canzone.

## Installazione come app (PWA)

L'app è una **Progressive Web App**: funziona come sito web e si può installare
sul telefono come un'app, su **tutti gli OS** con un browser moderno
(Android, iOS/iPadOS, desktop, ecc.).

- **Android (Chrome/Edge)**: menu ⋮ → "Installa app" / "Aggiungi a schermata Home",
  oppure usa il pulsante "Installa app" che appare in cima alla pagina.
- **iPhone / iPad (Safari)**: pulsante Condividi → "Aggiungi a schermata Home".
- **Desktop (Chrome/Edge/Firefox)**: icona di installazione nella barra degli
  indirizzi, oppure menu → "Installa Playlist Sync".
- **Altri OS**: qualsiasi browser moderno la apre come sito; l'installazione
  è disponibile dove il browser la supporta.

Il service worker (offline + installabilità) in produzione richiede **HTTPS**;
in locale `http://localhost` è considerato un contesto sicuro.

Per rigenerare le icone: `npm run icons`.

## Deploy

La chiave `MISTRAL_API_KEY` va impostata come **variabile d'ambiente** sulla
piattaforma di hosting, mai nel codice.

### Vercel (zero-config, HTTPS automatico)

1. Importa il repository su Vercel.
2. Nelle impostazioni del progetto aggiungi la variabile d'ambiente `MISTRAL_API_KEY`.
3. Deploy: `public/` viene servito come statico (manifest, service worker e icone compresi) e `api/chat.ts` gira come funzione serverless su `POST /api/chat` (vedi `vercel.json`).

### Docker / qualsiasi host (Render, Fly.io, Railway, VPS…)

```bash
docker build -t playlist-sync .
docker run -p 3000:3000 -e MISTRAL_API_KEY=la-tua-chiave playlist-sync
```

In produzione metti l'app dietro un reverse proxy **HTTPS** (Caddy, nginx, ecc.):
il service worker della PWA funziona solo su HTTPS (o localhost).

## Risoluzione link senza AI (core dell'app)

Incollando un link di un brano (Spotify, Apple Music, YouTube, ecc.) l'app lo
risolve **senza ninguna chiave AI**: `GET /api/resolve?url=...` interroga
song.link/odesli (gratis) e, come fallback, gli oEmbed pubblici di Spotify e
l'API iTunes. Restituisce titolo, artista, copertina e i link su tutte le
piattaforme (Tidal, Spotify, Apple Music, Deezer, YouTube Music, ecc.).

I link delle piattaforme sono deep link: **su telefono aprono direttamente
l'app installata** (es. Tidal), altrimenti il sito. L'AI (chat `/api/chat`)
resta una feature opzionale: il core funziona anche senza `MISTRAL_API_KEY`.

## Endpoint

`GET /api/resolve?url=<link>` → `{ title, artist, thumbnail, pageUrl, links: { tidal: { url, native }, ... }, source }`

`POST /api/chat` (opzionale, richiede `MISTRAL_API_KEY`)

`POST /api/chat`

```json
{
  "messages": [{ "role": "user", "content": "Ciao!" }]
}
```

Risposta: `{ "reply": "..." }`

Il modello usato è `mistral-small-latest` (vedi `src/mistral.ts`).

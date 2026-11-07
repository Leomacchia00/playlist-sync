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

## Endpoint

`POST /api/chat`

```json
{
  "messages": [{ "role": "user", "content": "Ciao!" }]
}
```

Risposta: `{ "reply": "..." }`

Il modello usato è `mistral-small-latest` (vedi `src/mistral.ts`).

const messagesEl = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');

const history = [];

const PLATFORM_LABELS = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  tidal: 'Tidal',
  deezer: 'Deezer',
  youtube: 'YouTube',
  youtubeMusic: 'YouTube Music',
  amazonMusic: 'Amazon Music',
  amazonStore: 'Amazon',
  soundcloud: 'SoundCloud',
  napster: 'Napster',
  pandora: 'Pandora',
  anghami: 'Anghami',
  boomplay: 'Boomplay',
};

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg msg-${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function renderResolveCard(el, data) {
  el.textContent = '';
  const card = document.createElement('div');
  card.className = 'resolve-card';
  if (data.thumbnail) {
    const img = document.createElement('img');
    img.src = data.thumbnail;
    img.alt = '';
    card.appendChild(img);
  }
  const meta = document.createElement('div');
  meta.className = 'resolve-meta';
  const title = document.createElement('strong');
  title.textContent = data.title || 'Brano sconosciuto';
  const artist = document.createElement('span');
  artist.textContent = data.artist || '';
  meta.append(title, artist);
  card.appendChild(meta);
  const links = document.createElement('div');
  links.className = 'platform-links';
  for (const [platform, link] of Object.entries(data.links)) {
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = `Apri su ${PLATFORM_LABELS[platform] || platform}`;
    links.appendChild(a);
  }
  if (data.pageUrl) {
    const a = document.createElement('a');
    a.href = data.pageUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'link-all';
    a.textContent = 'Tutti i servizi (song.link)';
    links.appendChild(a);
  }
  card.appendChild(links);
  el.appendChild(card);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  sendBtn.disabled = true;
  addMessage('user', text);
  const pending = addMessage('assistant', '…');

  try {
    if (/^https?:\/\/\S+$/i.test(text)) {
      const res = await fetch('/api/resolve?url=' + encodeURIComponent(text));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore sconosciuto');
      renderResolveCard(pending, data);
      history.push(
        { role: 'user', content: text },
        { role: 'assistant', content: `${data.title ?? '?'} — ${data.artist ?? '?'}` }
      );
    } else {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: text }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore sconosciuto');
      pending.textContent = data.reply;
      history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
    }
  } catch (err) {
    pending.textContent = `Errore: ${err.message}`;
  } finally {
    sendBtn.disabled = false;
    input.focus();
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

const installBtn = document.getElementById('install');
const hintEl = document.getElementById('hint');
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if (isIOS && !isStandalone) {
  hintEl.textContent +=
    ' Su iPhone/iPad: tocca Condividi, poi "Aggiungi a Home" per installarla come app.';
}

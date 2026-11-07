const messagesEl = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');

const history = [];

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg msg-${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
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
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...history, { role: 'user', content: text }] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore sconosciuto');
    pending.textContent = data.reply;
    history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
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

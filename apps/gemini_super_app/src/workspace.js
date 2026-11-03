import { renderMarkdown } from '/markdown-dom.js';

const form = document.querySelector('#promptForm');
const prompt = document.querySelector('#prompt');
const model = document.querySelector('#model');
const status = document.querySelector('#status');
const send = document.querySelector('#send');
const list = document.querySelector('#conversations');
const thread = document.querySelector('#threadSection');
const empty = document.querySelector('#zeroStateSection');
const title = document.querySelector('#conversationTitle');
const remove = document.querySelector('#deleteConversation');
const attachments = document.querySelector('#attachments');
const pin = document.querySelector('#pinConversation');
const rename = document.querySelector('#renameConversation');
const renameForm = document.querySelector('#renameForm');
const renameInput = document.querySelector('#renameInput');
const renameStatus = document.querySelector('#renameStatus');
const historySearch = document.querySelector('#historySearch');
const historyStatus = document.querySelector('#historyStatus');
let currentId = null;
let currentPinned = false;
let conversations = [];
let busy = false;
let requestVersion = 0;
let listVersion = 0;
let searchTimer;

async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

function setBusy(value) {
  busy = value;
  send.disabled = value;
  prompt.disabled = value;
  model.disabled = value;
  attachments.disabled = value;
  remove.disabled = value;
  pin.disabled = value;
  rename.disabled = value;
  document.querySelector('#newConversation').disabled = value;
  for (const button of list.querySelectorAll('button')) button.disabled = value;
}

function showMessages(messages, search = '') {
  thread.replaceChildren();
  empty.hidden = messages.length > 0;
  const normalizedSearch = search.trim().normalize('NFC').toLocaleLowerCase('fr');
  let firstMatch = null;
  for (const message of messages) {
    const article = document.createElement('article');
    article.className = `message ${message.role === 'user' ? 'user' : 'assistant'}`;
    const heading = document.createElement('h2');
    heading.textContent = message.role === 'user' ? 'Vous' : 'Gemini';
    article.append(heading);
    if (normalizedSearch && message.content.normalize('NFC').toLocaleLowerCase('fr').includes(normalizedSearch)) {
      article.classList.add('search-match');
      const matchLabel = document.createElement('p');
      matchLabel.className = 'search-match-label';
      matchLabel.textContent = 'Résultat de recherche';
      article.append(matchLabel);
      firstMatch ??= article;
    }
    if (message.role === 'assistant' && Array.isArray(message.markdown)) {
      const content = document.createElement('div');
      content.className = 'markdown';
      renderMarkdown(message.markdown, content);
      article.append(content);
    } else {
      const text = document.createElement('p');
      text.textContent = message.content;
      article.append(text);
    }
    if (message.attachments?.length) {
      const files = document.createElement('div');
      files.className = 'attachments';
      const label = document.createElement('p');
      label.textContent = 'Fichiers joints';
      const fileList = document.createElement('ul');
      for (const file of message.attachments) {
        const item = document.createElement('li');
        if (typeof file.id === 'string' && currentId) {
          const link = document.createElement('a');
          link.href = `/api/app/conversations/${encodeURIComponent(currentId)}/attachments/${encodeURIComponent(file.id)}`;
          link.download = file.name;
          link.textContent = file.name;
          item.append(link);
        } else {
          item.textContent = `${file.name} (fichier indisponible)`;
        }
        fileList.append(item);
      }
      files.append(label, fileList);
      article.append(files);
    }
    thread.append(article);
  }
  const container = document.querySelector('#content');
  if (firstMatch) container.scrollTop += firstMatch.getBoundingClientRect().top - container.getBoundingClientRect().top;
  else container.scrollTop = container.scrollHeight;
}

function renderList() {
  const query = historySearch.value.trim();
  const matches = conversations;
  list.replaceChildren();
  historyStatus.textContent = query ? (matches.length ? `${matches.length} résultat${matches.length === 1 ? '' : 's'}.` : 'Aucun résultat. Essayez un autre mot.') : conversations.length ? '' : 'Aucune discussion.';
  for (const conversation of matches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'conversation';
    button.textContent = conversation.is_pinned ? `Épinglée · ${conversation.title}` : conversation.title;
    button.setAttribute('aria-current', String(conversation.id === currentId));
    button.disabled = busy;
    button.addEventListener('click', () => openConversation(conversation.id));
    list.append(button);
  }
}
historySearch.addEventListener('input', () => {
  clearTimeout(searchTimer);
  listVersion++;
  searchTimer = setTimeout(() => refreshList().catch(error => { historyStatus.textContent = error.message; }), 250);
});

async function refreshList() {
  const version = ++listVersion;
  const query = historySearch.value.trim();
  const data = await api(`/api/app/conversations${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  if (version !== listVersion) return;
  conversations = data.conversations;
  renderList();
}

function setConversation(conversation) {
  currentId = conversation?.id ?? null;
  currentPinned = Boolean(conversation?.is_pinned);
  title.textContent = conversation?.title ?? 'Nouvelle discussion';
  pin.hidden = rename.hidden = remove.hidden = !currentId;
  pin.setAttribute('aria-pressed', String(currentPinned));
  pin.textContent = currentPinned ? 'Désépingler' : 'Épingler';
  renameForm.hidden = true;
  renameStatus.textContent = '';
}

async function openConversation(id) {
  if (busy) return;
  const version = ++requestVersion;
  setBusy(true);
  status.textContent = 'Chargement de la discussion…';
  try {
    const data = await api(`/api/app/conversations/${encodeURIComponent(id)}`);
    if (version !== requestVersion) return;
    setConversation(data.conversation);
    model.value = data.conversation.model_id;
    status.textContent = '';
    showMessages(data.messages, historySearch.value);
    await refreshList();
  } catch (error) { if (version === requestVersion) status.textContent = error.message; }
  finally { if (version === requestVersion) setBusy(false); }
}

document.querySelector('#newConversation').addEventListener('click', () => {
  requestVersion++;
  setConversation(null);
  status.textContent = '';
  prompt.value = '';
  attachments.value = '';
  showMessages([]);
  refreshList().catch(error => { status.textContent = error.message; });
  prompt.focus();
});

remove.addEventListener('click', async () => {
  if (!currentId || !confirm('Supprimer cette discussion et ses messages ?')) return;
  setBusy(true);
  try {
    await api(`/api/app/conversations/${encodeURIComponent(currentId)}`, { method: 'DELETE' });
    setConversation(null);
    showMessages([]);
    await refreshList();
    status.textContent = 'Discussion supprimée.';
  } catch (error) { status.textContent = error.message; }
  finally { setBusy(false); }
});

pin.addEventListener('click', async () => {
  if (!currentId || busy) return;
  setBusy(true);
  try {
    await api(`/api/app/conversations/${encodeURIComponent(currentId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ is_pinned: !currentPinned }) });
    currentPinned = !currentPinned;
    pin.setAttribute('aria-pressed', String(currentPinned));
    pin.textContent = currentPinned ? 'Désépingler' : 'Épingler';
    await refreshList();
    status.textContent = currentPinned ? 'Discussion épinglée.' : 'Discussion désépinglée.';
  } catch (error) { status.textContent = error.message; }
  finally { setBusy(false); }
});

rename.addEventListener('click', () => {
  renameInput.value = title.textContent;
  renameForm.hidden = false;
  renameStatus.textContent = '';
  renameInput.focus();
});
document.querySelector('#renameCancel').addEventListener('click', () => { renameForm.hidden = true; rename.focus(); });
renameForm.addEventListener('submit', async event => {
  event.preventDefault();
  const newTitle = renameInput.value.trim();
  if (!currentId || busy) return;
  if (!newTitle || newTitle.length > 120) { renameStatus.textContent = 'Saisissez un titre de 1 à 120 caractères.'; renameInput.focus(); return; }
  setBusy(true);
  for (const control of renameForm.elements) control.disabled = true;
  try {
    await api(`/api/app/conversations/${encodeURIComponent(currentId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: newTitle }) });
    title.textContent = newTitle;
    renameForm.hidden = true;
    await refreshList();
    status.textContent = 'Discussion renommée.';
  } catch (error) { renameStatus.textContent = error.message; }
  finally {
    for (const control of renameForm.elements) control.disabled = false;
    setBusy(false);
    if (renameForm.hidden) rename.focus();
  }
});

prompt.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    if (event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const content = prompt.value.trim();
  if (!content) { status.textContent = 'Saisissez un message.'; prompt.focus(); return; }
  const modelId = model.value.trim();
  if (!modelId) { status.textContent = 'Indiquez un modèle.'; model.focus(); return; }
  const files = Array.from(attachments.files);
  if (files.length > 3 || files.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) { status.textContent = 'Choisissez au maximum 3 fichiers et 4 Mo au total.'; attachments.focus(); return; }
  if (files.some(file => !['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type))) { status.textContent = 'Choisissez des images PNG, JPEG, WebP ou des PDF.'; attachments.focus(); return; }
  setBusy(true);
  status.textContent = 'Envoi en cours…';
  try {
    const encodedFiles = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Impossible de lire ${file.name}.`));
      reader.onload = () => resolve({ name: file.name, mimeType: file.type, data: String(reader.result).split(',')[1] });
      reader.readAsDataURL(file);
    })));
    if (!currentId) {
      const data = await api('/api/app/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: content.slice(0, 80), model_id: modelId }) });
      setConversation(data.conversation);
      await refreshList();
    }
    const data = await api(`/api/app/conversations/${encodeURIComponent(currentId)}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content, model: modelId, attachments: encodedFiles }) });
    showMessages(data.messages);
    prompt.value = '';
    attachments.value = '';
    status.textContent = '';
    await refreshList();
  } catch (error) { status.textContent = error.message; }
  finally { setBusy(false); }
});

refreshList().catch(error => { status.textContent = error.message; });

const musicStatus = document.querySelector('#musicStatus');
const pairStart = document.querySelector('#musicPairStart');
const pairConfirm = document.querySelector('#musicPairConfirm');
const pairStatus = document.querySelector('#musicPairStatus');
pairStart.addEventListener('click', async () => {
  pairStart.disabled = true;
  pairConfirm.hidden = true;
  try {
    const result = await api('/api/ytm/pair/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    pairStatus.textContent = `Code ${result.code}. Ouvrez la confirmation et vérifiez que le même code apparaît dans YouTube Music Desktop.`;
    pairConfirm.hidden = false;
  } catch (error) { pairStatus.textContent = error.message; }
  finally { pairStart.disabled = false; }
});
pairConfirm.addEventListener('click', async () => {
  pairStart.disabled = true;
  pairConfirm.disabled = true;
  pairStatus.textContent = 'Confirmez dans la fenêtre YouTube Music Desktop.';
  try {
    const result = await api('/api/ytm/pair/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    pairStatus.textContent = result.persistent ? 'Lecteur associé. Jeton enregistré dans le coffre du système.' : 'Lecteur associé pour cette session. Le coffre du système est indisponible.';
    pairConfirm.hidden = true;
  } catch (error) { pairStatus.textContent = error.message; pairConfirm.hidden = true; }
  finally { pairStart.disabled = false; pairConfirm.disabled = false; }
});
document.querySelector('#musicRefresh').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const { state } = await api('/api/ytm/state');
    const track = state.video ? `${state.video.title} — ${state.video.author}` : 'Aucun titre';
    musicStatus.textContent = `${track} · ${state.player.trackState}`;
  } catch (error) { musicStatus.textContent = error.message; }
  finally { button.disabled = false; }
});
for (const button of document.querySelectorAll('[data-music-command]')) {
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await api('/api/ytm/state', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command: button.dataset.musicCommand }) });
      musicStatus.textContent = 'Commande envoyée. Actualisez pour voir l’état de lecture.';
    } catch (error) { musicStatus.textContent = error.message; }
    finally { button.disabled = false; }
  });
}

const musicGenForm = document.querySelector('#musicGenForm');
const musicGenStatus = document.querySelector('#musicGenStatus');
const musicGenAudio = document.querySelector('#musicGenAudio');
musicGenForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = musicGenForm.querySelector('button[type="submit"]');
  const description = document.querySelector('#musicPrompt').value.trim();
  if (!description) { musicGenStatus.textContent = 'Saisissez une description.'; return; }
  button.disabled = true;
  musicGenAudio.hidden = true;
  musicGenStatus.textContent = 'Génération en cours…';
  try {
    const job = await api('/api/audiocraft/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: description, model: document.querySelector('#musicModel').value, durationSec: Number(document.querySelector('#musicDuration').value) }) });
    let result;
    do {
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = await api(`/api/audiocraft/jobs/${encodeURIComponent(job.id)}`);
    } while (result.status === 'running');
    if (result.status !== 'complete') throw new Error(result.error || 'La génération a échoué.');
    musicGenAudio.src = `/api/audiocraft/jobs/${encodeURIComponent(job.id)}/audio`;
    musicGenAudio.hidden = false;
    musicGenStatus.textContent = 'Morceau prêt.';
  } catch (error) { musicGenStatus.textContent = error.message; }
  finally { button.disabled = false; }
});

const audioForm = document.querySelector('#audioAnalysisForm');
const audioStatus = document.querySelector('#audioStatus');
audioForm.addEventListener('submit', async event => {
  event.preventDefault();
  const file = document.querySelector('#audioFile').files[0];
  if (!file) { audioStatus.textContent = 'Sélectionnez un fichier WAV.'; return; }
  if (file.size > 16 * 1024 * 1024) { audioStatus.textContent = 'Le fichier dépasse 16 Mo.'; return; }
  const button = audioForm.querySelector('button');
  button.disabled = true;
  document.querySelector('#audioResult').hidden = true;
  audioStatus.textContent = 'Analyse en cours…';
  try {
    const result = await api('/api/media/analyze', { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: file });
    document.querySelector('#audioDetails').textContent = `${result.durationSec.toFixed(2)} s · ${result.sampleRateHz} Hz · ${result.channels === 1 ? 'mono' : 'stéréo'}`;
    document.querySelector('#audioLevels').textContent = `Niveau RMS : ${(result.rms * 100).toFixed(1)} % · Crête : ${(result.peak * 100).toFixed(1)} %`;
    document.querySelector('#audioResult').hidden = false;
    audioStatus.textContent = 'Analyse terminée.';
  } catch (error) { audioStatus.textContent = error.message; }
  finally { button.disabled = false; }
});

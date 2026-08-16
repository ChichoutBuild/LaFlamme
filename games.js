/* ============================================================
   MOTEUR DE MINI-JEUX — "La Flamme"
   Chaque jeu est défini par un type + une config, dans GAMES
   ci-dessous. La clé est "jourNumero-creneau" (creneau = morning/evening).
   Rappel : jour 1 = 7 août -> jour 11 = 17 août, ... jour 16 = 22 août.
   ============================================================ */

function normalize(str){
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/* ============================================================
   CONFIG DES 11 DÉFIS SPÉCIAUX
   ============================================================ */
window.GAMES = {

  "11-morning": {
    time: "11:00",
    name: "Qui a dit ça ?",
    type: "who-said",
    question: "« J'aurai le droit à un câlin ? »",
    options: ["Toi", "Moi"],
    answer: "Moi"
  },

  "11-evening": {
    time: "20:00",
    name: "Devine qui je suis",
    type: "emoji-guess",
    hint: "Indice : seulement le prénom",
    emojis: "🤪🔨🏠🧑‍🧒‍🧒",
    answer: "Hugo"
  },

  "12-morning": {
    time: "11:00",
    name: "Remets la phrase dans l'ordre",
    type: "reorder",
    sentence: "Je veux faire caca dans tes bras pendant un câlin"
  },

  "12-evening": {
    time: "20:00",
    name: "Image mystère",
    type: "flash-image",
    image: "/18s.png",
    question: "De quelle couleur était mon short ?",
    options: ["Bleu", "Noir", "Tout nu"],
    answer: "Bleu"
  },

  "13-morning": {
    time: "11:00",
    name: "Envoie ta tenue du jour",
    type: "photo-upload",
    prompt: "Envoie une photo de ta tenue du jour pour valider ce défi ✦"
  },

  "13-evening": {
    time: "20:00",
    name: "Wordle",
    type: "wordle",
    answer: "canard",
    maxAttempts: 10
  },

  "14-morning": {
    time: "11:00",
    name: "Devine qui je suis",
    type: "emoji-guess",
    hint: "Indice : seulement le prénom",
    emojis: "🥵💪📸",
    answer: "djilsi"
  },

  "14-evening": {
    time: "20:00",
    name: "Qui a dit ça ?",
    type: "who-said",
    question: "« Je suis pas une princesse, j'ai pas besoin de prince pour avancer »",
    options: ["Moi 💅", "Toi 😝", "Boris"],
    answer: "Toi 😝"
  },

  "15-morning": {
    time: "11:00",
    name: "Wordle",
    type: "wordle",
    answer: "geraldine", // l'accent n'est pas pris en compte dans la vérification
    maxAttempts: 10
  },

  "15-evening": {
    time: "20:00",
    name: "Code secret",
    type: "codebreaker",
    secret: "1804",
    clues: [
      { guess: "8140", wellPlaced: 0, misplaced: 4 },
      { guess: "2804", wellPlaced: 3, misplaced: 0 },
      { guess: "5081", wellPlaced: 0, misplaced: 3 },
      { guess: "1835", wellPlaced: 2, misplaced: 0 }
    ]
  },

  "16-morning": {
    time: "11:00",
    name: "Image mystère",
    type: "flash-image",
    image: "/22m.png",
    question: "Quelle était la couleur de la voiture derrière ?",
    options: ["Noire", "Blanche", "Bleue", "Je suis pas raciste"],
    answer: "Noire"
  }

};

/* ============================================================
   DISPATCHER
   ============================================================ */
window.renderGame = function(container, day, slot, cfg, alreadyDone){
  container.innerHTML = '';

  if (alreadyDone){
    container.innerHTML = '<div class="challenge-text">✅ Défi déjà réussi ✦</div>';
    return;
  }

  if (cfg.name){
    const titleEl = document.createElement('div');
    titleEl.className = 'section-title';
    titleEl.style.marginBottom = '.7rem';
    titleEl.style.fontSize = '1rem';
    titleEl.textContent = cfg.name;
    container.appendChild(titleEl);
  }

  switch (cfg.type){
    case 'who-said':      renderWhoSaid(container, day, cfg); break;
    case 'emoji-guess':   renderEmojiGuess(container, day, cfg); break;
    case 'reorder':       renderReorder(container, day, cfg); break;
    case 'flash-image':   renderFlashImage(container, day, cfg); break;
    case 'photo-upload':  renderPhotoUpload(container, day, cfg); break;
    case 'wordle':        renderWordle(container, day, cfg); break;
    case 'codebreaker':   renderCodebreaker(container, day, cfg); break;
    default:
      container.innerHTML = '<div class="challenge-text">Défi à préparer ✦</div>';
  }
};

/* Marque le défi comme réussi côté Supabase, puis verrouille
   définitivement la carte avec un message (plus moyen de rejouer). */
function completeAndLock(container, day){
  window.markChallengeComplete(day);
  container.innerHTML = '<div class="challenge-text">✅ Défi réussi, bravo ! Il reste validé ✦</div>';
}

/* ============================================================
   1) QUI A DIT ÇA — boutons à choix, vert/rouge après confirmation
   ============================================================ */
function renderWhoSaid(container, day, cfg){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="challenge-text">${cfg.question}</div>
    <div class="game-options" id="opts"></div>
    <button class="game-btn" id="confirmBtn" type="button">Confirmer</button>
    <div class="game-feedback" id="fb"></div>
  `;
  container.appendChild(wrap);

  const optsEl = wrap.querySelector('#opts');
  const fb = wrap.querySelector('#fb');
  let selected = null;

  cfg.options.forEach(opt => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'game-opt';
    b.textContent = opt;
    b.addEventListener('click', () => {
      optsEl.querySelectorAll('.game-opt').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      selected = opt;
    });
    optsEl.appendChild(b);
  });

  wrap.querySelector('#confirmBtn').addEventListener('click', () => {
    if (!selected){
      fb.textContent = 'Choisis une réponse d\'abord ✦';
      fb.className = 'game-feedback';
      return;
    }
    const isCorrect = normalize(selected) === normalize(cfg.answer);
    optsEl.querySelectorAll('.game-opt').forEach(x => {
      if (normalize(x.textContent) === normalize(cfg.answer)) x.classList.add('correct');
      else if (x.classList.contains('selected')) x.classList.add('wrong');
    });
    if (isCorrect){
      completeAndLock(container, day);
    } else {
      fb.textContent = '❌ Raté, réessaie ✦';
      fb.className = 'game-feedback ko';
    }
  });
}

/* ============================================================
   2) EMOJIS → PRÉNOM — champ texte, essais illimités
   ============================================================ */
function renderEmojiGuess(container, day, cfg){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="game-hint">${cfg.hint || ''}</div>
    <div class="challenge-text" style="font-size:2rem;">${cfg.emojis}</div>
    <input type="text" class="game-input" id="guessInput" placeholder="Ta réponse...">
    <div style="font-size:.75rem;color:var(--text-soft);margin-top:.3rem;">3 essais</div>
    <button class="game-btn" id="confirmBtn" type="button">Confirmer</button>
    <div class="game-feedback" id="fb"></div>
  `;
  container.appendChild(wrap);

  const fb = wrap.querySelector('#fb');
  wrap.querySelector('#confirmBtn').addEventListener('click', () => {
    const val = wrap.querySelector('#guessInput').value;
    if (normalize(val) === normalize(cfg.answer)){
      completeAndLock(container, day);
    } else {
      fb.textContent = '❌ Raté, réessaie ✦';
      fb.className = 'game-feedback ko';
    }
  });
}

/* ============================================================
   3) REMISE EN ORDRE — on touche les mots pour les placer
   (plus fiable que le glisser-déposer sur mobile)
   ============================================================ */
function renderReorder(container, day, cfg){
  const words = cfg.sentence.split(' ');
  const shuffled = [...words].sort(() => Math.random() - 0.5);

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="challenge-text">Touche les mots dans le bon ordre :</div>
    <div class="reorder-list" id="answerZone"></div>
    <div class="game-hint">Mots disponibles (touche pour les placer / retirer) :</div>
    <div class="reorder-list" id="poolZone"></div>
    <button class="game-btn" id="confirmBtn" type="button">Confirmer</button>
    <div class="game-feedback" id="fb"></div>
  `;
  container.appendChild(wrap);

  const poolZone = wrap.querySelector('#poolZone');
  const answerZone = wrap.querySelector('#answerZone');
  const fb = wrap.querySelector('#fb');

  shuffled.forEach(word => {
    const card = document.createElement('div');
    card.className = 'reorder-card';
    card.textContent = word;
    card.addEventListener('click', () => {
      card.classList.remove('correct', 'wrong');
      if (card.parentElement === poolZone) answerZone.appendChild(card);
      else poolZone.appendChild(card);
    });
    poolZone.appendChild(card);
  });

  wrap.querySelector('#confirmBtn').addEventListener('click', () => {
    const current = Array.from(answerZone.children);
    if (current.length !== words.length){
      fb.textContent = 'Place tous les mots d\'abord ✦';
      fb.className = 'game-feedback';
      return;
    }
    let allCorrect = true;
    current.forEach((card, idx) => {
      card.classList.remove('correct', 'wrong');
      if (card.textContent === words[idx]){
        card.classList.add('correct');
      } else {
        card.classList.add('wrong');
        allCorrect = false;
      }
    });
    if (allCorrect){
      completeAndLock(container, day);
    } else {
      fb.textContent = '❌ Pas encore — touche les mots mal placés (en rouge) pour les redéplacer ✦';
      fb.className = 'game-feedback ko';
    }
  });
}

/* ============================================================
   4) IMAGE FLASH — image affichée 2 sec puis question
   ============================================================ */
function renderFlashImage(container, day, cfg){
  const wrap = document.createElement('div');
  wrap.innerHTML = `<img src="${cfg.image}" class="flash-image" alt="indice du défi">`;
  container.appendChild(wrap);

  setTimeout(() => {
    wrap.innerHTML = `
      <div class="challenge-text">${cfg.question}</div>
      ${cfg.options ? '<div class="game-options" id="opts"></div>' : '<input type="text" class="game-input" id="guessInput" placeholder="Ta réponse...">'}
      <button class="game-btn" id="confirmBtn" type="button">Confirmer</button>
      <div class="game-feedback" id="fb"></div>
    `;
    const fb = wrap.querySelector('#fb');
    let selected = null;

    if (cfg.options){
      const optsEl = wrap.querySelector('#opts');
      cfg.options.forEach(opt => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'game-opt';
        b.textContent = opt;
        b.addEventListener('click', () => {
          optsEl.querySelectorAll('.game-opt').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
          selected = opt;
        });
        optsEl.appendChild(b);
      });
    }

    wrap.querySelector('#confirmBtn').addEventListener('click', () => {
      const val = cfg.options ? selected : wrap.querySelector('#guessInput').value;
      if (!val){
        fb.textContent = 'Choisis ou tape une réponse ✦';
        fb.className = 'game-feedback';
        return;
      }
      const isCorrect = normalize(val) === normalize(cfg.answer);
      if (cfg.options){
        wrap.querySelectorAll('.game-opt').forEach(x => {
          if (normalize(x.textContent) === normalize(cfg.answer)) x.classList.add('correct');
          else if (x.classList.contains('selected')) x.classList.add('wrong');
        });
      }
      if (isCorrect){
        completeAndLock(container, day);
      } else {
        fb.textContent = '❌ Raté, réessaie ✦';
        fb.className = 'game-feedback ko';
      }
    });
  }, 2000);
}

/* ============================================================
   5) ENVOI DE PHOTO — upload direct vers Supabase Storage
   (bucket "photos", voir instructions pour le créer)
   ============================================================ */
function renderPhotoUpload(container, day, cfg){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="challenge-text">${cfg.prompt || 'Envoie une photo pour valider ce défi ✦'}</div>
    <label class="photo-input-label" for="photoInput">📷 Choisir / prendre une photo</label>
    <input type="file" id="photoInput" accept="image/*" capture="environment" style="display:none;">
    <div class="game-feedback" id="fb"></div>
  `;
  container.appendChild(wrap);

  function extensionFor(file){
    const map = {
      'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
      'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif'
    };
    if (map[file.type]) return map[file.type];
    const parts = (file.name || '').split('.');
    const ext = parts.length > 1 ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    return ext || 'jpg';
  }

  const fb = wrap.querySelector('#fb');
  wrap.querySelector('#photoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fb.textContent = 'Envoi en cours...';
    fb.className = 'game-feedback';
    try {
      // Nom de fichier neutre (ni accents, ni espaces, ni apostrophes)
      // pour éviter les erreurs 400 de l'API Supabase Storage.
      const filename = `day${day}-${Date.now()}.${extensionFor(file)}`;
      const res = await fetch(`${window.SUPABASE_URL}/storage/v1/object/photos/${filename}`, {
        method: 'POST',
        headers: {
          apikey: window.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });
      if (res.ok){
        completeAndLock(container, day);
      } else {
        const errText = await res.text().catch(() => '');
        console.error('Upload photo échoué:', res.status, errText);
        fb.textContent = 'Erreur à l\'envoi, réessaie ✦';
        fb.className = 'game-feedback ko';
      }
    } catch (err){
      fb.textContent = 'Erreur réseau, réessaie ✦';
      fb.className = 'game-feedback ko';
    }
  });
}

/* ============================================================
   6) WORDLE — grille colorée, essais limités (cfg.maxAttempts)
   ============================================================ */
function renderWordle(container, day, cfg){
  const answer = normalize(cfg.answer);
  const wordLen = answer.length;
  const maxAttempts = cfg.maxAttempts || 6;
  const attempts = [];

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="challenge-text">Devine le mot en ${wordLen} lettres ✦</div>
    <div class="game-hint">Après chaque essai : vert = bonne lettre, bien placée. Jaune = lettre présente, mais mal placée. Gris = lettre absente du mot.</div>
    <div class="wordle-grid" id="grid"></div>
    <input type="text" class="game-input" id="wordInput" maxlength="${wordLen}" placeholder="Ta réponse (${wordLen} lettres)">
    <button class="game-btn" id="confirmBtn" type="button">Valider</button>
    <div class="game-feedback" id="fb"></div>
  `;
  container.appendChild(wrap);

  const grid = wrap.querySelector('#grid');
  const fb = wrap.querySelector('#fb');
  const input = wrap.querySelector('#wordInput');
  const btn = wrap.querySelector('#confirmBtn');

  function renderGrid(){
    grid.innerHTML = '';
    attempts.forEach(guess => {
      const row = document.createElement('div');
      row.className = 'wordle-row';
      const g = normalize(guess);
      const answerLetters = answer.split('');
      const used = new Array(wordLen).fill(false);
      const colors = new Array(wordLen).fill('gray');

      for (let i = 0; i < wordLen; i++){
        if (g[i] === answerLetters[i]){ colors[i] = 'green'; used[i] = true; }
      }
      for (let i = 0; i < wordLen; i++){
        if (colors[i] === 'green') continue;
        const idx = answerLetters.findIndex((l, j) => l === g[i] && !used[j]);
        if (idx !== -1){ colors[i] = 'yellow'; used[idx] = true; }
      }
      for (let i = 0; i < wordLen; i++){
        const cell = document.createElement('div');
        cell.className = 'wordle-cell ' + colors[i];
        cell.textContent = guess[i] || '';
        row.appendChild(cell);
      }
      grid.appendChild(row);
    });
  }

  btn.addEventListener('click', () => {
    const val = input.value.trim();
    if (normalize(val).length !== wordLen){
      fb.textContent = `Il faut ${wordLen} lettres ✦`;
      fb.className = 'game-feedback';
      return;
    }
    attempts.push(val);
    renderGrid();
    input.value = '';

    if (normalize(val) === answer){
      completeAndLock(container, day);
    } else if (attempts.length >= maxAttempts){
      fb.textContent = `❌ Plus d'essais... le mot était « ${cfg.answer} »`;
      fb.className = 'game-feedback ko';
      btn.disabled = true;
      input.disabled = true;
    } else {
      fb.textContent = `Essai ${attempts.length}/${maxAttempts}`;
      fb.className = 'game-feedback';
    }
  });
}

/* ============================================================
   7) CODE À TROUVER — indices fixes affichés, champ de saisie
   ============================================================ */
function renderCodebreaker(container, day, cfg){
  const wrap = document.createElement('div');
  const cluesHtml = (cfg.clues || []).map(c =>
    `<div>${c.guess} → ${c.wellPlaced} bien placé${c.wellPlaced > 1 ? 's' : ''}, ${c.misplaced} mal placé${c.misplaced > 1 ? 's' : ''}</div>`
  ).join('');

  wrap.innerHTML = `
    <div class="challenge-text">Trouve le code à ${cfg.secret.length} chiffres ✦</div>
    <div class="game-clues">${cluesHtml}</div>
    <input type="text" class="game-input" id="codeInput" maxlength="${cfg.secret.length}" placeholder="Ton code...">
    <button class="game-btn" id="confirmBtn" type="button">Valider</button>
    <div class="game-feedback" id="fb"></div>
  `;
  container.appendChild(wrap);

  const fb = wrap.querySelector('#fb');
  wrap.querySelector('#confirmBtn').addEventListener('click', () => {
    const val = wrap.querySelector('#codeInput').value.trim();
    if (val === cfg.secret){
      completeAndLock(container, day);
    } else {
      fb.textContent = '❌ Raté, réessaie ✦';
      fb.className = 'game-feedback ko';
    }
  });
}

/* ============================================================
   OUTIL DE TEST — à taper dans la console du navigateur
   Exemple : testGame(11, "morning")
   Affiche direct le jeu demandé dans la carte "défi du moment",
   sans avoir à changer les dates ni attendre le bon jour/heure.
   Les jours vont de 11 (17 août) à 16 (22 août).
   Les créneaux sont "morning" ou "evening".
   ============================================================ */
window.testGame = function(day, slot){
  slot = (slot === 'evening') ? 'evening' : 'morning';
  const key = `${day}-${slot}`;
  const cfg = window.GAMES[key];
  const container = document.getElementById('challengeContainer');
  if (!cfg){
    console.warn(`Aucun jeu configuré pour ${key}. Jours valides : 11 à 16.`);
    return;
  }
  if (!container){
    console.warn('Élément #challengeContainer introuvable sur cette page.');
    return;
  }
  console.log(`Affichage du jeu : ${key} (${cfg.type})`);
  window.renderGame(container, day, slot, cfg, false);
};

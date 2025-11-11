/* Chatboot core (sin IA): manejo de UI y respuestas básicas */
(function () {
  const state = {
    kb: [],
    kbLoaded: false,
    kbIndex: null, // { idf: Map, items: [{tokens:Set,bigrams:Set,rawPregunta,rawRespuesta}], vocab:Set }
    initialized: false,
    baseUrl: '',
    hasGreeted: false,
    typingEl: null,
    history: [], // [{role:'user'|'bot', text:string}]
    lastIntent: '',
    lastKBIndex: -1,
    currentTopic: '',
    cfg: {
      acceptThreshold: 2.2,   // mínimo para aceptar respuesta directa de KB
      suggestThreshold: 1.6,  // mínimo para sugerir alternativas
      w: { idf: 1.0, bigram: 1.2, direct: 2.0, synonym: 0.35, trigram: 0.9 },
    }
  };

  const SYN = {
    'precio': ['costo','tarifa','valor','cotizar','cotizacion','cotiza','cotizacion','presupuesto'],
    'soporte': ['ayuda','asistencia','mantenimiento','reparacion','incidencia','ticket'],
    'contacto': ['whatsapp','hablar','comunicar','escribir','asesor'],
    'consultoria': ['asesoria','auditoria','evaluacion','diagnostico','consultor'],
    'seguridad': ['ciberseguridad','segura','proteccion','defensa'],
    'infraestructura': ['servidores','redes','switch','firewall','backup','nube','cloud'],
    'empresa': ['negocio','compania','organizacion'],
  };

  function normalize(text) {
    try {
      return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9ñü\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (_) {
      return (text || '').toLowerCase();
    }
  }

  function tokenize(text) {
    const stop = new Set(['el','la','los','las','un','una','unos','unas','de','del','al','y','o','u','en','para','por','con','que','a','es','son','mi','su','tu','se','me','te','lo','le','les','nos']);
    const t = normalize(text).split(' ').filter(w => w && w.length >= 3 && !stop.has(w));
    return t;
  }

  function bigramsFromTokens(tokens) {
    const res = new Set();
    for (let i=0;i<tokens.length-1;i++) res.add(tokens[i]+" "+tokens[i+1]);
    return res;
  }

  function expandSynonyms(tokens) {
    // Regresa un set de sinónimos relacionados; se puntuará con menor peso
    const extra = new Set();
    for (const w of tokens) {
      for (const [k, arr] of Object.entries(SYN)) {
        if (w === k || arr.includes(w)) {
          extra.add(k);
          for (const s of arr) extra.add(s);
        }
      }
    }
    return extra;
  }

  function charTrigrams(str) {
    const s = ' ' + normalize(str) + ' ';
    const grams = new Set();
    for (let i=0;i<s.length-2;i++) grams.add(s.slice(i,i+3));
    return grams;
  }

  function jaccard(aSet, bSet) {
    let inter = 0; let union = bSet.size;
    for (const v of aSet) { if (bSet.has(v)) inter++; else union++; }
    return union === 0 ? 0 : inter/union;
  }

  function el(id) { return document.getElementById(id); }

  function scrollToBottom(container) { container.scrollTop = container.scrollHeight; }

  function saveHistory() {
    try { sessionStorage.setItem('chatboot:history', JSON.stringify(state.history.slice(-50))); } catch(_){}
    try {
      const last = { lastIntent: state.lastIntent, lastKBIndex: state.lastKBIndex, currentTopic: state.currentTopic };
      sessionStorage.setItem('chatboot:last', JSON.stringify(last));
    } catch(_){}
  }

  function restoreHistory() {
    try {
      const raw = sessionStorage.getItem('chatboot:history');
      if (raw) state.history = JSON.parse(raw) || [];
      const meta = sessionStorage.getItem('chatboot:last');
      if (meta) {
        const o = JSON.parse(meta) || {};
        state.lastIntent = o.lastIntent || '';
        state.lastKBIndex = typeof o.lastKBIndex === 'number' ? o.lastKBIndex : -1;
        state.currentTopic = o.currentTopic || '';
      }
    } catch(_){}
  }

  function renderHistory() {
    if (!state.history.length) return;
    const messages = el('chatMessages');
    if (!messages) return;
    for (const m of state.history) {
      const div = document.createElement('div');
      div.className = `message ${m.role}`;
      div.textContent = m.text;
      messages.appendChild(div);
    }
    scrollToBottom(messages);
  }

  function addMessage(text, sender = 'bot', { html = false } = {}) {
    const messages = el('chatMessages');
    if (!messages) return;
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    // Ensure displayed assistant name is axia
    try {
      if (typeof text === 'string') {
        text = text.replace(/Safyra/gi, 'axia').replace(/Xyber/gi, 'axia');
      }
    } catch (_) {}
    if (html) { div.innerHTML = text; } else { div.textContent = text; }
    messages.appendChild(div);
    state.history.push({ role: sender, text: html ? div.textContent : text });
    saveHistory();
    scrollToBottom(messages);
    return div;
  }

  function addQuickReplies(phrases) {
    if (!phrases || !phrases.length) return;
    const messages = el('chatMessages');
    const wrap = document.createElement('div');
    wrap.className = 'quick-replies';
    phrases.forEach((p) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = p;
      chip.addEventListener('click', () => {
        const input = el('userInput');
        if (!input) return;
        input.value = p;
        sendMessage();
      });
      wrap.appendChild(chip);
    });
    messages.appendChild(wrap);
    scrollToBottom(messages);
  }

  function setTyping(show) {
    const messages = el('chatMessages');
    if (!messages) return;
    if (show) {
      if (state.typingEl) return;
      const t = document.createElement('div');
      t.className = 'message bot typing';
      t.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
      messages.appendChild(t);
      state.typingEl = t;
      scrollToBottom(messages);
    } else if (state.typingEl) {
      state.typingEl.remove();
      state.typingEl = null;
    }
  }

  function buildKBIndex() {
    if (!state.kbLoaded || !state.kb.length) { state.kbIndex = null; return; }
    const df = new Map();
    const items = [];
    const vocab = new Set();
    for (const it of state.kb) {
      const rawQ = String(it.pregunta || '');
      const baseTokens = Array.from(new Set(tokenize(rawQ)));
      const fromItem = Array.isArray(it.sinonimos) ? it.sinonimos.map(normalize) : [];
      const synSet = expandSynonyms(baseTokens.concat(fromItem));
      const allTokens = Array.from(new Set(baseTokens)); // sin sinónimos para IDF
      const bigs = bigramsFromTokens(allTokens);
      items.push({
        tokens: new Set(allTokens),
        syns: new Set(synSet),
        bigrams: bigs,
        rawPregunta: rawQ,
        rawRespuesta: it.respuesta || ''
      });
      for (const t of allTokens) { vocab.add(t); df.set(t, (df.get(t) || 0) + 1); }
    }
    const N = items.length;
    const idf = new Map();
    for (const t of vocab) {
      const dfi = df.get(t) || 1;
      idf.set(t, Math.log(1 + N / dfi));
    }
    state.kbIndex = { idf, items, vocab };
  }

  function scoreAgainstKB(query, opts = {}) {
    if (!state.kbIndex) return null;
    const qBase = tokenize(query);
    const qSyns = Array.from(expandSynonyms(qBase));
    const ctxBase = tokenize((opts.context || ''));
    const ctxSyns = Array.from(expandSynonyms(ctxBase));
    const allTokens = Array.from(new Set(qBase.concat(ctxBase))); // IDF solo con tokens base
    const allSyns = Array.from(new Set(qSyns.concat(ctxSyns)));
    const qBigrams = bigramsFromTokens(allTokens);
    const qTri = charTrigrams(query);
    let best = { idx: -1, score: 0 };
    const scores = [];
    for (let i=0;i<state.kbIndex.items.length;i++) {
      const item = state.kbIndex.items[i];
      let s = 0;
      // Token IDF overlap (base)
      for (const t of allTokens) { if (item.tokens.has(t)) s += state.cfg.w.idf * (state.kbIndex.idf.get(t) || 0.2); }
      // Synonym light overlap
      for (const t of allSyns) { if (item.tokens.has(t) || item.syns?.has(t)) s += state.cfg.w.synonym; }
      // Bigram similarity (frases)
      s += state.cfg.w.bigram * jaccard(qBigrams, item.bigrams);
      // Character trigram similarity (robustez a typos)
      const pTri = charTrigrams(item.rawPregunta);
      s += state.cfg.w.trigram * jaccard(qTri, pTri);
      // Direct include boost (cuando el usuario es explícito)
      const qn = normalize(query);
      const pn = normalize(item.rawPregunta);
      if (pn.includes(qn) || qn.includes(pn)) s += state.cfg.w.direct;
      scores.push({ idx: i, score: s });
      if (s > best.score) best = { idx: i, score: s };
    }
    scores.sort((a,b)=>b.score-a.score);
    return { best, top3: scores.slice(0,3) };
  }

  function extractTopic(text) {
    const synSet = expandSynonyms(tokenize(text));
    const hasFn = synSet && typeof synSet.has === 'function'
      ? (k) => synSet.has(k)
      : (k) => Array.isArray(synSet) && synSet.includes(k);
    const known = ['ciberseguridad','seguridad','soporte','mantenimiento','infraestructura','consultoria','auditoria','backup','nube','firewall'];
    for (const k of known) { if (hasFn(k)) return k; }
    return '';
  }

  function bestKBReply(userText) {
    if (!state.kbLoaded || !Array.isArray(state.kb) || !state.kb.length) return null;
    // First pass: plain query
    let res = scoreAgainstKB(userText, {});
    // If low score, add context from lastIntent/currentTopic
    if (!res || res.best.score < state.cfg.suggestThreshold) {
      const ctx = [state.lastIntent, state.currentTopic].filter(Boolean).join(' ');
      res = scoreAgainstKB(userText, { context: ctx });
    }
    if (!res) return null;
    const { best, top3 } = res;
    if (best.idx < 0) return null;
    // Thresholds: tune for recall then precision
    const reply = state.kb[best.idx]?.respuesta;
    if (!reply) return null;
    // If under accept threshold, do not answer directly; suggest clarifications
    if (best.score < state.cfg.acceptThreshold) {
      const suggestions = top3
        .map(x => state.kb[x.idx]?.pregunta)
        .filter(Boolean)
        .slice(0, 3);
      if (suggestions.length) {
        addMessage('¿Te refieres a alguno de estos temas?', 'bot');
        addQuickReplies(suggestions);
        return null; // no respuesta directa para evitar generalidades
      }
    }
    // Update conversation state
    state.lastIntent = state.kb[best.idx]?.pregunta || '';
    state.lastKBIndex = best.idx;
    const t = extractTopic(state.lastIntent);
    if (t) state.currentTopic = t;
    return reply;
  }

  function basicReply(userText) {
    const q = normalize(userText);
    if (!q) return '¿Podrías repetirlo?';
    // Follow-ups leverage memory
    if (/(mas|m[aá]s) info|detalles|cuentame|amplia|ampliar|explica/.test(q)) {
      if (state.lastKBIndex >= 0) {
        return 'Claro. ¿Qué aspecto te interesa: alcance, tiempos, o costos?';
      }
    }
    if (q.includes('hola') || q.includes('buenas') || q.includes('buenos dias') || q.includes('buenas tardes')) {
      return '¡Hola! Soy axia. ¿En qué puedo ayudarte?';
    }
    if (q.includes('contacto') || q.includes('whatsapp') || q.includes('hablar') || q.includes('asesor')) {
      return 'Puedes escribirnos a WhatsApp: +57 313 234 4719 o al correo comunicaciones@vica-technology.com';
    }
    if (q.includes('precio') || q.includes('costo') || q.includes('cotiza') || q.includes('tarifa')) {
      const topic = state.currentTopic ? ` para ${state.currentTopic}` : '';
      return `Con gusto cotizamos${topic}. ¿Prefieres que te contacte un asesor por WhatsApp?`;
    }
    if (q.includes('soporte') || q.includes('mantenimiento') || q.includes('ayuda')) {
      return 'Ofrecemos soporte y mantenimiento. ¿Quieres que un asesor te contacte?';
    }
    // fallback
    return 'Gracias por tu mensaje. Estoy aprendiendo con nuestra base de preguntas; si quieres, dime más detalles o el servicio de interés.';
  }

  function respond(userText) {
    // Try KB with context first
    const kb = bestKBReply(userText);
    if (kb) return kb;
    // If KB loaded but no confident match, avoid genérica; pide aclaración
    if (state.kbLoaded) {
      return 'Para ayudarte mejor, ¿puedes aclarar el tema o elegir una opción sugerida?';
    }
    // Si no hay KB, usa reglas básicas
    return basicReply(userText);
  }

  function handleFirstOpen() {
    if (state.hasGreeted || state.history.length) return;
    addMessage('¡Hola! Soy axia, tu asistente virtual. ¿En qué puedo ayudarte hoy?', 'bot');
    addQuickReplies([
      'Quiero cotizar',
      'Servicios de ciberseguridad',
      'Soporte y mantenimiento',
      'Contacto con un asesor'
    ]);
    state.hasGreeted = true;
  }

  function showChat() {
    const c = el('chatContainer');
    if (!c) return;
    c.style.display = 'flex';
    if (!state.history.length) handleFirstOpen();
  }

  function hideChat() {
    const c = el('chatContainer');
    if (!c) return;
    c.style.display = 'none';
  }

  function sendMessage() {
    const input = el('userInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const r = respond(text);
      const msg = addMessage(r, 'bot');
      // Offer context-based quick replies for continuity
      const topic = extractTopic(text) || state.currentTopic;
      if (topic) state.currentTopic = topic;
      const followups = ['Más info','Precios','Hablar con asesor'];
      addQuickReplies(followups);
    }, 500);
  }

  async function tryFetch(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) {
        console.log('[Chatboot] KB fetch OK:', url);
        return r.json();
      } else {
        console.warn('[Chatboot] KB fetch failed status', r.status, 'for', url);
      }
    } catch(err) {
      console.warn('[Chatboot] KB fetch error for', url, err);
    }
    return null;
  }

  function safeURL(relative, base) {
    try { return new URL(relative, base).href; } catch(_) { return null; }
  }

  async function loadKB(baseUrl) {
    // 1) Si está embebido manualmente
    if (Array.isArray(window.__CHATBOOT_KB__)) {
      state.kb = window.__CHATBOOT_KB__;
      state.kbLoaded = true;
      buildKBIndex();
      return;
    }
    const tag = document.getElementById('chatboot-kb');
    if (tag && tag.textContent) {
      try {
        const data = JSON.parse(tag.textContent);
        if (Array.isArray(data)) {
          state.kb = data; state.kbLoaded = true; buildKBIndex(); return;
        }
      } catch(_){}
    }
    // 2) Intentos de rutas relativas comunes (seguros)
    let baseAbs;
    try { baseAbs = new URL(baseUrl, window.location.href).href; } catch(_) { baseAbs = window.location.href; }
    const docAbs = window.location.href;
    const candidates = [
      // relativos al script (chatboot/)
      safeURL('../base_datos_chatboot.json', baseAbs),
      safeURL('../../base_datos_chatboot.json', baseAbs),
      safeURL('base_datos_chatboot.json', baseAbs),
      // relativos al documento actual (mejora para file://)
      safeURL('base_datos_chatboot.json', docAbs),
      safeURL('../base_datos_chatboot.json', docAbs),
      safeURL('../../base_datos_chatboot.json', docAbs),
      // absoluto cuando hay origin http(s)
      (location.origin && location.origin.startsWith('http') ? (location.origin + '/base_datos_chatboot.json') : null),
    ].filter(Boolean);
    console.log('[Chatboot] Intentando cargar KB de:', candidates);
    for (const u of candidates) {
      const data = await tryFetch(u);
      if (Array.isArray(data)) { state.kb = data; state.kbLoaded = true; buildKBIndex(); console.log('[Chatboot] KB cargada:', state.kb.length, 'preguntas'); return; }
    }
    // 3) No se pudo cargar KB
    state.kbLoaded = false;
    console.warn('[Chatboot] No se pudo cargar base_datos_chatboot.json. Sirve el sitio en http(s) o embebe la KB.');
  }

  function wireEvents() {
    const btnToggle = el('chatToggle');
    const btnClose = el('chatClose');
    const btnSend = document.querySelector('.chat-input button');
    const input = el('userInput');
    if (btnToggle) btnToggle.addEventListener('click', showChat);
    if (btnClose) btnClose.addEventListener('click', hideChat);
    if (btnSend) btnSend.addEventListener('click', sendMessage);
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  async function init(options = {}) {
    if (state.initialized) return;
    state.baseUrl = options.baseUrl || document.baseURI || './';
    try { state.baseUrl = new URL(state.baseUrl, window.location.href).href; } catch(_) { state.baseUrl = window.location.href; }
    restoreHistory();
    wireEvents();
    renderHistory();
    if (!state.history.length) handleFirstOpen();
    // Lazy load KB
    loadKB(state.baseUrl);
    state.initialized = true;
  }

  // Expose API
  window.Chatboot = { init };

  // Auto-init if the DOM already has expected elements (e.g., chatboot.html)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (el('chatToggle') && el('chatContainer')) init({ baseUrl: './' });
    });
  } else {
    if (el('chatToggle') && el('chatContainer')) init({ baseUrl: './' });
  }
  // Mejora conversacional y de análisis sintáctico (no intrusiva)
  (function enhanceChatboot(){
  try {
    state.cfg.acceptThreshold = 2.0;
    state.cfg.suggestThreshold = 1.3;
    state.cfg.w = { idf: 1.1, bigram: 1.3, direct: 2.2, synonym: 0.5, trigram: 1.0 };
  } catch(_){}

  try {
    function addSyn(k, arr){
      const cur = Array.isArray(SYN[k]) ? SYN[k] : [];
      const merged = Array.from(new Set(cur.concat(arr)));
      SYN[k] = merged;
    }

    // Negocio / compra
    addSyn('precio', ['costos','tarifas','valores','cotizaciones','presupuestos','cuanto','cuesta','vale','venta','comprar','adquirir','contratar','propuesta','proponer','oferta','promocion','promoción','licencia','licencias','suscripcion','suscripción','subscription','renovacion','renovación','financiacion','financiación','facturacion','facturación','pago','pagos','sla','acuerdo','servicio','planes','plan']);
    // Soporte / operación
    addSyn('soporte', ['reparaciones','incidente','incidencias','ticket','tickets','ticketing','helpdesk','service desk','mesa','mesaayuda','mesa de ayuda','24/7','24x7','prioridad','p1','p2','p3','remoto','remota','in situ','insitu','en sitio']);
    // Contacto / agenda
    addSyn('contacto', ['whats','wasap','wpp','wsp','telefono','llamar','llamada','correo','email','mail','agendar','agenda','reunion','reunión','demo','demostracion','demostración','videollamada','teams','zoom','google meet','meet','cita','ejecutivo','asesor comercial']);
    // Consultoría / advisory
    addSyn('consultoria', ['asesoramiento','recomendacion','recomendación','plan','roadmap','hoja de ruta','assessment','gap','madurez','benchmark','baselining','workshop','taller','descubrimiento','discovery']);
    // Seguridad
    addSyn('seguridad', ['vulnerabilidad','vulnerabilidades','pentest','siem','edr','soc','riesgo','riesgos','phishing','antivirus','ransomware','malware','spyware','dlp','mfa','2fa','zero trust','zerotrust','ztna','waf','ips','ids','endpoint','epp','hardening','cifrado','encriptacion','encriptación','firewalls']);
    // Infraestructura / redes / virtualización
    addSyn('infraestructura', ['server','servidor','routers','switches','backups','cloud','datacenter','cpd','cableado','storage','almacenamiento','virtualizacion','vmware','kubernetes','k8s','contenedores','containers','docker','hyperv','hyper-v','active directory','activedirectory','ad','dns','dhcp','vpn','vlan','wifi','wireless','sdwan','sd-wan','sase','ap','access point','switching','routing','enlaces','cisco','fortigate','mikrotik','pfsense','windows server','linux']);
    // Backup / continuidad
    addSyn('backup', ['respaldo','respaldos','copias','copiaseguridad','respalda','incremental','full','restauracion','restauración','recuperacion','recuperación','drp','bcp','disaster recovery','continuidad de negocio','retencion','retención']);
    // Nube / suites
    addSyn('nube', ['cloud','aws','azure','gcp','saas','paas','iaas','o365','office 365','office365','m365','microsoft 365','microsoft365','google workspace','googleworkspace','gsuite','g suite','g-suite','sharepoint','exchange online','onedrive','ec2','s3','backup 365','backups 365']);
  } catch(_){}

  const __VARMAP = new Map([
    ['whats','whatsapp'],
    ['wasap','whatsapp'],
    ['wpp','whatsapp'],
    ['wsp','whatsapp'],
    ['mail','correo'],
    ['email','correo'],
    ['e-mail','correo'],
    ['server','servidores'],
    ['servidor','servidores'],
    ['respaldo','backup'],
    ['respaldos','backup'],
    ['backups','backup'],
    ['cloud','nube'],
    ['k8s','kubernetes'],
    ['hyperv','hyper-v'],
    ['2fa','mfa'],
    ['sd-wan','sdwan'],
    ['zero-trust','zerotrust'],
    ['ad','activedirectory'],
    ['office365','m365'],
    ['o365','m365'],
    ['gsuite','googleworkspace'],
    ['g-suite','googleworkspace']
  ]);


    function __canon(w) { return __VARMAP.get(w) || w; }
    function __stem(w) {
      if (!w || w.length <= 3) return w;
      let s = w;
      s = s.replace(/(mente)$/,'');
      s = s.replace(/(aciones|icione?s)$/,'acion');
      s = s.replace(/(idades)$/,'idad');
      s = s.replace(/(icamente)$/,'ico');
      s = s.replace(/(adoras|adores|adora|ador)$/,'ador');
      s = s.replace(/(amientos|imiento|imientos|amiento)$/,'amiento');
      s = s.replace(/(izando|iendo|ando)$/,'');
      if (s.length > 4) s = s.replace(/(es)$/,'');
      if (s.length > 3) s = s.replace(/(s)$/,'');
      return s;
    }
    // Reasigna la función de tokenización con mejoras
    try {
      const __oldTokenize = tokenize;
      tokenize = function(text){
        const stop = new Set(['el','la','los','las','un','una','unos','unas','de','del','al','y','o','u','en','para','por','con','que','a','es','son','mi','su','tu','se','me','te','lo','le','les','nos','si','no','ya','muy','mas','más','como','cuando','donde','dónde','porque','porqué','que','qué','quien','quién','cual','cuál']);
        const raw = normalize(text);
        const tokens = raw.split(' ').map(__canon).map(__stem).filter(w => w && w.length >= 3 && !stop.has(w));
        return tokens.length ? tokens : __oldTokenize(text);
      };
    } catch(_){}

    // Respuestas cortas de cortesía
    function smallTalk(userText) {
      const q = normalize(userText || '');
      if (/gracias/.test(q)) return '¡Con gusto! ¿Te apoyo con algo más?';
      if (/(adios|bye|chao|hasta luego)/.test(q)) return '¡Hasta luego! Si necesitas algo, estoy aquí.';
      if (/(quien eres|quien sos|como te llamas|tu nombre)/.test(q)) return 'Soy axia, asistente virtual de VicaTechnology. ¿En qué te ayudo?';
      if (q.includes('hola') || q.includes('buenas') || q.includes('buenos dias') || q.includes('buenas tardes') || q.includes('buenas noches') || q.includes('hey')) return '¡Hola! Soy axia. ¿En qué puedo ayudarte?';
      if (/(mas|m[aá]s) info|detalles|cuentame|cuéntame|amplia|ampliar|explica|profundiza/.test(q) && state.lastKBIndex >= 0) return 'Claro. ¿Qué aspecto te interesa: alcance, tiempos o costos?';
      return '';
    }

    function topicFollowups(topic) {
      const t = (topic || '').toLowerCase();
      if (!t) return ['Más info','Precios','Hablar con asesor'];
      if (t.includes('seguridad') || t.includes('ciberseguridad') || t.includes('siem') || t.includes('edr') || t.includes('soc')) {
        return ['Auditoría de seguridad','Planes SOC','Precios','Hablar con asesor'];
      }
      if (t.includes('infraestructura') || t.includes('red') || t.includes('servidor') || t.includes('nube') || t.includes('backup')) {
        return ['Revisión de infraestructura','Backups/Nube','Precios','Hablar con asesor'];
      }
      if (t.includes('soporte') || t.includes('mantenimiento')) {
        return ['Reportar incidencia','Planes de mantenimiento','Precios','Hablar con asesor'];
      }
      if (t.includes('consultoria') || t.includes('auditoria')) {
        return ['Diagnóstico inicial','Tiempo y alcance','Precios','Hablar con asesor'];
      }
      return ['Más info','Precios','Hablar con asesor'];
    }

    // Mejora de extractTopic para más señales
    try {
      const __oldExtract = extractTopic;
      extractTopic = function(text){
        const base = __oldExtract(text);
        if (base) return base;
        const syn = expandSynonyms(tokenize(text));
        const has = (k) => (syn && typeof syn.has === 'function') ? syn.has(k) : (Array.isArray(syn) && syn.includes(k));
        if (has('seguridad') || has('siem') || has('edr') || has('soc') || has('waf') || has('mfa') || has('dlp')) return 'seguridad';
        if (has('infraestructura') || has('redes') || has('servidores') || has('vpn') || has('vlan') || has('wifi') || has('kubernetes') || has('docker') || has('virtualizacion')) return 'infraestructura';
        if (has('soporte') || has('mantenimiento') || has('helpdesk')) return 'soporte';
        if (has('consultoria') || has('auditoria') || has('asesoria')) return 'consultoria';
        if (has('backup')) return 'backup';
        if (has('nube')) return 'nube';
        return '';
      };
    } catch(_){}

    function nextQuestion(topic) {
      const t = (topic || '').toLowerCase();
      if (t.includes('seguridad') || t.includes('ciberseguridad') || t.includes('siem') || t.includes('edr') || t.includes('soc')) {
        return '¿Buscas auditoría, monitoreo (SOC) o implementación?';
      }
      if (t.includes('infraestructura') || t.includes('red') || t.includes('servidor')) {
        return '¿Te interesa servidores, redes o nube?';
      }
      if (t.includes('nube') || t.includes('backup')) {
        return '¿Prefieres soluciones en nube, on‑premise o híbridas?';
      }
      if (t.includes('soporte') || t.includes('mantenimiento')) {
        return '¿Es una incidencia puntual o buscas un plan de mantenimiento?';
      }
      if (t.includes('consultoria') || t.includes('auditoria')) {
        return '¿Prefieres un diagnóstico inicial o una propuesta con alcance y tiempos?';
      }
      return '¿Prefieres que te contacte un asesor o ver más detalles aquí?';
    }

    // Reasignar sendMessage para incluir smallTalk y follow-ups por tema
    try {
      sendMessage = function () {
        const input = el('userInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        input.value = '';
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          const st = smallTalk(text);
          const r = st || respond(text);
          const topic = extractTopic(text) || state.currentTopic;
          if (topic) state.currentTopic = topic;
          const question = nextQuestion(topic);
          const final = r ? (r.trim().replace(/[\s]+$/,'') + ' ' + question) : question;
          addMessage(final, 'bot');
          addQuickReplies(topicFollowups(topic));
        }, 500);
      };
    } catch(_){}
    // Intent: list services and follow-ups
    function __serviceCatalogIntent(userText) {
      try {
        const q = normalize(userText || '');
        if (!q) return null;
        const has = (s) => q.includes(s);
        const looksLikeAsk = has('que') || has('cual') || has('lista') || has('portafolio') || has('catalogo') || has('catologo');
        const mentionsService = has('servicio') || has('servicios');
        const mentionsOffer = has('ofrecen') || has('manejan') || has('tienen') || has('oferta');
        if (!(mentionsService && (looksLikeAsk || mentionsOffer))) return null;
        const chips = ['Ciberseguridad','Infraestructura','Nube y backup','Soporte','Consultoria','Hablar con asesor'];
        const replyHtml = [
          '<div class="svc">',
          '  <div><strong>Servicios principales</strong></div>',
          '  <ul style="margin:6px 0 0 14px;">',
          '    <li><strong>Ciberseguridad</strong>: auditorias, SOC/monitoreo, EDR, pentesting.</li>',
          '    <li><strong>Infraestructura de TI</strong>: redes, servidores, virtualizacion, storage.</li>',
          '    <li><strong>Nube y backup</strong>: Microsoft 365/Google Workspace, AWS/Azure, DRP/BCP.</li>',
          '    <li><strong>Soporte y mantenimiento</strong>: mesa de ayuda, 24/7, planes.</li>',
          '    <li><strong>Consultoria tecnologica</strong>: diagnosticos, roadmap, transformacion digital.</li>',
          '  </ul>',
          '  <div style="margin-top:6px;">Sobre cual te gustaria saber mas?</div>',
          '</div>'
        ].join('');
        return { replyHtml, chips };
      } catch(_) { return null; }
    }

    // Final override of sendMessage to include services catalog intent
    try {
      sendMessage = function () {
        const input = el('userInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        input.value = '';
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          const st = smallTalk(text);
          const svc = __serviceCatalogIntent(text);
          if (svc) {
            if (svc.replyHtml) {
              addMessage(svc.replyHtml, 'bot', { html: true });
            } else if (svc.reply) {
              addMessage(svc.reply, 'bot');
            }
            addQuickReplies(svc.chips);
            return;
          }
          const r = st || respond(text);
          const topic = extractTopic(text) || state.currentTopic;
          if (topic) state.currentTopic = topic;
          const question = nextQuestion(topic);
          const final = r ? (String(r).trim().replace(/[\s]+$/,'') + ' ' + question) : question;
          addMessage(final, 'bot');
          addQuickReplies(topicFollowups(topic));
        }, 500);
      };
    } catch(_){}
    // Forzar nueva vinculación de eventos para usar el flujo mejorado
    function __enhancedSendFlow() {
      const input = el('userInput');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      addMessage(text, 'user');
      input.value = '';
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        try {
          const q = normalize(text || '');
          const has = (s) => q.includes(s);
          const looksLikeAsk = has('que') || has('cual') || has('lista') || has('portafolio') || has('catalogo') || has('catologo');
          const mentionsService = has('servicio') || has('servicios');
          const mentionsOffer = has('ofrecen') || has('manejan') || has('tienen') || has('oferta');
          if (mentionsService && (looksLikeAsk || mentionsOffer)) {
            const chips = ['Ciberseguridad','Infraestructura','Nube y backup','Soporte','Consultoria','Hablar con asesor'];
            const replyHtml = [
              '<div class="svc">',
              '  <div><strong>Servicios principales</strong></div>',
              '  <ul style="margin:6px 0 0 14px;">',
              '    <li><strong>Ciberseguridad</strong>: auditorias, SOC/monitoreo, EDR, pentesting.</li>',
              '    <li><strong>Infraestructura de TI</strong>: redes, servidores, virtualizacion, storage.</li>',
              '    <li><strong>Nube y backup</strong>: Microsoft 365/Google Workspace, AWS/Azure, DRP/BCP.</li>',
              '    <li><strong>Soporte y mantenimiento</strong>: mesa de ayuda, 24/7, planes.</li>',
              '    <li><strong>Consultoria tecnologica</strong>: diagnosticos, roadmap, transformacion digital.</li>',
              '  </ul>',
              '  <div style="margin-top:6px;">Sobre cual te gustaria saber mas?</div>',
              '</div>'
            ].join('');
            addMessage(replyHtml, 'bot', { html: true });
            addQuickReplies(chips);
            return;
          }
        } catch(_) {}
        const st = smallTalk(text);
        const r = st || respond(text);
        const topic = extractTopic(text) || state.currentTopic;
        if (topic) state.currentTopic = topic;
        const question = nextQuestion(topic);
        const final = r ? (String(r).trim().replace(/[\s]+$/,'') + ' ' + question) : question;
        addMessage(final, 'bot');
        addQuickReplies(topicFollowups(topic));
      }, 500);
    }

    function __rewireEvents() {
      try {
        const btn = document.querySelector('.chat-input button');
        if (btn && btn.parentNode) {
          const clone = btn.cloneNode(true);
          btn.parentNode.replaceChild(clone, btn);
          clone.addEventListener('click', __enhancedSendFlow);
        }
        const input = el('userInput');
        if (input && input.parentNode) {
          const i2 = input.cloneNode(true);
          input.parentNode.replaceChild(i2, input);
          i2.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              __enhancedSendFlow();
            }
          });
        }
      } catch(_) {}
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(__rewireEvents, 0));
    } else {
      setTimeout(__rewireEvents, 0);
    }
  })();
})();

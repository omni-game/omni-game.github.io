'use strict';
// OMNI room codes: the host gets a short code (e.g. K7QM2), the friend types it and joins.
// Uses the free public PeerJS server only to introduce the two devices; gameplay then flows
// directly between them over WebRTC, exactly like the copy-paste crossplay (rtc.js).
// Emits the same events as the other transports through window.omniLanEvent.
window.OmniRoom = (() => {
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
    PREFIX = 'omni-forest-',
    ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }, { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }]; // TURN relay: phones on mobile data often can't connect directly
  let lastUnavailable = false, peer = null, conn = null, role = null, code = '', stopped = true, timer = 0, extras = []; // extras: players 3 and 4 (host only)
  const emit = (kind, data) => { try { if (window.omniLanEvent) window.omniLanEvent(kind, data || ''); } catch (e) { console.warn(e); } };
  const newCode = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  const clean = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^OMNI/, '');
  function opts() {
    const o = { debug: 0, config: { iceServers: ICE } };
    // QA / self-hosting: ?peerhost=host:port uses your own PeerJS server instead of the public one
    const m = /[?&]peerhost=([^&]+)/.exec(location.search || '');
    if (m) {
      const [h, p] = decodeURIComponent(m[1]).split(':');
      Object.assign(o, { host: h, port: +(p || 9000), path: '/', secure: location.protocol === 'https:' });
    }
    return o;
  }
  function wire(c) {
    conn = c;
    c._pid = 'P';
    c.on('open', () => { clearTimeout(timer); emit(role === 'host' ? 'peer' : 'connected', ''); });
    listen(c);
  }
  // one listener per link; whether it is the main partner or player 3/4 is decided when each message arrives
  function listen(c) {
    c.on('data', (d) => {
      const text = typeof d === 'string' ? d : JSON.stringify(d);
      if (conn === c) emit('data', text);
      else if (extras.includes(c)) emit('xdata', JSON.stringify({ pid: c._pid, d: text }));
    });
    const lost = () => {
      if (extras.includes(c)) { extras = extras.filter((x) => x !== c); if (!stopped) emit('xleave', c._pid); return; }
      if (conn !== c) return;
      conn = null;
      if (stopped) return;
      emit('disconnected', '');
      promote();
    };
    c.on('close', lost);
    c.on('error', lost);
  }
  function promote() { // player 3 takes the partner's empty seat so the room keeps going
    const next = extras.shift();
    if (next) { const old = next._pid; conn = next; next._pid = 'P'; emit('xpromote', old); emit('peer', ''); }
  }
  function wireExtra(c) {
    const used = extras.map((x) => x._pid);
    c._pid = ['X1', 'X2'].find((p) => !used.includes(p));
    extras.push(c);
    c.on('open', () => emit('xjoin', c._pid));
    listen(c);
  }
  function stop() {
    stopped = true;
    clearTimeout(timer);
    try { if (conn) conn.close(); } catch (e) {}
    for (const x of extras) try { x.close(); } catch (e) {}
    extras = [];
    try { if (peer) peer.destroy(); } catch (e) {}
    conn = peer = null;
  }
  function fail(msg) {
    stop();
    emit('error', msg);
  }
  const ERR = {
    'peer-unavailable': 'No hay ninguna sala con ese código',
    network: 'Sin conexión con el servidor de salas · revisa Internet',
    'server-error': 'El servidor de salas no responde · prueba la invitación por código largo',
    'browser-incompatible': 'Este dispositivo no admite crossplay',
    'socket-error': 'Sin conexión con el servidor de salas · revisa Internet',
  };
  // host: coming back to the game after switching apps reconnects to the room server straight away
  document.addEventListener('visibilitychange', () => { try { if (!document.hidden && peer && !peer.destroyed && peer.disconnected && !stopped) peer.reconnect(); } catch (e) {} });
  return {
    get supported() { return typeof window.Peer === 'function' && typeof RTCPeerConnection !== 'undefined'; },
    get code() { return code; },
    // onCode(code) is called when the room exists on the server
    host(onCode, tries = 0) {
      stop();
      stopped = false;
      role = 'host';
      code = newCode();
      peer = new window.Peer(PREFIX + code.toLowerCase(), opts());
      peer.on('open', () => onCode && onCode(code));
      peer.on('connection', (c) => {
        if (!(conn && conn.open)) return wire(c);
        if (extras.length < 2) return wireExtra(c); // up to 4 players
        try { c.close(); } catch (e) {} // room is full
      });
      peer.on('disconnected', () => { try { if (!stopped && peer && !peer.destroyed) peer.reconnect(); } catch (e) {} });
      peer.on('error', (e) => {
        if (e.type === 'unavailable-id' && tries < 4) return this.host(onCode, tries + 1); // code taken: pick another
        if (conn && conn.open) return; // signalling hiccup after we're connected: ignore
        fail(ERR[e.type] || 'No se pudo crear la sala');
      });
    },
    join(c) {
      stop();
      stopped = false;
      role = 'guest';
      code = clean(c);
      if (code.length < 4) return fail('Escribe el código de la sala');
      peer = new window.Peer(opts());
      let tries = 0;
      const attempt = () => { // re-knock every 7 s: the host's phone may have been in another app (WhatsApp…) for a moment
        if (stopped || (conn && conn.open) || !peer || peer.destroyed) return;
        try { if (conn) conn.close(); } catch (e) {}
        wire(peer.connect(PREFIX + code.toLowerCase(), { reliable: true, serialization: 'raw' }));
        if (++tries < 5) setTimeout(attempt, 7000);
      };
      peer.on('open', attempt);
      peer.on('error', (e) => {
        if (conn && conn.open) return;
        lastUnavailable = e.type === 'peer-unavailable';
        if (e.type === 'peer-unavailable' && tries < 5) return; // the next knock may find it
        fail(ERR[e.type] || 'No se pudo unir a la sala');
      });
      timer = setTimeout(() => { if (!(conn && conn.open)) fail(tries && lastUnavailable ? ERR['peer-unavailable'] : 'La sala no responde · el anfitrión debe tener el juego abierto en pantalla. Comprueba el código y prueba otra vez'); }, 36000);
    },
    send(text) { if (conn && conn.open) conn.send(text); for (const x of extras) if (x.open) x.send(text); },
    sendTo(pid, text) { const c = pid === 'P' ? conn : extras.find((x) => x._pid === pid); if (c && c.open) c.send(text); },
    get players() { return 1 + (conn && conn.open ? 1 : 0) + extras.filter((x) => x.open).length; },
    drop() { const c = conn; conn = null; try { if (c) c.close(); } catch (e) {} setTimeout(promote, 0); }, // host: free the slot, keep the room
    stop,
    address() { return ''; },
  };
})();

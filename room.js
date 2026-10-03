'use strict';
// OMNI room codes: the host gets a short code (e.g. K7QM2), the friend types it and joins.
// Uses the free public PeerJS server only to introduce the two devices; gameplay then flows
// directly between them over WebRTC, exactly like the copy-paste crossplay (rtc.js).
// Emits the same events as the other transports through window.omniLanEvent.
window.OmniRoom = (() => {
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
    PREFIX = 'omni-forest-',
    ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  let peer = null, conn = null, role = null, code = '', stopped = true, timer = 0;
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
    c.on('open', () => { clearTimeout(timer); emit(role === 'host' ? 'peer' : 'connected', ''); });
    c.on('data', (d) => emit('data', typeof d === 'string' ? d : JSON.stringify(d)));
    const lost = () => {
      if (conn !== c) return;
      conn = null;
      if (!stopped) emit('disconnected', '');
    };
    c.on('close', lost);
    c.on('error', lost);
  }
  function stop() {
    stopped = true;
    clearTimeout(timer);
    try { if (conn) conn.close(); } catch (e) {}
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
        if (conn && conn.open) { try { c.close(); } catch (e) {} return; } // room is full
        wire(c);
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
      peer.on('open', () => wire(peer.connect(PREFIX + code.toLowerCase(), { reliable: true, serialization: 'raw' })));
      peer.on('error', (e) => { if (!(conn && conn.open)) fail(ERR[e.type] || 'No se pudo unir a la sala'); });
      timer = setTimeout(() => { if (!(conn && conn.open)) fail('La sala no responde · comprueba el código'); }, 20000);
    },
    send(text) { if (conn && conn.open) conn.send(text); },
    drop() { const c = conn; conn = null; try { if (c) c.close(); } catch (e) {} }, // host: free the slot, keep the room
    stop,
    address() { return ''; },
  };
})();

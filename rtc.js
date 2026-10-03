'use strict';
// OMNI crossplay transport: WebRTC data channel with copy-paste invite/answer codes (no server needed).
// Works between any two devices that run the game: Android APK <-> PC browser <-> iPhone Safari, etc.
// It emits the same events as the native Wi-Fi bridge through window.omniLanEvent.
window.OmniRTC = (() => {
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  let pc = null, dc = null, role = null, stopped = true, notified = false;
  const emit = (kind, data) => { try { if (window.omniLanEvent) window.omniLanEvent(kind, data || ''); } catch (e) { console.warn(e); } };
  const b64u = (u8) => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = (t) => { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; const s = atob(t), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function pack(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) {
      try {
        const cs = new CompressionStream('deflate-raw'), w = cs.writable.getWriter();
        w.write(raw); w.close();
        return 'OMNI2z.' + b64u(new Uint8Array(await new Response(cs.readable).arrayBuffer()));
      } catch (e) {}
    }
    return 'OMNI2.' + b64u(raw);
  }
  async function unpack(code) {
    code = String(code || '').replace(/\s+/g, '');
    let raw;
    if (code.startsWith('OMNI2z.')) {
      if (!window.DecompressionStream) throw new Error('Este dispositivo no puede leer este código. Actualiza el navegador o WebView.');
      const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter();
      w.write(unb64u(code.slice(7))); w.close();
      raw = new Uint8Array(await new Response(ds.readable).arrayBuffer());
    } else if (code.startsWith('OMNI2.')) raw = unb64u(code.slice(6));
    else throw new Error('Código no válido');
    const o = JSON.parse(new TextDecoder().decode(raw));
    if (!o || !o.s || (o.t !== 'o' && o.t !== 'a')) throw new Error('Código no válido');
    return o;
  }
  const iceDone = () => new Promise((res) => {
    if (!pc || pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, 6000);
    pc.addEventListener('icegatheringstatechange', () => { if (pc && pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
  function lost() { if (stopped || notified) return; notified = true; emit('disconnected', ''); }
  function wire(ch) {
    dc = ch;
    ch.onopen = () => { notified = false; emit(role === 'host' ? 'peer' : 'connected', ''); };
    ch.onmessage = (e) => emit('data', typeof e.data === 'string' ? e.data : '');
    ch.onclose = lost;
    ch.onerror = lost;
  }
  function make() {
    stop();
    stopped = false; notified = false;
    pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onconnectionstatechange = () => { if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) lost(); };
    return pc;
  }
  function stop() {
    stopped = true;
    try { if (dc) { dc.onclose = dc.onerror = dc.onmessage = dc.onopen = null; dc.close(); } } catch (e) {}
    try { if (pc) { pc.onconnectionstatechange = null; pc.close(); } } catch (e) {}
    dc = pc = null;
  }
  return {
    supported: typeof RTCPeerConnection !== 'undefined',
    async createInvite() {
      role = 'host'; make();
      wire(pc.createDataChannel('omni', { ordered: true }));
      await pc.setLocalDescription(await pc.createOffer());
      await iceDone();
      return pack({ t: 'o', s: pc.localDescription.sdp });
    },
    async acceptAnswer(code) {
      const o = await unpack(code);
      if (o.t !== 'a') throw new Error('Esto es una invitación, pega la respuesta del invitado');
      if (!pc) throw new Error('Crea primero una invitación');
      await pc.setRemoteDescription({ type: 'answer', sdp: o.s });
    },
    async joinWithInvite(code) {
      const o = await unpack(code);
      if (o.t !== 'o') throw new Error('Esto es una respuesta, pega la invitación del anfitrión');
      role = 'guest'; make();
      pc.ondatachannel = (e) => wire(e.channel);
      await pc.setRemoteDescription({ type: 'offer', sdp: o.s });
      await pc.setLocalDescription(await pc.createAnswer());
      await iceDone();
      return pack({ t: 'a', s: pc.localDescription.sdp });
    },
    send(text) { if (dc && dc.readyState === 'open') dc.send(text); },
    stop,
    address() { return ''; },
    _debug: { pack, unpack },
  };
})();

'use strict';
// Hand-drawn anime face parts (eyes, brows, mouths) painted on canvases and used as decals on the head.
(function () {
  const T = THREE;
  const cache = {};
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  function shade(n, k) {
    const r = Math.min(255, ((n >> 16) & 255) * k), g = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k);
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  function tex(key, w, h, draw) {
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.lineCap = g.lineJoin = 'round';
    draw(g, w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    return (cache[key] = t);
  }
  const INK = '#15101c';

  // Eye drawn for the viewer's right side: inner corner (nose side) on the left, outer corner on the right.
  function eye(kind, color) {
    return tex(`eye:${kind}:${color}`, 256, 192, (g) => {
      if (kind === 'closed' || kind === 'squeeze') {
        g.strokeStyle = INK;
        g.lineWidth = 13;
        g.beginPath();
        if (kind === 'closed') {
          g.moveTo(40, 100);
          g.quadraticCurveTo(135, 140, 232, 92);
        } else {
          g.moveTo(205, 62);
          g.lineTo(70, 104);
          g.lineTo(205, 146);
        }
        g.stroke();
        return;
      }
      const angry = kind === 'angry';
      const sclera = () => {
        g.beginPath();
        if (angry) {
          g.moveTo(32, 118);
          g.lineTo(232, 66);
        } else {
          g.moveTo(30, 104);
          g.quadraticCurveTo(110, 22, 232, 70);
        }
        g.quadraticCurveTo(208, 166, 122, 162);
        g.quadraticCurveTo(52, 156, angry ? 32 : 30, angry ? 118 : 104);
        g.closePath();
      };
      sclera();
      g.fillStyle = '#fbfbff';
      g.fill();
      g.save();
      sclera();
      g.clip();
      // iris with a darker top and a light lower crescent
      const gr = g.createLinearGradient(0, 40, 0, 170);
      gr.addColorStop(0, shade(color, 0.35));
      gr.addColorStop(0.55, hex(color));
      gr.addColorStop(1, shade(color, 1.7));
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(128, 108, 50, 64, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = shade(color, 0.3);
      g.stroke();
      g.fillStyle = '#0d0b12';
      g.beginPath();
      g.ellipse(128, 112, 20, 30, 0, 0, Math.PI * 2);
      g.fill();
      // eyelid shadow on the white
      const sh = g.createLinearGradient(0, 30, 0, 90);
      sh.addColorStop(0, 'rgba(60,50,90,0.45)');
      sh.addColorStop(1, 'rgba(60,50,90,0)');
      g.fillStyle = sh;
      g.fillRect(0, 0, 256, 100);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(106, 82, 17, 13, -0.4, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(150, 132, 7, 6, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      // lashes: heavy upper line with a flick at the outer corner, thin lower line
      g.strokeStyle = INK;
      g.lineWidth = 13;
      g.beginPath();
      if (angry) {
        g.moveTo(28, 120);
        g.lineTo(236, 64);
      } else {
        g.moveTo(26, 106);
        g.quadraticCurveTo(110, 18, 236, 70);
      }
      g.lineTo(250, 52);
      g.stroke();
      g.lineWidth = 4;
      g.strokeStyle = '#3b2a35';
      g.beginPath();
      g.moveTo(118, 163);
      g.quadraticCurveTo(200, 162, 222, 112);
      g.stroke();
    });
  }
  function brow() {
    return tex('brow', 256, 64, (g) => {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(10, 40);
      g.quadraticCurveTo(120, 4, 246, 22);
      g.lineTo(244, 30);
      g.quadraticCurveTo(120, 24, 14, 60);
      g.closePath();
      g.fill();
    });
  }
  function mouth(kind) {
    return tex(`mouth:${kind}`, 128, 96, (g) => {
      g.strokeStyle = '#4a2026';
      g.lineWidth = 5;
      if (kind === 'neutral' || kind === 'smile') {
        g.beginPath();
        g.moveTo(46, kind === 'smile' ? 46 : 50);
        g.quadraticCurveTo(64, kind === 'smile' ? 62 : 54, 82, kind === 'smile' ? 46 : 50);
        g.stroke();
      } else if (kind === 'pain') {
        g.beginPath();
        g.moveTo(36, 52);
        for (let i = 0; i <= 6; i++) g.lineTo(36 + i * 9, 52 + (i % 2 ? -6 : 6));
        g.stroke();
      } else if (kind === 'grit') {
        g.fillStyle = '#fbf8f2';
        g.strokeStyle = INK;
        g.lineWidth = 4;
        g.beginPath();
        g.roundRect ? g.roundRect(30, 36, 68, 26, 8) : g.rect(30, 36, 68, 26);
        g.fill();
        g.stroke();
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(32, 49);
        g.lineTo(96, 49);
        for (const x of [46, 64, 82]) {
          g.moveTo(x, 37);
          g.lineTo(x, 61);
        }
        g.stroke();
      } else if (kind === 'shout') {
        g.fillStyle = '#4a0f16';
        g.strokeStyle = INK;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(26, 30);
        g.quadraticCurveTo(64, 22, 102, 30);
        g.quadraticCurveTo(96, 90, 64, 90);
        g.quadraticCurveTo(32, 90, 26, 30);
        g.closePath();
        g.fill();
        g.save();
        g.clip();
        g.fillStyle = '#e0707c';
        g.beginPath();
        g.ellipse(64, 88, 26, 14, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fbf8f2';
        g.fillRect(20, 22, 90, 13);
        g.restore();
        g.stroke();
      }
    });
  }
  ZB.face = { eye, brow, mouth };
})();

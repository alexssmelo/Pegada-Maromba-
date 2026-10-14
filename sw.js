const CACHE = 'treinoacad-v3';
const SHELL = ['./', 'index.html', 'painel.html', 'privacidade.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'img/ficha/qui-afundo.jpg', 'img/ficha/qui-agachamento.jpg', 'img/ficha/qui-bicicleta.jpg', 'img/ficha/qui-elevacao.jpg', 'img/ficha/qui-flexao.jpg', 'img/ficha/qui-lateral.jpg', 'img/ficha/qui-ponte.jpg', 'img/ficha/qui-prancha-ombros.jpg', 'img/ficha/qui-reverso.jpg', 'img/ficha/sab-caminhada.jpg', 'img/ficha/seg-afundo.jpg', 'img/ficha/seg-agachamento.jpg', 'img/ficha/seg-flexao.jpg', 'img/ficha/seg-ponte.jpg', 'img/ficha/seg-prancha.jpg', 'img/ficha/seg-superman.jpg', 'img/ficha/sex-agachamento.jpg', 'img/ficha/sex-burpee.jpg', 'img/ficha/sex-corrida.jpg', 'img/ficha/sex-mountain.jpg', 'img/ficha/sex-polichinelo.jpg', 'img/ficha/ter-bicicleta.jpg', 'img/ficha/ter-corrida.jpg', 'img/ficha/ter-elevacao.jpg', 'img/ficha/ter-mountain.jpg', 'img/ficha/ter-polichinelo.jpg', 'img/ficha/ter-prancha.jpg', 'cloud.js', 'firebase-config.js', 'fonts/barlow-latin-400-normal.woff2', 'fonts/barlow-latin-500-normal.woff2', 'fonts/barlow-latin-600-normal.woff2', 'fonts/big-shoulders-display-latin-700-normal.woff2', 'fonts/big-shoulders-display-latin-800-normal.woff2', 'fonts/big-shoulders-display-latin-900-normal.woff2', 'img/gym/a1-0.jpg', 'img/gym/a1-1.jpg', 'img/gym/a2-0.jpg', 'img/gym/a2-1.jpg', 'img/gym/a3-0.jpg', 'img/gym/a3-1.jpg', 'img/gym/a4-0.jpg', 'img/gym/a4-1.jpg', 'img/gym/a5-0.jpg', 'img/gym/a5-1.jpg', 'img/gym/a6-0.jpg', 'img/gym/a6-1.jpg', 'img/gym/b1-0.jpg', 'img/gym/b1-1.jpg', 'img/gym/b2-0.jpg', 'img/gym/b2-1.jpg', 'img/gym/b3-0.jpg', 'img/gym/b3-1.jpg', 'img/gym/b4-0.jpg', 'img/gym/b4-1.jpg', 'img/gym/b5-0.jpg', 'img/gym/b5-1.jpg', 'img/gym/b6-0.jpg', 'img/gym/b6-1.jpg', 'img/gym/b7-0.jpg', 'img/gym/b7-1.jpg', 'img/gym/c1-0.jpg', 'img/gym/c1-1.jpg', 'img/gym/c2-0.jpg', 'img/gym/c2-1.jpg', 'img/gym/c3-0.jpg', 'img/gym/c3-1.jpg', 'img/gym/c4-0.jpg', 'img/gym/c4-1.jpg', 'img/gym/c5-0.jpg', 'img/gym/c5-1.jpg', 'img/gym/c6-0.jpg', 'img/gym/c6-1.jpg', 'img/gym/c7-0.jpg', 'img/gym/c7-1.jpg', 'img/gym/d1-0.jpg', 'img/gym/d1-1.jpg', 'img/gym/d2-0.jpg', 'img/gym/d2-1.jpg', 'img/gym/d3-0.jpg', 'img/gym/d3-1.jpg', 'img/gym/d4-0.jpg', 'img/gym/d4-1.jpg', 'img/gym/d5-0.jpg', 'img/gym/d5-1.jpg', 'img/gym/d6-0.jpg', 'img/gym/d6-1.jpg', 'img/gym/d7-0.jpg', 'img/gym/d7-1.jpg',
  'img/afundo-0.jpg', 'img/afundo-1.jpg', 'img/agachamento-0.jpg', 'img/agachamento-1.jpg', 'img/bicicleta-0.jpg', 'img/bicicleta-1.jpg', 'img/elevacao-0.jpg', 'img/elevacao-1.jpg', 'img/flexao-0.jpg', 'img/flexao-1.jpg', 'img/lateral-0.jpg', 'img/lateral-1.jpg', 'img/mountain-0.jpg', 'img/mountain-1.jpg', 'img/ponte-0.jpg', 'img/ponte-1.jpg', 'img/prancha-0.jpg', 'img/prancha-1.jpg', 'img/reverso-0.jpg', 'img/reverso-1.jpg', 'img/superman-0.jpg', 'img/superman-1.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // bibliotecas do Firebase: guarda uma cópia para o app abrir offline
  if (req.method === 'GET' && url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // rede primeiro (pega atualizações), cache como reserva offline
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});

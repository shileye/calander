const CACHE_NAME = 'acm-pro-v5'; // 核心：版本号升级到 v3，强制更新！
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icon.png',
  './manifest.json'
];

// 1. Install：缓存静态资源，保证脱机运行
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  // 强制让新的 SW 直接进入 activate 阶段
  self.skipWaiting(); 
});

// 2. Activate：清理旧缓存 (把 v2 的垃圾清掉)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  // 让 activate 的 SW 接管当前页面
  self.clients.claim();
});

// 3. Fetch：拦截网络请求
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('api.jsonbin.io') || e.request.url.includes('kontests.net')) {
    // 接口数据，不用 Service Worker 的缓存
    return;
  }
  
  // 对于本站的 HTML/CSS/JS/PNG，采用缓存优先
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
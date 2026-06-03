// service-worker.js
// 简单的服务工作脚本，用于实现基本的离线功能（缓存应用外壳与本地图标资源）

const CACHE_NAME = 'vehicle-monitor-v2';
// 仅缓存确实存在的静态资源，避免 addAll 因 404 整体失败导致安装中断
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/images/entry.png',
  '/images/checkpoint.png',
  '/images/car1.png',
  '/images/car2.png',
];

// 安装阶段 - 预缓存应用外壳；逐个缓存，单个失败不影响其余
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        urlsToCache.map((url) =>
          cache.add(url).catch((err) => console.warn('预缓存失败:', url, err))
        )
      )
    )
  );
});

// 拦截请求：
// - 对模拟服务端 API（127.0.0.1:12345）始终走网络，避免缓存实时数据
// - 其余静态资源走 cache-first，命中即返回，未命中再请求网络并写入缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.url.includes('127.0.0.1:12345')) {
    return; // 交给浏览器默认网络处理
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

// 更新缓存 - 清理旧版本缓存并立即接管页面
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

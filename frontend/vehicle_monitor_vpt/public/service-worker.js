// service-worker.js
// 简单的服务工作脚本，用于实现基本的离线功能

const CACHE_NAME = 'vehicle-monitor-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/assets/logo.png', // 如果有logo的话
];

// 安装阶段 - 缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 拦截网络请求 - 优先使用缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果找到缓存则返回，否则发起网络请求
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// 更新缓存
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
// 缓存版本号，更新时修改这个值
const CACHE_NAME = 'my-plan-cache-v2';

// 需要缓存的核心文件
const CORE_ASSETS = [
  './my-plan-single.html',
  './manifest.json'
];

// 安装事件 - 缓存核心文件
self.addEventListener('install', (event) => {
  console.log('Service Worker 正在安装...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('缓存核心资源');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        // 立即激活新的Service Worker
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker 正在激活...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 控制所有已打开的页面
      return self.clients.claim();
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  // 只处理GET请求
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果有缓存，先返回缓存
        if (cachedResponse) {
          console.log('从缓存返回:', event.request.url);
          
          // 同时在后台更新缓存
          fetch(event.request)
            .then((networkResponse) => {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, networkResponse.clone());
                });
            })
            .catch(() => {
              // 网络请求失败，不处理
            });
          
          return cachedResponse;
        }

        // 没有缓存，尝试网络请求
        return fetch(event.request)
          .then((networkResponse) => {
            console.log('从网络返回:', event.request.url);
            
            // 将新资源添加到缓存
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.log('网络请求失败，离线模式:', error);
            // 返回一个简单的离线提示页面
            return new Response(
              `
              <!DOCTYPE html>
              <html lang="zh-CN">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>离线模式</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #0f172a;
                    color: #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                    text-align: center;
                  }
                  .offline-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                  }
                  h1 {
                    font-size: 1.5rem;
                    margin-bottom: 16px;
                  }
                  p {
                    color: #94a3b8;
                    margin-bottom: 24px;
                  }
                  button {
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: opacity 0.2s;
                  }
                  button:hover {
                    opacity: 0.9;
                  }
                </style>
              </head>
              <body>
                <div class="offline-icon">🔌</div>
                <h1>网络连接已断开</h1>
                <p>您当前处于离线状态，请检查网络连接后重试。</p>
                <button onclick="window.location.reload()">重新加载</button>
              </body>
              </html>
              `,
              {
                headers: { 'Content-Type': 'text/html' }
              }
            );
          });
      })
  );
});

// 监听消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
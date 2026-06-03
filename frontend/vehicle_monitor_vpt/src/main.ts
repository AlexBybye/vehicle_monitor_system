import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/global.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// 注册 Service Worker 实现静态资源离线缓存（仅生产构建启用，避免干扰 Vite HMR）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}service-worker.js`)
      .catch((err) => console.warn('Service Worker 注册失败:', err))
  })
}
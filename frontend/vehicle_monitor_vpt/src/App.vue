<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div id="app">
    <nav class="navbar glass-effect">
      <div class="nav-brand">
        <h1 class="brand-title">🚗 车流监控系统</h1>
      </div>
      <div class="nav-links">
        <RouterLink 
          to="/map" 
          class="nav-link gradient-bg"
          :class="$route.path === '/map' ? 'active' : ''"
        >
          📍 实时地图
        </RouterLink>
        <RouterLink 
          to="/history" 
          class="nav-link gradient-bg"
          :class="$route.path === '/history' ? 'active' : ''"
        >
          📋 历史查询
        </RouterLink>
        <RouterLink 
          to="/statistics" 
          class="nav-link gradient-bg"
          :class="$route.path === '/statistics' ? 'active' : ''"
        >
          📊 统计分析
        </RouterLink>
        <RouterLink 
          to="/congestion" 
          class="nav-link gradient-bg"
          :class="$route.path === '/congestion' ? 'active' : ''"
        >
          🚧 拥挤分析
        </RouterLink>
      </div>
    </nav>
    
    <main class="main-content">
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: white;
  box-shadow: var(--shadow-xl);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(45deg, #ffffff, #e0e7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-full);
  transition: var(--transition-normal);
  position: relative;
  overflow: hidden;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: 0.5s;
}

.nav-link:hover::before {
  left: 100%;
}

.nav-link:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.nav-link.active {
  background: white;
  color: var(--primary-color);
  box-shadow: var(--shadow-lg);
}

.nav-link:not(.active):hover {
  background: rgba(255, 255, 255, 0.2);
}

.main-content {
  flex: 1;
  padding: 1rem;
  background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
  min-height: calc(100vh - 80px);
}

/* 页面过渡动画 */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
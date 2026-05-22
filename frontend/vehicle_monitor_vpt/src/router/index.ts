import { createRouter, createWebHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'
import HistoryView from '@/views/HistoryView.vue'
import StatisticsView from '@/views/StatisticsView.vue'
import CongestionView from '@/views/CongestionView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      redirect: '/map'
    },
    {
      path: '/map',
      name: 'MapView',
      component: MapView
    },
    {
      path: '/history',
      name: 'HistoryView',
      component: HistoryView
    },
    {
      path: '/statistics',
      name: 'StatisticsView',
      component: StatisticsView
    },
    {
      path: '/congestion',
      name: 'CongestionView',
      component: CongestionView
    }
  ],
})

export default router
import { createRouter, createWebHashHistory } from 'vue-router'
import StatsView from '../views/StatsView.vue'
import KanaView from '../views/KanaView.vue'
import VocabView from '../views/VocabView.vue'
import ReviewView from '../views/ReviewView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: StatsView },
    { path: '/hiragana', component: KanaView },
    { path: '/vocab', component: VocabView },
    { path: '/review', component: ReviewView },
  ],
})

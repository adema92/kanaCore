import { createRouter, createWebHashHistory } from 'vue-router'
import StatsView from '../views/StatsView.vue'
import KanaView from '../views/KanaView.vue'
import KatakanaView from '../views/KatakanaView.vue'
import VocabView from '../views/VocabView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: StatsView },
    { path: '/hiragana', component: KanaView },
    { path: '/katakana', component: KatakanaView },
    { path: '/vocab', component: VocabView },
  ],
})

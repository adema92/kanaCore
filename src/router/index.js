import { createRouter, createWebHashHistory } from 'vue-router'
import { useAppStore } from '../stores/appStore'
import StatsView from '../views/StatsView.vue'
import KanaView from '../views/KanaView.vue'
import HiraganaReadingTextsView from '../views/HiraganaReadingTextsView.vue'
import KatakanaView from '../views/KatakanaView.vue'
import VocabView from '../views/VocabView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: StatsView },
    { path: '/andrea', component: StatsView },
    { path: '/erica', component: StatsView },
    { path: '/hiragana', component: KanaView },
    { path: '/hiragana/testi', component: HiraganaReadingTextsView },
    { path: '/hiragana/testi/:id', component: HiraganaReadingTextsView },
    { path: '/katakana', component: KatakanaView },
    { path: '/vocab', component: VocabView },
  ],
})

router.beforeEach((to, from, next) => {
  const store = useAppStore()
  if (to.path === '/andrea' || to.path === '/erica') {
    const profile = to.path.slice(1)
    if (store.currentProfile !== profile) {
      store.setProfileFromRoute(profile)
    }
  }
  next()
})

export default router

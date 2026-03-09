import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const firebaseConfig = {
    apiKey:            env.VITE_FIREBASE_API_KEY            || 'demo-local',
    authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN        || 'demo-local.firebaseapp.com',
    projectId:         env.VITE_FIREBASE_PROJECT_ID         || 'demo-local',
    storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET     || 'demo-local.appspot.com',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '0',
    appId:             env.VITE_FIREBASE_APP_ID             || '0',
  }

  return {
    plugins: [vue()],
    define: {
      __firebase_config: JSON.stringify(firebaseConfig),
      __app_id: JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || 'hiragana-study'),
    },
    build: {
      reportCompressedSize: false,
      minify: 'esbuild',
      target: 'esnext',
    },
  }
})

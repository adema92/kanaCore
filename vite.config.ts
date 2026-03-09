import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const firebaseMock = {
  apiKey: "demo-local",
  authDomain: "demo-local.firebaseapp.com",
  projectId: "demo-local",
  storageBucket: "demo-local.appspot.com",
  messagingSenderId: "0",
  appId: "0",
};

export default defineConfig({
  plugins: [react()],
  define: {
    __firebase_config: JSON.stringify(firebaseMock),
    __app_id: JSON.stringify("default-app-id"),
  },
});

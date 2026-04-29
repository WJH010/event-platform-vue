import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
// 全局样式
import './styles/global.css'
// 引入Element Plus（仅使用提示框，轻量无负担）
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
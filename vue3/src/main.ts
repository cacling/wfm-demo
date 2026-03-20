/**
 * main.ts — 应用入口
 *
 * 初始化 Vue 3 应用，安装 Pinia 状态管理插件，挂载到 #app 节点。
 * Pinia 必须在 app.mount() 之前 use()，否则组件中的 useStore() 会报错。
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())  // 安装 Pinia（全局状态管理）
app.mount('#app')

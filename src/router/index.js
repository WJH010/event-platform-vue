import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../store/user'
import { getUserInfo } from '../api/user'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Layout from '../components/Layout.vue'
import UserInfo from '../views/UserInfo.vue'

// 文章模块
import ArticleList from '../views/article/ArticleList.vue'
import ArticleDetail from '../views/article/ArticleDetail.vue'
import ArticleForm from '../views/article/ArticleForm.vue'

// 活动模块
import EventList from '../views/event/EventList.vue'
import EventForm from '../views/event/EventForm.vue'
import UserEventList from '../views/event/UserEventList.vue'
import UserEventDetail from '../views/event/UserEventDetail.vue'
import MyRegistrations from '../views/event/MyRegistrations.vue'

// 消息群组模块
import MessageGroupList from '../views/message/MessageGroupList.vue'
import MessageGroupDetail from '../views/message/MessageGroupDetail.vue'
import MyMessage from '../views/message/MyMessage.vue'
import MyGroupMessage from '../views/message/MyGroupMessage.vue'

// 群聊模块
import ChatGroupList from '../views/chat/ChatGroupList.vue'
import ChatGroupForm from '../views/chat/ChatGroupForm.vue'
import ChatGroupDetail from '../views/chat/ChatGroupDetail.vue'

// Agent管理模块
import LlmConfigList from '../views/agent/LlmConfigList.vue'

const routes = [
  { path: '/login', component: Login, meta: { requiresAuth: false } },
  {
    path: '/',
    component: Layout,
    redirect: '/home',
    meta: { requiresAuth: true },
    children: [
      { path: 'home', component: Home, meta: { title: '控制台' } },
      { path: 'user/info', component: UserInfo, meta: { title: '个人信息' } },
      // 文章模块路由
      { path: 'articles', component: ArticleList, meta: { title: '文章管理' } },
      { path: 'articles/detail/:id', component: ArticleDetail, meta: { title: '文章详情' } },
      { path: 'articles/create', component: ArticleForm, meta: { title: '创建文章' } },
      { path: 'articles/edit/:id', component: ArticleForm, meta: { title: '编辑文章' } },
      // 活动模块路由
      { path: 'events', component: EventList, meta: { title: '活动管理' } },
      { path: 'events/create', component: EventForm, meta: { title: '创建活动' } },
      { path: 'events/edit/:id', component: EventForm, meta: { title: '编辑活动' } },
      // ================== 用户端活动模块路由 ==================
      { path: 'activity-center', component: UserEventList, meta: { title: '活动中心' } },
      { path: 'activity-center/detail/:id', component: UserEventDetail, meta: { title: '活动详情' } },
      { path: 'my-registrations', component: MyRegistrations, meta: { title: '我的报名' } },

      // ================== 管理端消息模块路由 ==================
      { path: 'message-groups', component: MessageGroupList, meta: { title: '消息群组管理' } },
      { path: 'message-groups/detail/:id', component: MessageGroupDetail, meta: { title: '群组详情' } },
      
      // ================== 用户端我的消息（所有用户可见）==================
      { path: 'my-message', component: MyMessage, meta: { title: '我的消息' } },
      { path: 'my-message/group/:id', component: MyGroupMessage, meta: { title: '群组消息' } },

      // ================== 群聊模块路由 ==================
      { path: 'chat-groups', component: ChatGroupList, meta: { title: '群聊管理' } },
      { path: 'chat-groups/create', component: ChatGroupForm, meta: { title: '创建群聊' } },
      { path: 'chat-groups/detail/:id', component: ChatGroupDetail, meta: { title: '群聊详情' } },
      { path: 'chat', component: () => import('../views/chat/index.vue'), meta: { title: '群聊' } },

      // ================== Agent管理模块路由 ==================
      { path: 'llm-configs', component: LlmConfigList, meta: { title: 'LLM配置管理', requiresAdmin: true } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：鉴权 + 自动拉取用户信息
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const requiresAuth = to.meta.requiresAuth !== false

  // 不需要登录的页面
  if (!requiresAuth) return next()

  // 无Token → 跳登录
  if (!userStore.access_token) return next('/login')

  // 有Token但无用户信息 → 自动拉取
  if (userStore.access_token && Object.keys(userStore.userInfo).length === 0) {
    try {
      const res = await getUserInfo()
      userStore.setUserInfo(res.data)
    } catch (e) {
      ElMessage.error('用户信息失效，请重新登录')
      userStore.logout()
      return next('/login')
    }
  }

  // 管理员权限检查
  if (to.meta.requiresAdmin) {
    const role = userStore.role
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
      ElMessage.warning('无权访问该页面')
      return next('/home')
    }
  }

  next()
})

export default router
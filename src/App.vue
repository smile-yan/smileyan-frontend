<template>
  <div id="app">
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="logo">
            <router-link to="/">Smileyan</router-link>
          </div>
          <el-menu mode="horizontal" :default-active="activeMenu" router>
            <el-menu-item index="/">首页</el-menu-item>
            <el-menu-item index="/page/book">题单</el-menu-item>
            <el-menu-item v-for="page in pages" :key="page.id" :index="page.slug ? '/page/' + page.slug : ''" v-show="page.slug && page.slug !== 'book'">
              {{ page.title }}
            </el-menu-item>
            <el-menu-item v-if="user && user.role === 'admin'" index="/admin">管理后台</el-menu-item>
          </el-menu>
          <div class="user-area">
            <template v-if="user">
              <el-dropdown @command="handleCommand">
                <span class="user-info">
                  <img v-if="user.avatar" :src="user.avatar" class="avatar" />
                  <span>{{ user.nickname || user.email }}</span>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                    <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <template v-else>
              <el-button type="primary" @click="showLogin = true">登录</el-button>
            </template>
          </div>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
      <el-footer>
        <div class="footer-content">
          <p>&copy; 2024 Smileyan. All rights reserved.</p>
        </div>
      </el-footer>
    </el-container>

    <!-- 登录对话框 -->
    <el-dialog v-model="showLogin" title="登录" width="400px">
      <el-form :model="loginForm" @submit.prevent="handleLogin" label-position="left" label-width="60px">
        <el-form-item label="邮箱">
          <el-input v-model="loginForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="验证码">
          <div class="code-input">
            <el-input v-model="loginForm.code" placeholder="请输入验证码" />
            <el-button class="send-code-btn" @click="sendCode" :disabled="codeCountdown > 0 || codeLoading" :loading="codeLoading">
              {{ codeCountdown > 0 ? `${codeCountdown}s` : (codeLoading ? '发送中' : '发送验证码') }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" style="width: 100%">登录</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 个人资料对话框 -->
    <el-dialog v-model="showProfile" title="个人资料" width="400px">
      <el-form :model="profileForm">
        <el-form-item label="昵称">
          <el-input v-model="profileForm.nickname" />
        </el-form-item>
        <el-form-item label="头像">
          <el-input v-model="profileForm.avatar" placeholder="头像URL" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showProfile = false">取消</el-button>
        <el-button type="primary" @click="updateProfile">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from './store/user'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const user = computed(() => userStore.user)
const showLogin = ref(false)
const showProfile = ref(false)
const pages = ref([])
const codeCountdown = ref(0)
const codeLoading = ref(false)

const loginForm = reactive({
  email: localStorage.getItem('rememberedEmail') || '',
  code: ''
})

const profileForm = reactive({
  nickname: '',
  avatar: ''
})

const activeMenu = computed(() => route.path)

onMounted(async () => {
  // 如果有 token，尝试获取用户信息
  if (userStore.token) {
    await userStore.fetchUser()
  }
  loadPages()
})

async function loadPages() {
  try {
    const res = await axios.get('/api/pages')
    pages.value = res.data
  } catch (e) {
    console.error('Failed to load pages', e)
  }
}

async function sendCode() {
  if (!loginForm.email) {
    ElMessage.warning('请输入邮箱')
    return
  }
  if (codeCountdown.value > 0 || codeLoading.value) return

  codeLoading.value = true
  try {
    await axios.post('/api/send-code', { email: loginForm.email })
    ElMessage.success('验证码已发送')
    codeCountdown.value = 60
    const timer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '发送失败')
  } finally {
    codeLoading.value = false
  }
}

async function handleLogin() {
  if (!loginForm.email || !loginForm.code) {
    ElMessage.warning('请填写完整信息')
    return
  }
  try {
    const res = await axios.post('/api/login', loginForm)
    userStore.setToken(res.data.token)
    userStore.setUser(res.data.user)
    // 记住邮箱
    localStorage.setItem('rememberedEmail', loginForm.email)
    showLogin.value = false
    ElMessage.success('登录成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '登录失败')
  }
}

function handleCommand(command) {
  if (command === 'profile') {
    profileForm.nickname = user.value?.nickname || ''
    profileForm.avatar = user.value?.avatar || ''
    showProfile.value = true
  } else if (command === 'logout') {
    userStore.logout()
    ElMessage.success('已退出登录')
  }
}

async function handleAvatarSuccess(res) {
  profileForm.avatar = res.avatar
}

async function updateProfile() {
  try {
    const res = await axios.put('/api/user', {
      nickname: profileForm.nickname
    })
    userStore.setUser(res.data)
    ElMessage.success('保存成功')
    showProfile.value = false
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 全局链接样式 */
a {
  color: #1e6bb8;
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: #3b9adb;
}

/* 全局表格样式 */
.el-table th.el-table__cell,
.el-table thead th {
  background-color: #bac3d1 !important;
}

/* 全局 blockquote 样式 - 用于 v-html 渲染的内容 */
.article-blockquote {
  border-left: 4px solid #409eff;
  margin: 15px 0;
  color: #666;
  padding: 10px 15px;
  background: #f9f9f9;
}

/* blockquote 内的链接 - 跟随容器颜色 */
.article-blockquote .article-link {
  color: #666;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.el-header {
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  padding: 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 20px;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  margin-right: 40px;
}

.logo a {
  color: #409eff;
  text-decoration: none;
}

.header-content .el-menu {
  flex: 1;
  border: none;
}

.user-area {
  margin-left: auto;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.el-main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 20px;
  overflow-y: auto;
}

.el-footer {
  background: #f5f5f5;
  padding: 20px;
  text-align: center;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  color: #666;
}

.code-input {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-input .el-input {
  flex: 1;
}

.code-input .send-code-btn {
  margin-left: auto;
  white-space: nowrap;
}

.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.avatar-uploader .el-upload:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  line-height: 100px;
  text-align: center;
}
</style>
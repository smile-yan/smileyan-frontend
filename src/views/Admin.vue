<template>
  <div class="admin">
    <el-container>
      <el-aside width="200px">
        <el-menu :default-active="activeMenu" :router="true">
          <el-menu-item index="/admin/posts">
            <el-icon><Document /></el-icon>
            <span>文章管理</span>
          </el-menu-item>
          <el-menu-item v-if="isAdmin" index="/admin/comments">
            <el-icon><ChatDotRound /></el-icon>
            <span>评论管理</span>
          </el-menu-item>
          <el-menu-item v-if="isAdmin" index="/admin/categories">
            <el-icon><Folder /></el-icon>
            <span>分类管理</span>
          </el-menu-item>
          <el-menu-item v-if="isAdmin" index="/admin/tags">
            <el-icon><PriceTag /></el-icon>
            <span>标签管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/pages">
            <el-icon><DocumentCopy /></el-icon>
            <span>页面管理</span>
          </el-menu-item>
          <el-menu-item v-if="isAdmin" index="/admin/subscriptions">
            <el-icon><Message /></el-icon>
            <span>订阅管理</span>
          </el-menu-item>
          <el-menu-item v-if="isAdmin" index="/admin/keys">
            <el-icon><Key /></el-icon>
            <span>密钥管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main>
        <router-view :key="$route.fullPath" />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../store/user'
import { useApiKeyStore } from '../store/apikey'
import { Document, ChatDotRound, Folder, PriceTag, DocumentCopy, Message, Key } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const apiKeyStore = useApiKeyStore()

const activeMenu = computed(() => route.path)
const isAdmin = computed(() => userStore.isAdmin)

onMounted(async () => {
  // 如果用户信息还没加载，先获取
  if (!userStore.user && userStore.token) {
    await userStore.fetchUser()
  }
  // 管理员或持有有效 API key 的用户可以进入
  if (!userStore.isAdmin && !apiKeyStore.hasApiKey) {
    router.push('/')
    return
  }
})
</script>

<style scoped>
.admin {
  min-height: 500px;
}

.el-aside {
  background: #fff;
  border-right: 1px solid #e4e7ed;
}

.el-menu {
  border: none;
}
</style>

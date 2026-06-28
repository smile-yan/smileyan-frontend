import { defineStore } from 'pinia'
import axios from '@/utils/axios'

// 初始化时设置 axios header
const token = localStorage.getItem('token') || ''
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: token,
    user: null
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin'
  },

  actions: {
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    },

    setUser(user) {
      this.user = user
    },

    async fetchUser() {
      if (!this.token) return
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        const res = await axios.get('/api/user')
        this.user = res.data
      } catch (e) {
        this.logout()
      }
    },

    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
    }
  }
})

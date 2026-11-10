import { defineStore } from 'pinia'
import axios from '@/utils/axios'

// 初始化时把本地存储的 key 注入请求头
const storedKey = localStorage.getItem('smileyan_api_key') || ''
if (storedKey) {
  axios.defaults.headers.common['X-API-Key'] = storedKey
}

export const useApiKeyStore = defineStore('apikey', {
  state: () => ({
    apiKey: storedKey
  }),

  getters: {
    hasApiKey: (state) => !!state.apiKey
  },

  actions: {
    setApiKey(key) {
      this.apiKey = key
      localStorage.setItem('smileyan_api_key', key)
      axios.defaults.headers.common['X-API-Key'] = key
    },

    clearApiKey() {
      this.apiKey = ''
      localStorage.removeItem('smileyan_api_key')
      delete axios.defaults.headers.common['X-API-Key']
    }
  }
})

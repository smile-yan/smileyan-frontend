import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Post from '../views/Post.vue'
import Page from '../views/Page.vue'
import Admin from '../views/Admin.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/post/:slug',
    name: 'Post',
    component: Post
  },
  {
    path: '/page/:slug',
    name: 'Page',
    component: Page
  },
  {
    path: '/category/:id',
    name: 'Category',
    component: Home
  },
  {
    path: '/tag/:id',
    name: 'Tag',
    component: Home
  },
  {
    path: '/search',
    name: 'Search',
    component: Home
  },
  {
    path: '/admin',
    component: Admin,
    children: [
      { path: '', redirect: '/admin/posts' },
      { path: 'posts/:page?', component: () => import('../views/AdminPosts.vue') },
      { path: 'comments', component: () => import('../views/AdminComments.vue') },
      { path: 'categories', component: () => import('../views/AdminCategories.vue') },
      { path: 'tags', component: () => import('../views/AdminTags.vue') },
      { path: 'pages', component: () => import('../views/AdminPages.vue') },
      { path: 'subscriptions', component: () => import('../views/AdminSubscriptions.vue') },
      { path: 'editor/:id?', component: () => import('../views/Editor.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
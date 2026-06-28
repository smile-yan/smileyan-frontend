<template>
  <div class="sidebar-content">
    <!-- 搜索框 -->
    <el-card class="sidebar-card">
      <template #header>搜索</template>
      <el-input
        :model-value="keyword"
        @update:model-value="$emit('update:keyword', $event)"
        placeholder="搜索文章..."
        @keyup.enter="search"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </el-card>

    <!-- 分类列表 -->
    <el-card class="sidebar-card">
      <template #header>分类</template>
      <div class="category-list">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="category-item"
          :class="{ active: categoryId === cat.id }"
          @click="selectCategory(cat.id)"
        >
          <span class="category-name">{{ cat.name }}</span>
          <span class="category-count">{{ cat.post_count || 0 }}</span>
        </div>
      </div>
    </el-card>

    <!-- 标签列表 -->
    <el-card class="sidebar-card">
      <template #header>标签</template>
      <div class="tag-cloud">
        <el-tag
          v-for="tag in tags"
          :key="tag.id"
          class="tag-item"
          :class="{ active: tagId === tag.id }"
          @click="selectTag(tag.id)"
        >
          {{ tag.name }} ({{ tag.post_count || 0 }})
        </el-tag>
      </div>
    </el-card>

    <!-- 日历 -->
    <el-card class="sidebar-card">
      <template #header>文章日历</template>
      <div class="calendar-header">
        <el-button link @click="prevMonth" :disabled="isPrevDisabled">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <div class="calendar-title">
          <el-select v-model="calendarYear" @change="onYearChange" size="small">
            <el-option v-for="year in yearOptions" :key="year" :label="year + '年'" :value="year" />
          </el-select>
          <el-select v-model="calendarMonth" @change="onMonthChange" size="small">
            <el-option v-for="month in monthOptions" :key="month.value" :label="month.label" :value="month.value" />
          </el-select>
        </div>
        <el-button link @click="nextMonth" :disabled="isNextDisabled">
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
      <el-calendar v-model="calendarDate">
        <template #date-cell="{ data }">
          <div
            class="calendar-cell"
            :class="{
              'has-posts': postDates.has(formatCalendarDate(data.day)),
              'is-today': isToday(data.day),
              'is-selected': isSelectedDate(data.day)
            }"
            @click="goToDatePosts(data.day)"
          >
            {{ data.day.split('-').slice(2).join('-') }}
            <div v-if="postDates.has(formatCalendarDate(data.day))" class="post-dot"></div>
          </div>
        </template>
      </el-calendar>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const emit = defineEmits(['select', 'search', 'update:keyword'])
const router = useRouter()
const route = useRoute()

// 从父组件获取数据
const props = defineProps({
  categories: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  postDates: { type: Set, default: () => new Set() },
  keyword: { type: String, default: '' },
  categoryId: { type: Number, default: null },
  tagId: { type: Number, default: null }
})

// 本地状态（复用父组件的状态）
const calendarDate = ref(new Date())

const currentYear = dayjs().year()
const currentMonth = dayjs().month() + 1
const calendarYear = ref(currentYear)
const calendarMonth = ref(currentMonth)

const yearOptions = computed(() => {
  const years = []
  for (let y = currentYear - 5; y <= currentYear; y++) {
    years.push(y)
  }
  return years
})

const monthOptions = computed(() => {
  const months = []
  const maxMonth = calendarYear.value === currentYear ? currentMonth : 12
  for (let m = 1; m <= maxMonth; m++) {
    months.push({ value: m, label: m + '月' })
  }
  return months
})

const isPrevDisabled = computed(() => false)
const isNextDisabled = computed(() => {
  return calendarYear.value >= currentYear && calendarMonth.value >= currentMonth
})

function prevMonth() {
  if (calendarMonth.value === 1) {
    calendarYear.value--
    calendarMonth.value = 12
  } else {
    calendarMonth.value--
  }
  calendarDate.value = dayjs().year(calendarYear.value).month(calendarMonth.value - 1).toDate()
}

function nextMonth() {
  if (calendarMonth.value === 12) {
    calendarYear.value++
    calendarMonth.value = 1
  } else {
    calendarMonth.value++
  }
  calendarDate.value = dayjs().year(calendarYear.value).month(calendarMonth.value - 1).toDate()
}

function onYearChange() {
  calendarDate.value = dayjs().year(calendarYear.value).month(calendarMonth.value - 1).toDate()
}

function onMonthChange() {
  calendarDate.value = dayjs().year(calendarYear.value).month(calendarMonth.value - 1).toDate()
}

function search() {
  if (props.keyword) {
    router.push({ name: 'Search', query: { keyword: props.keyword } })
  } else {
    router.push('/')
  }
  emit('search')
  emit('select')
}

function selectCategory(id) {
  if (props.categoryId === id) {
    router.push('/')
  } else {
    router.push(`/category/${id}`)
  }
  emit('select')
}

function selectTag(id) {
  if (props.tagId === id) {
    router.push('/')
  } else {
    router.push(`/tag/${id}`)
  }
  emit('select')
}

function formatCalendarDate(dateStr) {
  return dayjs(dateStr).format('YYYY-MM-DD')
}

function isToday(dateStr) {
  return dayjs(dateStr).isSame(dayjs(), 'day')
}

function isSelectedDate(dateStr) {
  const selected = route.query.date
  if (selected) {
    return dayjs(dateStr).isSame(dayjs(selected), 'day')
  }
  return false
}

function goToDatePosts(dateStr) {
  const formattedDate = dayjs(dateStr).format('YYYY-MM-DD')
  if (!props.postDates.has(formattedDate)) return

  if (route.query.date === formattedDate) {
    router.push({ path: '/' })
  } else {
    router.push({ path: '/', query: { date: formattedDate } })
  }
  emit('select')
}
</script>

<style scoped>
.sidebar-content {
  padding: 0 10px;
}

.sidebar-card {
  margin-bottom: 20px;
}

.sidebar-card :deep(.el-card__header) {
  padding: 12px 20px;
  font-weight: 600;
}

.sidebar-card .el-input {
  width: 100%;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.category-item:hover {
  background: #f5f7fa;
}

.category-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.category-name {
  flex: 1;
}

.category-count {
  color: #999;
  font-size: 12px;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
}

.category-item.active .category-count {
  background: #409eff;
  color: #fff;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  cursor: pointer;
  transition: all 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}

.tag-item.active {
  background: #409eff;
  color: #fff;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 10px;
}

.calendar-title {
  display: flex;
  gap: 8px;
}

.calendar-title .el-select {
  width: 90px;
}

.sidebar-card :deep(.el-calendar) {
  border: none;
}

.sidebar-card :deep(.el-calendar__header) {
  display: none;
}

.sidebar-card :deep(.el-calendar__body) {
  padding: 0;
}

.sidebar-card :deep(.el-calendar-table thead th) {
  padding: 6px 0;
  color: #999;
  font-size: 12px;
  font-weight: normal;
}

.sidebar-card :deep(.el-calendar-table td) {
  border: none;
}

.sidebar-card :deep(.el-calendar-table .el-calendar-day) {
  padding: 0;
  height: auto;
  border: none;
}

.sidebar-card :deep(.el-calendar-table td.is-selected .el-calendar-day) {
  background: transparent;
}

.calendar-cell {
  position: relative;
  width: 100%;
  height: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: all 0.2s;
  font-size: 12px;
  border-radius: 4px;
}

.calendar-cell.has-posts {
  cursor: pointer;
  color: #409eff;
  font-weight: 500;
}

.calendar-cell.has-posts:hover {
  background: #ecf5ff;
}

.calendar-cell.is-today {
  color: #f56c6c;
  font-weight: bold;
}

.calendar-cell.is-selected {
  background: #409eff;
  color: #fff !important;
}

.calendar-cell.is-selected .post-dot {
  background: #fff;
}

.post-dot {
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  background: #409eff;
  border-radius: 50%;
}

.calendar-cell.is-selected.has-posts .post-dot {
  display: none;
}
</style>
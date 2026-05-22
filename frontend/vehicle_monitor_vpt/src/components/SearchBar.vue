<template>
  <div class="search-bar">
    <div class="search-input-container">
      <input
        v-model="searchInput"
        type="text"
        placeholder="输入车牌号进行查询..."
        @keyup.enter="performSearch"
        class="search-input"
      />
      <button @click="performSearch" class="search-button">搜索</button>
    </div>
    
    <!-- 最近搜索历史 -->
    <div v-if="recentSearches.length > 0" class="recent-searches">
      <div class="recent-title">最近搜索:</div>
      <div class="recent-list">
        <span
          v-for="item in recentSearches"
          :key="item"
          class="recent-item"
          @click="selectRecentSearch(item)"
        >
          {{ item }}
        </span>
      </div>
    </div>
    
    <!-- 搜索建议 -->
    <div v-if="suggestions.length > 0" class="suggestions">
      <div
        v-for="suggestion in suggestions"
        :key="suggestion"
        class="suggestion-item"
        @click="selectSuggestion(suggestion)"
      >
        {{ suggestion }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTrafficStore } from '@/store/trafficStore';
import { debounce } from '@/utils';

const store = useTrafficStore();

const searchInput = ref('');
const suggestions = ref<string[]>([]);

// 计算最近搜索列表
const recentSearches = computed(() => store.recentSearches);

// 搜索方法
const performSearch = () => {
  if (searchInput.value.trim()) {
    store.saveRecentSearch(searchInput.value.trim());
    // 触发搜索事件
    emit('search', searchInput.value.trim());
  }
};

// 选择最近搜索项
const selectRecentSearch = (item: string) => {
  searchInput.value = item;
  store.saveRecentSearch(item);
  emit('search', item);
};

// 选择建议项
const selectSuggestion = (suggestion: string) => {
  searchInput.value = suggestion;
  suggestions.value = [];
  store.saveRecentSearch(suggestion);
  emit('search', suggestion);
};

// 防抖搜索建议
const debouncedSuggest = debounce(() => {
  if (searchInput.value.trim()) {
    // 这里可以根据实际需求实现搜索建议逻辑
    // 比如匹配最近搜索、匹配车辆列表等
    const inputValue = searchInput.value.toLowerCase().trim();
    
    // 示例：基于最近搜索提供建议
    suggestions.value = recentSearches.value.filter(item => 
      item.toLowerCase().includes(inputValue) && item !== searchInput.value
    ).slice(0, 5); // 限制最多5个建议
  } else {
    suggestions.value = [];
  }
}, 300);

// 监听输入变化
watch(searchInput, () => {
  debouncedSuggest();
});

// 定义emit
const emit = defineEmits<{
  search: [vehicleNo: string]
}>();
</script>

<style scoped>
.search-bar {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.search-input-container {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.search-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.search-button:hover {
  background-color: #0056b3;
}

.recent-searches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.recent-title {
  font-size: 12px;
  color: #666;
  font-weight: bold;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.recent-item {
  padding: 4px 8px;
  background-color: #e9ecef;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.recent-item:hover {
  background-color: #dee2e6;
}

.suggestions {
  position: absolute;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  width: calc(100% - 30px);
  margin-top: 5px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.suggestion-item {
  padding: 10px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.suggestion-item:hover {
  background-color: #f5f5f5;
}

.suggestion-item:last-child {
  border-bottom: none;
}
</style>
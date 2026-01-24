<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  customClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  name: '',
  size: 'md',
  customClass: ''
});

// 顏色配置庫
const avatarColors = [
  { bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'dark:bg-blue-900/50', darkText: 'dark:text-blue-300' },
  { bg: 'bg-teal-100', text: 'text-teal-600', darkBg: 'dark:bg-teal-900/50', darkText: 'dark:text-teal-300' },
  { bg: 'bg-purple-100', text: 'text-purple-600', darkBg: 'dark:bg-purple-900/50', darkText: 'dark:text-purple-300' },
  { bg: 'bg-indigo-100', text: 'text-indigo-600', darkBg: 'dark:bg-indigo-900/50', darkText: 'dark:text-indigo-300' },
  { bg: 'bg-pink-100', text: 'text-pink-600', darkBg: 'dark:bg-pink-900/50', darkText: 'dark:text-pink-300' },
  { bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'dark:bg-orange-900/50', darkText: 'dark:text-orange-300' },
];

// 尺寸配置
const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-12 h-12 text-base'
};

// 邏輯：取得縮寫
const initials = computed(() => {
  if (!props.name) return '??';
  return props.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

// 邏輯：取得顏色 Class
const avatarClass = computed(() => {
  if (!props.name) return `${avatarColors[0].bg} ${avatarColors[0].text}`;
  
  let hash = 0;
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const c = avatarColors[Math.abs(hash) % avatarColors.length];
  return `${c.bg} ${c.text} ${c.darkBg} ${c.darkText}`;
});
</script>

<template>
  <div 
    :class="[
      'rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-colors',
      sizeClasses[props.size],
      avatarClass,
      props.customClass
    ]"
    :title="props.name"
  >
    {{ initials }}
  </div>
</template>
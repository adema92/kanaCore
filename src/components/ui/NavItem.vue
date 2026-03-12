<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  color: String,
  active: {
    type: Boolean,
    default: false,
  },
  highlight: {
    type: Boolean,
    default: false,
  },
  plain: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['click'])

const colorMap = {
  pink:    { on: 'text-pink-500 bg-pink-50 border border-pink-100',       off: 'text-slate-400' },
  emerald: { on: 'text-emerald-600 bg-emerald-50 border border-emerald-100', off: 'text-slate-400' },
  blue:    { on: 'text-blue-600 bg-blue-50 border border-blue-100',       off: 'text-slate-400' },
  red:     { on: 'text-red-600 bg-red-50 border border-red-100',           off: 'text-slate-400' },
  indigo:  { on: 'text-indigo-500 bg-indigo-50 border border-indigo-100', off: 'text-slate-400' },
  purple:  { on: 'text-indigo-500 bg-indigo-50 border border-indigo-100', off: 'text-slate-400' },
  orange:  { on: 'text-red-600 bg-red-50 border border-red-100',           off: 'text-slate-400' },
  dark:    { on: 'text-slate-800 bg-slate-100 border border-slate-200',   off: 'text-slate-400' },
  amber:   { on: 'text-amber-600 bg-amber-50 border border-amber-200',     off: 'text-slate-400' },
}

const buttonClass = computed(() => {
  const c = colorMap[props.color] || colorMap.indigo
  const isOn = props.active || props.highlight
  const state = props.plain
    ? (isOn ? 'scale-105 text-slate-800' : c.off)
    : (isOn ? c.on + (props.active ? ' scale-105' : ' ring-2 ring-offset-2 ring-slate-300') : c.off)
  return `flex flex-col items-center justify-center w-[76px] h-14 rounded-2xl transition-all duration-200 ${state} active:scale-95 group`
})
</script>

<template>
  <button type="button" :class="buttonClass" @click="$emit('click')">
    <div class="flex items-center justify-center h-6 group-hover:scale-110 transition-transform">
      <slot />
    </div>
    <span v-if="label" class="text-[10px] font-black uppercase tracking-[0.08em] mt-0.5 leading-none">{{ label }}</span>
  </button>
</template>

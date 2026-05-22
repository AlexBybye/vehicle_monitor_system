<template>
  <div 
    class="vehicle-icon" 
    :class="{ selected: isSelected }"
    :style="{ 
      left: `${position.Pos_X}px`, 
      top: `${position.Pos_Y}px`,
      backgroundColor: color
    }"
    @click="selectVehicle"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <span class="vehicle-no">{{ vehicleNo }}</span>
    <div v-if="showTooltip" class="tooltip">
      <div><strong>{{ vehicleNo }}</strong></div>
      <div>位置: ({{ position.Pos_X }}, {{ position.Pos_Y }})</div>
      <div v-if="speed !== undefined">速度: {{ speed }} km/h</div>
      <div v-if="enterTime">进入时间: {{ formatDate(enterTime) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { formatDate } from '@/utils';

interface Props {
  vehicleNo: string;
  position: {
    Pos_X: number;
    Pos_Y: number;
  };
  speed?: number;
  enterTime?: string;
  isSelected?: boolean;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  color: '#FF0000',
  isSelected: false
});

const emit = defineEmits<{
  select: [vehicleNo: string]
}>();

const showTooltip = ref(false);

const selectVehicle = () => {
  emit('select', props.vehicleNo);
};
</script>

<style scoped>
.vehicle-icon {
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
  z-index: 10;
}

.vehicle-icon:hover {
  transform: scale(1.2);
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}

.vehicle-icon.selected {
  transform: scale(1.3);
  box-shadow: 0 0 15px rgba(255, 87, 34, 0.8);
}

.vehicle-no {
  color: white;
  font-size: 10px;
  font-weight: bold;
  text-align: center;
}

.tooltip {
  position: absolute;
  top: -70px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 100;
  min-width: 150px;
}

.tooltip::before {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
}
</style>
<script setup>
import { AlertCircle } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  message: {
    type: String,
    default: 'Are you sure you want to proceed?',
  },
  title: {
    type: String,
    default: 'Confirm Action',
  },
  confirmText: {
    type: String,
    default: 'Confirm',
  },
  cancelText: {
    type: String,
    default: 'Cancel',
  },
  variant: {
    type: String,
    default: 'danger', // 'danger' | 'warning' | 'primary'
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const closeModal = () => {
  emit('update:modelValue', false);
  emit('cancel');
};

const handleConfirm = () => {
  emit('update:modelValue', false);
  emit('confirm');
};

const variantClasses = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:opacity-90 focus:ring-red-400',
  },
  warning: {
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    buttonClass: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90 focus:ring-orange-400',
  },
  primary: {
    iconBg: 'bg-solana-purple/10',
    iconColor: 'text-solana-purple',
    buttonClass: 'bg-gradient-to-r from-solana-purple to-solana-cyan hover:opacity-90 focus:ring-solana-purple',
  },
};

const currentVariant = variantClasses[props.variant] || variantClasses.danger;
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="modelValue" @click="closeModal"
           class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
          <div :class="['flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4', currentVariant.iconBg]">
            <AlertCircle :class="['h-8 w-8', currentVariant.iconColor]" />
          </div>
          <h3 class="text-xl font-bold text-center text-brand-text mb-2">{{ title }}</h3>
          <p class="text-center text-brand-text-light mb-6">{{ message }}</p>
          <div class="flex gap-3">
            <button 
              @click="closeModal" 
              class="flex-1 px-4 py-2.5 bg-gray-100 text-brand-text rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              {{ cancelText }}
            </button>
            <button 
              @click="handleConfirm" 
              :class="['flex-1 px-4 py-2.5 text-white rounded-lg font-semibold text-sm transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2', currentVariant.buttonClass]"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
</style>
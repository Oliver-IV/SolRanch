<script setup>
import { AlertTriangle } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  message: {
    type: String,
    default: 'An error occurred. Please try again.',
  },
  title: {
    type: String,
    default: 'Error',
  }
});

const emit = defineEmits(['update:modelValue']);

const closeModal = () => {
  emit('update:modelValue', false);
};
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="modelValue" @click="closeModal"
           class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
          <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertTriangle class="h-8 w-8 text-red-600" />
          </div>
          <h3 class="text-xl font-bold text-center text-brand-text mb-2">{{ title }}</h3>
          <p class="text-center text-brand-text-light mb-6">{{ message }}</p>
          <button @click="closeModal" class="button-primary w-full bg-gradient-to-r from-red-500 to-red-600">
            Close
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.button-primary.bg-gradient-to-r.from-red-500.to-red-600 {
  @apply focus:ring-red-400;
}

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
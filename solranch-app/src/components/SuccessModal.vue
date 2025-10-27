<script setup>
import { Check } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  message: {
    type: String,
    default: 'Operation completed successfully!',
  },
  title: {
    type: String,
    default: 'Success!',
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
          <div class="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
            <Check class="h-8 w-8 text-green-600" />
          </div>
          <h3 class="text-xl font-bold text-center text-brand-text mb-2">{{ title }}</h3>
          <p class="text-center text-brand-text-light mb-6">{{ message }}</p>
          <button @click="closeModal" class="button-primary w-full">
            Got it!
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.button-primary {
  @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-solana-purple to-solana-cyan text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-solana-purple focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
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
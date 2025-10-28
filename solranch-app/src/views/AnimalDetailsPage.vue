<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Loader2, ArrowLeft } from 'lucide-vue-next';
import api from '../services/api';
import AnimalMarketplaceDetailsModal from '../components/AnimalMarketplaceDetailsModal.vue';
import SuccessModal from '../components/SuccessModal.vue';
import ErrorModal from '../components/ErrorModal.vue';

const route = useRoute();
const router = useRouter();

const animal = ref(null);
const loading = ref(true);
const error = ref(null);

const showDetailsModal = ref(false);
const showSuccessModal = ref(false);
const successMessage = ref('');
const showErrorModal = ref(false);
const errorMessage = ref('');

const fetchAnimal = async () => {
    loading.value = true;
    error.value = null;
    try {
        const response = await api.animals.getById(route.params.pda);
        animal.value = response.data;
        showDetailsModal.value = true;
    } catch (err) {
        console.error('Error fetching animal:', err);
        error.value = err.response?.data?.message || err.message || 'Failed to load animal details.';
    } finally {
        loading.value = false;
    }
};

const handleSuccess = (message) => {
    successMessage.value = message;
    showSuccessModal.value = true;
    showDetailsModal.value = false;

    // Redirigir a My Ranch después de una compra exitosa
    setTimeout(() => {
        router.push('/my-ranch');
    }, 2500);
};

const handleError = (message) => {
    errorMessage.value = message;
    showErrorModal.value = true;
};

const handleModalClose = () => {
    showDetailsModal.value = false;
    router.push('/');
};

onMounted(() => {
    fetchAnimal();
});
</script>

<template>
    <div class="max-w-4xl mx-auto">
        <button @click="router.push('/')"
            class="mb-6 flex items-center gap-2 text-solana-purple hover:text-solana-purple-dark transition-colors">
            <ArrowLeft class="h-5 w-5" />
            Back to Marketplace
        </button>

        <div v-if="loading" class="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <Loader2 class="h-12 w-12 animate-spin text-solana-purple mx-auto mb-4" />
            <p class="text-brand-text-light">Loading animal details...</p>
        </div>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div class="flex items-center gap-3 text-red-700">
                <span class="font-medium">{{ error }}</span>
            </div>
        </div>

        <AnimalMarketplaceDetailsModal v-model="showDetailsModal" :animal="animal" @success="handleSuccess"
            @error="handleError" @update:modelValue="handleModalClose" />

        <SuccessModal v-model="showSuccessModal" :message="successMessage" />
        <ErrorModal v-model="showErrorModal" :message="errorMessage" />
    </div>
</template>
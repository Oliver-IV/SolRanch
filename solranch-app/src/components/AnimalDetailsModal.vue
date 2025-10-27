<script setup>
import { defineProps, defineEmits, computed } from 'vue';
import { LAMPORTS_PER_SOL } from '@solana/web3.js'; 
import { X, Tag, ShieldCheck, Hourglass, Calendar, DollarSign } from 'lucide-vue-next';

const props = defineProps({
    modelValue: Boolean, 
    animal: Object 
});

const emit = defineEmits(['update:modelValue']);

const closeModal = () => {
    emit('update:modelValue', false);
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A'; 
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return 'N/A';
    }
};

const animalPda = computed(() => props.animal?.pda || props.animal?.animalPda);
const animalBirthDate = computed(() => props.animal?.birthDate || props.animal?.birth_date);
const isVerified = computed(() => props.animal?.isVerified === true); 
</script>

<template>
    <Teleport to="body">
        <transition name="modal-fade">
            <div v-if="modelValue && animal" @click="closeModal"
                class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div @click.stop
                    class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">

                    <div
                        class="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 p-5 border-b border-gray-200 z-10">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-bold text-brand-text flex items-center gap-2">
                                <Tag class="h-6 w-6 text-solana-purple" />
                                Animal Details: {{ animal.id_chip || animalPda?.slice(0, 6) }}
                            </h2>
                            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 transition-colors">
                                <X class="h-6 w-6" />
                            </button>
                        </div>
                        <span class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            :class="isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'">
                            <ShieldCheck v-if="isVerified" class="h-3.5 w-3.5" />
                            <Hourglass v-else class="h-3.5 w-3.5" />
                            {{ isVerified ? 'Verified' : 'Pending Verification' }}
                        </span>
                    </div>

                    <div class="p-6 space-y-4 text-sm">
                        <div class="grid grid-cols-3 gap-x-4 gap-y-3"> 
                            <span class="detail-label">ID Chip:</span>
                            <span class="detail-value col-span-2">{{ animal.idChip || 'N/A' }}</span>

                            <span class="detail-label">Species:</span>
                            <span class="detail-value col-span-2">{{ animal.specie || 'N/A' }}</span>

                            <span class="detail-label">Breed:</span>
                            <span class="detail-value col-span-2">{{ animal.breed || 'N/A' }}</span>

                            <span class="detail-label">Birth Date:</span>
                            <span class="detail-value col-span-2">{{ formatDate(animalBirthDate) }}</span>

                            <span class="detail-label">Status:</span>
                            <span class="detail-value col-span-2">{{ isVerified ? 'Verified' : 'Pending' }}</span>

                            <template v-if="isVerified && animal.owner">
                                <span class="detail-label">Owner:</span>
                                <span class="detail-value col-span-2 font-mono text-xs break-all">{{ animal.owner.pubkey
                                    }}</span>
                            </template>

                            <template v-if="!isVerified && animal.assignedVerifierPubkey">
                                <span class="detail-label">Assigned Verifier:</span>
                                <span class="detail-value col-span-2 font-mono text-xs break-all">{{
                                    animal.assignedVerifierPubkey }}</span>
                            </template>

                            <span class="detail-label">Animal PDA:</span>
                            <span class="detail-value col-span-2 font-mono text-xs break-all">{{ animalPda || 'N/A'
                                }}</span>

                            <template v-if="isVerified">
                                <template v-if="animal.salePrice">
                                    <span class="detail-label">Sale Price:</span>
                                    <span class="detail-value col-span-2 font-semibold">{{ (Number(animal.salePrice) /
                                        LAMPORTS_PER_SOL).toFixed(2) }} SOL</span>
                                </template>
                                <template v-if="animal.lastSalePrice && animal.lastSalePrice !== '0'">
                                    <span class="detail-label">Last Sale Price:</span>
                                    <span class="detail-value col-span-2">{{ (Number(animal.lastSalePrice) /
                                        LAMPORTS_PER_SOL).toFixed(2) }} SOL</span>
                                </template>
                                <template v-if="animal.allowedBuyerPubkey">
                                    <span class="detail-label">Allowed Buyer:</span>
                                    <span class="detail-value col-span-2 font-mono text-xs break-all">{{
                                        animal.allowedBuyerPubkey }}</span>
                                </template>
                            </template>
                        </div>

                        <div v-if="isVerified" class="pt-4 border-t border-gray-200">
                            <p class="text-xs text-center text-gray-400 italic">(Future actions like Set Price/Buyer
                                here)</p>
                        </div>

                    </div>

                    <div class="p-4 bg-gray-50 border-t border-gray-200 text-right sticky bottom-0">
                        <button @click="closeModal" class="button-secondary">Close</button>
                    </div>

                </div>
            </div>
        </transition>
    </Teleport>
</template>

<style scoped>
/* Scoped styles from MyRanchPage for buttons and modal transitions */
.button-secondary {
    @apply inline-flex items-center justify-center gap-2 bg-gray-100 text-brand-text-light px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
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

/* Simple styles for details */
.detail-label {
    @apply text-brand-text-light font-medium col-span-1;
}

.detail-value {
    @apply text-brand-text col-span-2;
}
</style>
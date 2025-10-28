<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { Transaction, Connection } from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
    X, Calendar, Hash, MapPin, Home, UserCheck, DollarSign,
    ShoppingCart, Loader2, CheckCircle, AlertTriangle, ShieldCheck, User
} from 'lucide-vue-next';
import api from '../services/api';
import { convertLamportsToUSD } from '../utils/solana-prices';
import { getSpeciesIcon } from '../utils/species';
import { RPC_URL } from '../utils/configs';

const props = defineProps({
    modelValue: Boolean,
    animal: Object,
});

const emit = defineEmits(['update:modelValue', 'success', 'error']);

const { publicKey, signTransaction } = useWallet();

const connection = new Connection(RPC_URL, 'confirmed');

const salePriceUSD = ref(null);
const lastSalePriceUSD = ref(null);
const loadingPrices = ref(true);
const purchasing = ref(false);
const purchaseStep = ref('idle');

const isForSale = computed(() => {
    return props.animal?.salePrice && props.animal.salePrice !== '0' && BigInt(props.animal.salePrice) > 0n;
});

const isAllowedBuyer = computed(() => {
    if (!props.animal?.allowedBuyerPubkey || !publicKey.value) return false;
    return props.animal.allowedBuyerPubkey === publicKey.value.toBase58();
});

const isOwner = computed(() => {
    if (!props.animal?.owner?.pubkey || !publicKey.value) return false;
    return props.animal.owner.pubkey === publicKey.value.toBase58();
});

const canPurchase = computed(() => {
    return isForSale.value && isAllowedBuyer.value && !isOwner.value;
});

const speciesIcon = computed(() => getSpeciesIcon(props.animal?.specie));

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatCountry = (country) => {
    if (!country) return '';
    return country.replace(/([A-Z])/g, ' $1').trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const close = () => {
    emit('update:modelValue', false);
};

const loadPrices = async () => {
    loadingPrices.value = true;
    try {
        if (props.animal?.salePrice) {
            salePriceUSD.value = await convertLamportsToUSD(props.animal.salePrice);
        }
        if (props.animal?.lastSalePrice && BigInt(props.animal.lastSalePrice) > 0n) {
            lastSalePriceUSD.value = await convertLamportsToUSD(props.animal.lastSalePrice);
        }
    } catch (err) {
        console.error('❌ Error loading prices:', err);
        salePriceUSD.value = null;
        lastSalePriceUSD.value = null;
    } finally {
        loadingPrices.value = false;
    }
};

const handlePurchase = async () => {
    if (!canPurchase.value || !publicKey.value || !signTransaction.value) return;

    purchasing.value = true;
    purchaseStep.value = 'building';

    try {
        const buildResponse = await api.animals.buildPurchaseTx(props.animal.pda);
        const { transaction: builtTxBase64, blockhash } = buildResponse.data;

        purchaseStep.value = 'signing';
        const txBuffer = Buffer.from(builtTxBase64, 'base64');
        const tx = Transaction.from(txBuffer);

        const latestBlockhash = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

        const signedTx = await signTransaction.value(tx);
        purchaseStep.value = 'sending';
        const txid = await connection.sendRawTransaction(signedTx.serialize());

        purchaseStep.value = 'confirming';
        const confirmationResult = await connection.confirmTransaction({
            signature: txid,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        }, 'confirmed');

        if (confirmationResult.value.err) throw new Error(`Transaction confirmation failed: ${confirmationResult.value.err}`);

        purchaseStep.value = 'finalizing';
        await api.animals.confirmPurchase(props.animal.pda, {
            animal_pda: props.animal.pda,
            txid: txid,
            latestBlockhash: latestBlockhash
        });

        purchaseStep.value = 'success';
        emit('success', `Successfully purchased ${props.animal.idChip}!`);

        setTimeout(() => close(), 2500);

    } catch (err) {
        console.error('❌ Purchase failed:', err);
        const apiError = err.response?.data?.message;
        const solanaError = err.message;
        emit('error', apiError
            ? (Array.isArray(apiError) ? apiError.join(', ') : apiError)
            : solanaError || 'Failed to purchase animal.');
        purchaseStep.value = 'idle';
    } finally {
        purchasing.value = false;
    }
};

watch(() => props.modelValue, (newVal) => {
    if (newVal) loadPrices();
});

onMounted(() => {
    if (props.modelValue) loadPrices();
});
</script>

<template>
<transition name="modal-fade">
    <div v-if="modelValue" @click="close"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div @click.stop
            class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">

            <div class="sticky top-0 bg-gradient-to-r from-purple-50 to-cyan-50 p-6 border-b border-purple-200 z-10">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-brand-text flex items-center gap-2">
                        <ShoppingCart class="h-6 w-6 text-solana-purple" />
                        Animal Details
                    </h2>
                    <button @click="close" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <X class="h-6 w-6" />
                    </button>
                </div>
            </div>

            <div v-if="animal" class="p-6 space-y-6">
                <div class="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 text-center">
                    <div class="text-8xl mb-4">{{ speciesIcon }}</div>
                    <h3 class="text-3xl font-bold text-brand-text">{{ animal.idChip }}</h3>
                    <div class="flex items-center justify-center gap-2 mt-2">
                        <span v-if="animal.isVerified"
                            class="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                            <ShieldCheck class="h-4 w-4" />
                            Verified
                        </span>
                        <span v-else
                            class="flex items-center gap-1 text-sm font-medium text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                            <AlertTriangle class="h-4 w-4" />
                            Pending Verification
                        </span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Origin Ranch -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center gap-2 text-brand-text-light mb-2">
                            <Home class="h-4 w-4" />
                            <span class="text-sm font-medium">Origin Ranch</span>
                        </div>
                        <p class="text-brand-text font-semibold truncate" :title="animal.originRanch?.name">
                            {{ animal.originRanch?.name || 'N/A' }}
                        </p>
                    </div>

                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center gap-2 text-brand-text-light mb-2">
                            <MapPin class="h-4 w-4" />
                            <span class="text-sm font-medium">Origin Country</span>
                        </div>
                        <p class="text-brand-text font-semibold">
                            {{ formatCountry(animal.originRanch?.country) || 'N/A' }}
                        </p>
                    </div>

                    <!-- Owner Ranch -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center gap-2 text-brand-text-light mb-2">
                            <Home class="h-4 w-4" />
                            <span class="text-sm font-medium">Owner Ranch</span>
                        </div>
                        <p class="text-brand-text font-semibold truncate" :title="animal.ownerRanch?.name">
                            {{ animal.ownerRanch?.name || 'N/A' }}
                        </p>
                    </div>

                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center gap-2 text-brand-text-light mb-2">
                            <MapPin class="h-4 w-4" />
                            <span class="text-sm font-medium">Owner Country</span>
                        </div>
                        <p class="text-brand-text font-semibold">
                            {{ formatCountry(animal.ownerRanch?.country) || 'N/A' }}
                        </p>
                    </div>

                    <!-- Last Sale Price -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center gap-2 text-brand-text-light mb-2">
                            <DollarSign class="h-4 w-4" />
                            <span class="text-sm font-medium">Last Sale Price (USD)</span>
                        </div>
                        <p class="text-brand-text font-semibold">
                            {{ loadingPrices ? 'Loading...' : (lastSalePriceUSD ?? 'N/A') }}
                        </p>
                    </div>

                    <!-- Sale Price -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center gap-2 text-brand-text-light mb-2">
                            <DollarSign class="h-4 w-4" />
                            <span class="text-sm font-medium">Sale Price (USD)</span>
                        </div>
                        <p class="text-brand-text font-semibold">
                            {{ loadingPrices ? 'Loading...' : (salePriceUSD ?? 'N/A') }}
                        </p>
                    </div>

                    <!-- Current Owner -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center gap-2 text-brand-text-light mb-2">
                            <User class="h-4 w-4" />
                            <span class="text-sm font-medium">Current Owner</span>
                        </div>
                        <p class="text-brand-text font-semibold font-mono text-xs truncate"
                            :title="animal.owner?.pubkey">
                            {{ animal.owner?.pubkey?.slice(0, 8) }}...{{ animal.owner?.pubkey?.slice(-6) }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</transition>
</template>

<style scoped>
.button-primary {
    @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-solana-purple to-solana-cyan text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-solana-purple focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
}

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
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}

.animate-scale-in {
    animation: scale-in 0.2s ease-out;
}
</style>

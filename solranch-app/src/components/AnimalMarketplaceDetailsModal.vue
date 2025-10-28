<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
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

const priceUSD = ref(null);
const loadingPrice = ref(true);
const purchasing = ref(false);
const purchaseStep = ref('idle');
const lastPriceUSD = ref(null);

const isForSale = computed(() => {
    return props.animal?.salePrice && props.animal.salePrice !== '0' && BigInt(props.animal.salePrice) > 0n;
});

const isAllowedBuyer = computed(() => {
    if (!props.animal?.allowedBuyerPubkey || !publicKey.value) return false;
    if (props.animal.allowedBuyerPubkey === '11111111111111111111111111111111') return true;
    return props.animal.allowedBuyerPubkey === publicKey.value.toBase58();
});

const isOwner = computed(() => {
    if (!props.animal?.owner?.pubkey || !publicKey.value) return false;
    return props.animal.owner.pubkey === publicKey.value.toBase58();
});

const canPurchase = computed(() => {
    return isForSale.value && (props.animal.allowedBuyerPubkey === '11111111111111111111111111111111' || isAllowedBuyer.value) && !isOwner.value;
});

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return 'N/A';
    }
};

const formatCountry = (country) => {
    if (!country) return '';
    return country.charAt(0).toUpperCase() + country.slice(1);
};

const close = () => {
    emit('update:modelValue', false);
};

const loadPrice = async () => {
    priceUSD.value = null;
    lastPriceUSD.value = null;
    loadingPrice.value = true;
    try {
        if (isForSale.value && props.animal?.salePrice) {
            priceUSD.value = await convertLamportsToUSD(props.animal.salePrice);
        }
        if (props.animal?.lastSalePrice && props.animal.lastSalePrice !== '0') {
            lastPriceUSD.value = await convertLamportsToUSD(props.animal.lastSalePrice);
        }
    } catch (error) {
        console.error("Failed to load USD prices:", error);
        priceUSD.value = 'Error';
        lastPriceUSD.value = 'Error';
    } finally {
        loadingPrice.value = false;
    }
};

const handlePurchase = async () => {
    if (!canPurchase.value || !publicKey.value || !signTransaction.value) return;
    purchasing.value = true;
    purchaseStep.value = 'building';
    let txid = '';

    try {
        const buildResponse = await api.animals.buildPurchaseTx(props.animal.pda);
        const { transaction: builtTxBase64 } = buildResponse.data;
        purchaseStep.value = 'signing';
        const txBuffer = Buffer.from(builtTxBase64, 'base64');
        const tx = Transaction.from(txBuffer);
        const latestBlockhash = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
        const signedTx = await signTransaction.value(tx);
        purchaseStep.value = 'sending';
        txid = await connection.sendRawTransaction(signedTx.serialize());
        purchaseStep.value = 'confirming';
        const confirmationResult = await connection.confirmTransaction({
            signature: txid,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        }, 'confirmed');

        if (confirmationResult.value.err) {
            throw new Error(`Transaction confirmation failed: ${JSON.stringify(confirmationResult.value.err)}`);
        }

        purchaseStep.value = 'finalizing';
        await api.animals.confirmPurchase(props.animal.pda, {
            txid: txid,
            latestBlockhash: latestBlockhash
        });

        purchaseStep.value = 'success';
        emit('success', `Successfully purchased ${props.animal.idChip}!`);
        setTimeout(() => {
            close();
        }, 2000);

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
    if (newVal && props.animal) {
        loadPrice();
        purchaseStep.value = 'idle';
    }
});

onMounted(() => {
    if (props.modelValue && props.animal) {
        loadPrice();
    }
});
</script>

<template>
    <transition name="modal-fade">
        <div v-if="modelValue" @click="close"
            class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div @click.stop
                class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in">

                <div class="sticky top-0 bg-gradient-to-r from-purple-50 to-cyan-50 p-5 border-b border-purple-200 z-10 flex-shrink-0">
                    <div class="flex justify-between items-center">
                        <h2 class="text-xl font-bold text-brand-text flex items-center gap-2">
                            <ShoppingCart class="h-5 w-5 text-solana-purple" />
                            Animal Details
                        </h2>
                        <button @click="close" class="text-gray-400 hover:text-gray-600 transition-colors">
                            <X class="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div v-if="animal" class="p-6 space-y-6 overflow-y-auto">
                    <div class="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 text-center">
                        <div class="text-7xl mb-3">{{ getSpeciesIcon(animal.specie) }}</div>
                        <h3 class="text-2xl font-bold text-brand-text truncate" :title="animal.idChip">{{ animal.idChip }}</h3>
                        <div class="flex items-center justify-center gap-2 mt-2">
                            <span v-if="animal.isVerified"
                                class="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                <ShieldCheck class="h-3.5 w-3.5" /> Verified
                            </span>
                            <span v-else
                                class="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full">
                                <AlertTriangle class="h-3.5 w-3.5" /> Pending
                            </span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                        <div class="detail-item">
                             <div class="detail-label-row">
                                <Hash class="detail-icon" />
                                <span class="detail-label-text">Species</span>
                            </div>
                            <p class="detail-value">{{ animal.specie }}</p>
                        </div>
                        <div class="detail-item">
                           <div class="detail-label-row">
                                <Hash class="detail-icon" />
                                <span class="detail-label-text">Breed</span>
                            </div>
                            <p class="detail-value">{{ animal.breed }}</p>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label-row">
                                <Calendar class="detail-icon" />
                                <span class="detail-label-text">Birth Date</span>
                            </div>
                            <p class="detail-value">{{ formatDate(animal.birthDate) }}</p>
                        </div>
                        <div class="detail-item">
                             <div class="detail-label-row">
                                <Home class="detail-icon" />
                                <span class="detail-label-text">Origin Ranch</span>
                            </div>
                            <p class="detail-value truncate" :title="animal.originRanch?.name">{{ animal.originRanch?.name || 'N/A' }}</p>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label-row">
                                <MapPin class="detail-icon" />
                                <span class="detail-label-text">Origin Country</span>
                            </div>
                            <p class="detail-value">{{ formatCountry(animal.originRanch?.country) || 'N/A' }}</p>
                        </div>
                        <div class="detail-item">
                             <div class="detail-label-row">
                                <Home class="detail-icon" />
                                <span class="detail-label-text">Owner Ranch</span>
                            </div>
                            <p class="detail-value truncate" :title="animal.ownerRanch?.name">{{ animal.ownerRanch?.name || 'N/A' }}</p>
                        </div>
                        <div class="detail-item">
                             <div class="detail-label-row">
                                <MapPin class="detail-icon" />
                                <span class="detail-label-text">Owner Country</span>
                            </div>
                            <p class="detail-value">{{ formatCountry(animal.ownerRanch?.country) || 'N/A' }}</p>
                        </div>
                        <div class="detail-item">
                             <div class="detail-label-row">
                                <DollarSign class="detail-icon" />
                                <span class="detail-label-text">Last Sale Price (USD)</span>
                            </div>
                            <p class="detail-value">
                                {{ loadingPrice ? '...' : (lastPriceUSD ?? 'N/A') }}
                            </p>
                        </div>
                        <div class="detail-item md:col-span-2">
                             <div class="detail-label-row">
                                <User class="detail-icon" />
                                <span class="detail-label-text">Current Owner</span>
                            </div>
                            <p class="detail-value font-mono text-xs break-all" :title="animal.owner?.pubkey">
                                {{ animal.owner?.pubkey || 'N/A' }}
                            </p>
                        </div>
                    </div>

                    <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-6">
                        <div class="detail-label-row mb-1">
                            <Hash class="detail-icon" /> <span class="detail-label-text">Animal PDA</span>
                        </div>
                        <p class="text-brand-text font-mono text-xs break-all">{{ animal.pda }}</p>
                    </div>

                    <div v-if="animal.isVerified" class="bg-gradient-to-r from-green-50 to-cyan-50 rounded-xl p-5 border border-green-200 mt-6 space-y-4">
                        <h3 class="text-lg font-bold text-brand-text flex items-center gap-2 mb-3">
                            <DollarSign class="h-5 w-5 text-green-600" /> Sale Information
                        </h3>

                        <div v-if="!isForSale" class="text-center py-3">
                            <p class="text-brand-text-light font-medium">🚫 Not currently listed for sale</p>
                        </div>

                        <div v-else class="space-y-4">
                            <div class="bg-white rounded-lg p-4 border border-gray-200">
                                <p class="text-xs text-brand-text-light mb-1">Listed Price</p>
                                <p v-if="loadingPrice" class="text-xl font-bold text-brand-text">
                                    <Loader2 class="h-5 w-5 animate-spin inline mr-1" /> Loading...
                                </p>
                                <p v-else-if="priceUSD !== null && priceUSD !== 'Error'" class="text-2xl font-bold text-green-600">
                                   ${{ priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                                    <span class="text-sm font-normal text-gray-500"> USD</span>
                                </p>
                                <p v-else class="text-lg font-semibold text-orange-600">Price Unavailable</p>
                            </div>

                            <div v-if="animal.allowedBuyerPubkey && animal.allowedBuyerPubkey !== '11111111111111111111111111111111'" class="bg-white rounded-lg p-4 border border-gray-200">
                                <div class="detail-label-row mb-1">
                                    <UserCheck class="detail-icon" /> <span class="detail-label-text">Restricted Sale</span>
                                </div>
                                <p class="text-brand-text font-mono text-xs break-all mb-2">
                                  Allowed Buyer: {{ animal.allowedBuyerPubkey }}
                                </p>
                                <div v-if="isAllowedBuyer && !isOwner" class="auth-message bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle class="h-4 w-4" /> You are authorized to purchase.
                                </div>
                                <div v-else-if="publicKey && !isAllowedBuyer && !isOwner" class="auth-message bg-orange-50 text-orange-700 border-orange-200">
                                    <AlertTriangle class="h-4 w-4" /> Not the authorized buyer.
                                </div>
                            </div>

                              <div v-else class="bg-white rounded-lg p-4 border border-gray-200">
                                 <div class="detail-label-row">
                                      <CheckCircle class="detail-icon text-green-600"/>
                                      <span class="detail-label-text">Public Sale</span>
                                 </div>
                                  <p class="text-xs text-gray-600 mt-1">This animal can be purchased by an authorized connected wallet.</p>
                                   <div v-if="!isOwner && publicKey" class="auth-message bg-green-50 text-green-700 border-green-200 mt-2">
                                        <CheckCircle class="h-4 w-4" /> You can purchase this animal.
                                    </div>
                             </div>

                             <div v-if="isOwner" class="auth-message bg-blue-50 text-blue-700 border-blue-200">
                                 <User class="h-4 w-4"/> You own this animal.
                             </div>
                        </div>
                    </div>

                     <div class="pt-6 border-t border-gray-200 mt-6 flex flex-col md:flex-row gap-3">
                            <button @click="close" :disabled="purchasing" class="button-secondary flex-1 order-2 md:order-1">Close</button>
                            <button v-if="canPurchase" @click="handlePurchase" :disabled="purchasing || !publicKey" class="button-primary flex-1 order-1 md:order-2">
                                <Loader2 v-if="purchasing" class="h-5 w-5 animate-spin" />
                                <template v-else>
                                    <ShoppingCart class="h-5 w-5" /> Purchase Animal
                                </template>
                            </button>
                            <button v-else-if="isForSale && !canPurchase && !isOwner" disabled class="button-primary flex-1 order-1 md:order-2 opacity-50 cursor-not-allowed">
                                <AlertTriangle class="h-5 w-5" /> Cannot Purchase
                            </button>
                     </div>

                     <div v-if="purchasing" class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mt-4">
                        <div class="flex items-center gap-2 text-blue-700">
                            <Loader2 class="h-4 w-4 animate-spin" />
                            <span class="font-medium">
                                {{ purchaseStep === 'building' ? 'Building...' :
                                purchaseStep === 'signing' ? 'Please sign...' :
                                purchaseStep === 'sending' ? 'Sending...' :
                                purchaseStep === 'confirming' ? 'Confirming...' :
                                purchaseStep === 'finalizing' ? 'Finalizing...' :
                                purchaseStep === 'success' ? 'Success!' : 'Processing...' }}
                            </span>
                        </div>
                    </div>

                </div>

                <div v-else class="p-6 text-center text-gray-500">
                    <Loader2 class="h-8 w-8 animate-spin inline-block" />
                    <p class="mt-2">Loading animal data...</p>
                </div>

            </div>
        </div>
    </transition>
</template>

<style scoped>
.detail-item { @apply bg-gray-50 rounded-lg p-3 border border-gray-100; } 
.detail-label-row { @apply flex items-center gap-1.5 text-brand-text-light mb-1; }
.detail-icon { @apply h-3.5 w-3.5; }
.detail-label-text { @apply text-xs font-medium uppercase tracking-wider; } 
.detail-value { @apply text-brand-text font-semibold text-sm; } 
.auth-message { @apply mt-2 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border; }

.button-primary { @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-solana-purple to-solana-cyan text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-solana-purple focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed; }
.button-secondary { @apply inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-scale-in { animation: scale-in 0.2s ease-out; }
</style>
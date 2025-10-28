<script setup>
import { ref, computed, watch } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { Connection, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';
import api from '@/services/api';
import { convertUSDToLamports, getSolPriceUSD } from '@/utils/solana-prices';
import { X, DollarSign, Loader2, Check, AlertTriangle } from 'lucide-vue-next';
import { RPC_URL } from '../utils/configs';

defineOptions({
  name: 'SetPriceModal'
});

const props = defineProps({
  modelValue: Boolean,
  animal: Object,
});

const emit = defineEmits(['update:modelValue', 'close', 'success', 'error']);

const { publicKey, signTransaction } = useWallet();

const connection = new Connection(RPC_URL, 'confirmed');

const priceUSD = ref('');
const calculatedSOL = ref(null);
const calculatingSOL = ref(false);
const processing = ref(false);
const error = ref(null);
const step = ref('form');

const isValidUSD = computed(() => {
  if (!priceUSD.value && priceUSD.value !== 0) return false;
  const priceNum = Number(priceUSD.value);
  return !isNaN(priceNum) && priceNum >= 0;
});

const close = () => {
  emit('close');
  priceUSD.value = '';
  calculatedSOL.value = null;
  error.value = null;
  step.value = 'form';
  processing.value = false;
  calculatingSOL.value = false;
};

const calculateEquivalentSOL = async () => {
  if (!isValidUSD.value) {
    calculatedSOL.value = null;
    return;
  }
  calculatingSOL.value = true;
  error.value = null;
  const usdNum = Number(priceUSD.value);
  if (usdNum === 0) {
      calculatedSOL.value = '0';
      calculatingSOL.value = false;
      return;
  }
  try {
    const solPrice = await getSolPriceUSD();
    if (solPrice === null || solPrice === 0) {
      calculatedSOL.value = 'Error fetching SOL price';
    } else {
      const solAmount = usdNum / solPrice;
      calculatedSOL.value = solAmount.toFixed(6);
    }
  } catch (e) {
      console.error("Error calculating SOL:", e);
      calculatedSOL.value = 'Calculation Error';
      error.value = "Could not calculate SOL equivalent.";
  } finally {
      calculatingSOL.value = false;
  }
};

let debounceTimer;
watch(priceUSD, (newValue) => {
  calculatedSOL.value = null;
  clearTimeout(debounceTimer);
  if (isValidUSD.value) {
    debounceTimer = setTimeout(() => {
      calculateEquivalentSOL();
    }, 500);
  }
});

const handleSetPrice = async () => {
  if (!isValidUSD.value || !publicKey.value || !signTransaction.value || !props.animal?.pda) {
    error.value = "Invalid price, wallet not connected, or animal data missing.";
    return;
  }

  processing.value = true;
  error.value = null;
  step.value = 'converting-usd';

  try {
    const usdNum = Number(priceUSD.value);
    const priceInLamportsString = await convertUSDToLamports(usdNum);

    if (priceInLamportsString === null) {
      throw new Error("Could not convert USD to Lamports. SOL price might be unavailable.");
    }
    const priceInLamports = BigInt(priceInLamportsString);

    step.value = 'building';
    const buildResponse = await api.animals.buildSetPriceTx(props.animal.pda, {
      price: priceInLamports.toString()
    });

    const txBase64 = buildResponse.data.transaction;
    if (!txBase64) throw new Error('Backend did not return a transaction.');

    step.value = 'signing';
    const txBuffer = Buffer.from(txBase64, 'base64');
    const tx = Transaction.from(txBuffer);

    const latestBlockhashForSend = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latestBlockhashForSend.blockhash;
    tx.lastValidBlockHeight = latestBlockhashForSend.lastValidBlockHeight;

    const signedTx = await signTransaction.value(tx);

    step.value = 'sending';
    const txid = await connection.sendRawTransaction(signedTx.serialize());

    step.value = 'confirming';
    const confirmationResult = await connection.confirmTransaction({
      signature: txid,
      blockhash: latestBlockhashForSend.blockhash,
      lastValidBlockHeight: latestBlockhashForSend.lastValidBlockHeight
    }, 'confirmed');

    if (confirmationResult.value?.err) {
      throw new Error(`Transaction confirmation failed: ${JSON.stringify(confirmationResult.value.err)}`);
    }

    step.value = 'confirming-backend';
    await api.animals.confirmSetPrice(props.animal.pda, {
      txid: txid,
      latestBlockhash: latestBlockhashForSend,
      animal_pda: props.animal.pda
    });

    step.value = 'success';
    emit('success', `Animal price set to ≈ $${usdNum.toFixed(2)} USD`);
    setTimeout(close, 1500);

  } catch (err) {
    console.error('Error setting price:', err);
    const apiError = err.response?.data?.message;
    const finalError = apiError
      ? (Array.isArray(apiError) ? apiError.join(', ') : apiError)
      : (err.message || 'Failed to set price');
    error.value = finalError;
    emit('error', finalError);
    step.value = 'form';
  } finally {
    processing.value = false;
  }
};

watch(() => props.modelValue, (newValue) => {
  if (newValue && props.animal) {
    priceUSD.value = '';
    calculatedSOL.value = null;
    error.value = null;
    step.value = 'form';
  }
});
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="modelValue" @click="close"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">

          <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-green-200">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold text-brand-text flex items-center gap-2">
                <DollarSign class="h-6 w-6 text-green-600" />
                Set Animal Price
              </h2>
              <button @click="close" class="text-gray-400 hover:text-gray-600 transition-colors" :disabled="processing">
                <X class="h-6 w-6" />
              </button>
            </div>
          </div>

          <form @submit.prevent="handleSetPrice" class="p-6 space-y-5">
            <div v-if="animal" class="bg-gray-50 rounded-lg p-3 text-sm border border-gray-100">
              <p class="text-brand-text-light mb-1">Animal ID:</p>
              <p class="font-semibold text-brand-text truncate" :title="animal.idChip">{{ animal.idChip || 'N/A' }}</p>
              <p class="text-xs text-brand-text-light mt-1">{{ animal.specie || 'N/A' }} • {{ animal.breed || 'N/A' }}</p>
            </div>

            <div>
              <label for="price-usd" class="block text-sm font-medium text-brand-text-light mb-1.5">
                Price (USD) *
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold"></span>
                <input
                  v-model="priceUSD"
                  id="price-usd"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  class="input-field w-full pl-8 pr-4"
                  :class="{'border-red-500 focus:ring-red-500': !isValidUSD && priceUSD.length > 0}"
                  :disabled="processing"
                />
              </div>
               <p v-if="!isValidUSD && priceUSD.length > 0" class="text-xs text-red-500 mt-1">
                 Please enter a valid non-negative USD amount.
               </p>
               <div v-if="isValidUSD && priceUSD !== '' && Number(priceUSD) >= 0" class="text-xs text-brand-text-light mt-2 bg-gray-50 p-2 rounded border border-gray-200">
                  <span v-if="calculatingSOL">Calculating SOL equivalent...</span>
                  <span v-else-if="calculatedSOL && !calculatedSOL.startsWith('Error')">
                      ≈ {{ calculatedSOL }} SOL
                  </span>
                   <span v-else-if="calculatedSOL" class="text-orange-600">{{ calculatedSOL }}</span>
               </div>
              <p class="text-xs text-brand-text-light mt-1">
                Enter the desired sale price in USD. Use 0 to remove from sale.
              </p>
            </div>

            <div v-if="error"
              class="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
              <AlertTriangle class="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{{ error }}</span>
            </div>

            <div v-if="processing" class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div class="flex items-center gap-2 text-blue-700">
                <Loader2 class="h-4 w-4 animate-spin" />
                <span class="font-medium">
                   {{ step === 'converting-usd' ? 'Converting USD...' :
                      step === 'building' ? 'Building transaction...' :
                      step === 'signing' ? 'Waiting for signature...' :
                      step === 'sending' ? 'Sending to network...' :
                      step === 'confirming' ? 'Confirming on network...' :
                      step === 'confirming-backend' ? 'Finalizing...' :
                      step === 'success' ? 'Success!' : 'Processing...' }}
                </span>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="close" :disabled="processing" class="button-secondary flex-1">
                Cancel
              </button>
              <button type="submit" :disabled="!isValidUSD || processing || calculatingSOL" class="button-primary flex-1">
                <Loader2 v-if="processing || calculatingSOL" class="h-5 w-5 animate-spin" />
                <template v-else>
                  <Check class="h-5 w-5" />
                  Set Price
                </template>
              </button>
            </div>
          </form>

        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.input-field {
  @apply block w-full border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm disabled:opacity-70 disabled:bg-gray-50;
}
.button-primary {
  @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
}
.button-secondary {
  @apply inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium text-xs sm:text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
}
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-scale-in { animation: scale-in 0.2s ease-out; }
</style>
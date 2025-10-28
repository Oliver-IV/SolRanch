<script setup>
import { ref, computed } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import api from '@/services/api';
import { X, UserCheck, Loader2, Check, AlertTriangle, User, ShieldOff } from 'lucide-vue-next';
import { RPC_URL } from '../utils/configs';

defineOptions({
  name: 'SetAllowedBuyerModal'
});

const props = defineProps({
  animal: Object,
});

const emit = defineEmits(['close', 'success', 'error']);

const { publicKey, signTransaction } = useWallet();

const connection = new Connection(RPC_URL, 'confirmed');

const buyerPubkey = ref('');
const processing = ref(false);
const error = ref(null);
const step = ref('form');

const isValid = computed(() => {
  if (buyerPubkey.value.trim() === '') return true;

  try {
    new PublicKey(buyerPubkey.value.trim());
    return true;
  } catch (e) {
    return false;
  }
});

const isUnset = computed(() => buyerPubkey.value.trim() === '');

const close = () => {
  emit('close');
  buyerPubkey.value = '';
  error.value = null;
  step.value = 'form';
  processing.value = false;
};

const handleSetAllowedBuyer = async () => {
  if (!isValid.value || !publicKey.value || !signTransaction.value || !props.animal) return;

  processing.value = true;
  error.value = null;

  try {
    const pubkeyToSend = isUnset.value
      ? '11111111111111111111111111111111' // Usar la clave "SystemProgram" (solana::system_program::ID) como marcador para "unset"
      : buyerPubkey.value.trim();

    step.value = 'building';
    const buildResponse = await api.animals.buildSetAllowedBuyerTx(props.animal.pda, {
      allowedBuyerPubkey: pubkeyToSend
    });

    const txBase64 = buildResponse.data.transaction;

    step.value = 'signing';
    const versionedTx = VersionedTransaction.deserialize(Buffer.from(txBase64, 'base64'));
    const signedTx = await signTransaction.value(versionedTx);

    step.value = 'sending';
    const txid = await connection.sendRawTransaction(signedTx.serialize());

    step.value = 'confirming';
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const confirmationResult = await connection.confirmTransaction({
      signature: txid,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');

    if (confirmationResult.value?.err) {
      throw new Error(`Transaction confirmation failed: ${JSON.stringify(confirmationResult.value.err)}`);
    }

    step.value = 'confirming-backend';
    await api.animals.confirmSetAllowedBuyer(props.animal.pda, {
      animal_pda: props.animal.pda,
      txid: txid,
      latestBlockhash: latestBlockhash
    });

    step.value = 'success';
    const successMsg = isUnset.value
      ? 'Allowed buyer has been cleared. Sale is public.'
      : `Allowed buyer set to ${pubkeyToSend.slice(0, 6)}...`;

    emit('success', successMsg);
    setTimeout(close, 1500);

  } catch (err) {
    console.error('Error setting allowed buyer:', err);
    const apiError = err.response?.data?.message;
    const finalError = apiError
      ? (Array.isArray(apiError) ? apiError.join(', ') : apiError)
      : (err.message || 'Failed to set allowed buyer');

    emit('error', finalError);
    step.value = 'form';
  } finally {
    processing.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="animal" @click="close"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">

          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-200">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold text-brand-text flex items-center gap-2">
                <UserCheck class="h-6 w-6 text-blue-600" />
                Set Allowed Buyer
              </h2>
              <button @click="close" class="text-gray-400 hover:text-gray-600 transition-colors" :disabled="processing">
                <X class="h-6 w-6" />
              </button>
            </div>
          </div>

          <form @submit.prevent="handleSetAllowedBuyer" class="p-6 space-y-5">
            <div v-if="animal" class="bg-gray-50 rounded-lg p-3 text-sm">
              <p class="text-brand-text-light mb-1">Animal ID:</p>
              <p class="font-semibold text-brand-text">{{ animal.idChip }}</p>
              <p class="text-xs text-brand-text-light mt-1">{{ animal.specie }} • {{ animal.breed }}</p>
            </div>

            <div>
              <label for="buyerPubkey" class="block text-sm font-medium text-brand-text-light mb-1.5">
                Allowed Buyer Public Key
              </label>
              <div class="relative">
                <input v-model="buyerPubkey" id="buyerPubkey" type="text" required
                  placeholder="Leave empty for public sale" class="input-field w-full pl-10"
                  :class="{ 'border-red-500': buyerPubkey.length > 0 && !isValid }" :disabled="processing" />
              </div>
              <p v-if="!isValid && buyerPubkey.length > 0" class="text-xs text-red-500 mt-1">
                Invalid Solana Public Key format.
              </p>
              <p class="text-xs text-brand-text-light mt-1">
                Enter the Solana address of the only account allowed to buy this animal.
              </p>
            </div>

            <div
              v-if="animal.allowed_buyer_pubkey && animal.allowed_buyer_pubkey !== '11111111111111111111111111111111'"
              class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm flex items-center gap-2">
              <ShieldOff class="h-4 w-4 text-blue-700 flex-shrink-0" />
              <span class="text-blue-700 font-medium">Currently Restricted to:</span>
              <span class="font-mono text-xs truncate">{{ animal.allowed_buyer_pubkey }}</span>
            </div>

            <div v-if="error"
              class="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
              <AlertTriangle class="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{{ error }}</span>
            </div>

            <div v-if="processing" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center gap-3 text-blue-700 mb-2">
                <Loader2 class="h-5 w-5 animate-spin" />
                <span class="font-medium">
                  {{ step === 'building' ? 'Building transaction...' :
                    step === 'signing' ? 'Waiting for signature...' :
                      step === 'sending' ? 'Sending to network...' :
                        step === 'confirming' ? 'Confirming on network...' :
                          step === 'confirming-backend' ? 'Finalizing...' :
                            step === 'success' ? 'Success!' : 'Processing...' }}
                </span>
              </div>
            </div>

            <div class="flex gap-3 pt-4">
              <button type="button" @click="close" :disabled="processing" class="button-secondary flex-1">
                Cancel
              </button>
              <button type="submit" :disabled="!isValid || processing" class="button-primary flex-1">
                <Loader2 v-if="processing" class="h-5 w-5 animate-spin" />
                <template v-else>
                  <Check class="h-5 w-5" />
                  {{ isUnset ? 'Allow Public Sale' : 'Set Allowed Buyer' }}
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
  @apply block w-full border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm disabled:opacity-70 disabled:bg-gray-50;
}

.button-primary {
  @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
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
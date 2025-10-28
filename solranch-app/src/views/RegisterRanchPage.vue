<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useWallet } from 'solana-wallets-vue';
import { Transaction, Connection } from '@solana/web3.js';
import { Buffer } from 'buffer'; 
import api from '@/services/api'; 
import { Home, Loader2, AlertTriangle } from 'lucide-vue-next';
import bs58 from 'bs58';
import { useAuthStore } from '@/stores/auth';
import { RPC_URL } from "../utils/configs.js"

const Country = {
  OTHER: 'other', // Value matches backend

  // America
  UNITED_STATES: 'unitedStates',
  BRAZIL: 'brazil',
  ARGENTINA: 'argentina',
  MEXICO: 'mexico',
  CANADA: 'canada',
  COLOMBIA: 'colombia',
  URUGUAY: 'uruguay',
  PARAGUAY: 'paraguay',

  // Europe
  FRANCE: 'france',
  GERMANY: 'germany',
  UNITED_KINGDOM: 'unitedKingdom',
  IRELAND: 'ireland',
  SPAIN: 'spain',
  ITALY: 'italy',
  POLAND: 'poland',
  NETHERLANDS: 'netherlands',
  RUSSIA: 'russia',

  // Asia and Pacific
  CHINA: 'china',
  INDIA: 'india',
  AUSTRALIA: 'australia',
  PAKISTAN: 'pakistan',
  JAPAN: 'japan',
  SOUTH_KOREA: 'southKorea',
}

const formatCountryName = (camelCaseName) => {
  if (!camelCaseName) return '';
  const result = camelCaseName.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const countryOptions = computed(() => {
  return Object.entries(Country).map(([key, value]) => ({
    value: value,
    text: formatCountryName(value) 
  })).sort((a, b) => a.text.localeCompare(b.text));
});

const router = useRouter();
const { publicKey, signTransaction, conn } = useWallet(); 

const connection = new Connection(RPC_URL, 'confirmed');

const ranchName = ref('');
const selectedCountry = ref(''); 

const loading = ref(false);
const error = ref(null);
const step = ref('form');
const ranchPda = ref(null); 

const canSubmit = computed(() => {
  return ranchName.value.trim() && selectedCountry.value && !loading.value;
});

const handleSubmit = async () => {
  if (!canSubmit.value || !publicKey.value || !signTransaction.value) return;

  loading.value = true;
  error.value = null;
  step.value = 'form'; // Reset step visually

  try {
    // 1. Build Transaction
    console.log('Building transaction...');
    step.value = 'signing';
    const buildResponse = await api.ranches.buildRegisterTx({
      name: ranchName.value.trim(),
      country: selectedCountry.value,
    });

    const txBase64 = buildResponse.data.transaction;
    const latestBlockhash = buildResponse.data.latestBlockhash; 
    
    if (!txBase64 || !latestBlockhash) {
      throw new Error('Invalid response from build-tx endpoint (missing tx or blockhash).');
    }

    console.log('Requesting signature...');
    const txBuffer = Buffer.from(txBase64, 'base64');
    const transaction = Transaction.from(txBuffer);
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = publicKey.value;

    const signedTransaction = await signTransaction.value(transaction);

    console.log('Sending transaction to Solana...');
    step.value = 'confirming';
    const rawTransaction = signedTransaction.serialize();
    
    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
    });
    console.log('Transaction sent with txid:', txid);

    console.log('Confirming transaction with backend...');

    await api.ranches.confirmRegistration({
      txid: txid,
      latestBlockhash: latestBlockhash 
    });

    const authStore = useAuthStore();
    await authStore.refreshAuth()

    console.log('Ranch registration successful!');
    step.value = 'success';
    setTimeout(() => {
      router.push('/my-ranch'); 
    }, 3000);

  } catch (err) {
    console.error("Ranch registration failed:", err);
    const apiError = err.response?.data?.message;
    if (apiError) {
      error.value = Array.isArray(apiError) ? apiError.join(', ') : apiError;
    } else {
      error.value = err.message || "An unknown error occurred.";
    }
    step.value = 'form';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <section class="text-center border-b border-gray-200 pb-6 mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold text-brand-text mb-2">
        Register Your Ranch
      </h1>
      <p class="text-lg text-brand-text-light">
        Add your ranch details to get started on SolRanch.
      </p>
    </section>

    <section class="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label for="ranchName" class="block text-sm font-medium text-brand-text-light mb-1.5">Ranch Name</label>
          <input
            v-model="ranchName"
            id="ranchName"
            type="text"
            required
            placeholder="E.g., Happy Cattle Ranch"
            class="input-field w-full"
            :disabled="loading"
          />
        </div>

        <div>
          <label for="country" class="block text-sm font-medium text-brand-text-light mb-1.5 flex items-center gap-1">Country</label>
          <select
            v-model="selectedCountry"
            id="country"
            required
            class="select-field w-full bg-white"
            :disabled="loading"
          >
            <option disabled value="">Select Country</option>
            <option v-for="option in countryOptions" :key="option.value" :value="option.value">
              {{ option.text }}
            </option>
          </select>
        </div>

        <div v-if="error" class="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
           <AlertTriangle class="h-5 w-5 flex-shrink-0 mt-0.5"/>
           <span>{{ error }}</span>
        </div>

        <div class="pt-2">
          <button
            type="submit"
            :disabled="!canSubmit || loading"
            class="button-primary w-full flex justify-center"
          >
            <Loader2 v-if="loading && step !== 'success'" class="h-5 w-5 animate-spin" />
            <span v-else-if="step === 'signing'">Waiting for Signature...</span>
            <span v-else-if="step === 'confirming'">Confirming Registration...</span>
            <span v-else-if="step === 'success'">Registration Complete! Redirecting...</span>
            <span v-else>Register Ranch</span>
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
/* Reusable Styles (same as AdminPage) */
.input-field { @apply block w-full border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-solana-purple focus:border-transparent transition text-sm disabled:opacity-70 disabled:bg-gray-50; }
.select-field { @apply block w-full border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-solana-purple focus:border-transparent transition text-sm appearance-none bg-no-repeat bg-right pr-8 disabled:opacity-70 disabled:bg-gray-50; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E"); background-position: right 0.7rem center; background-size: 1.1em 1.1em; }
.button-primary { @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-solana-purple to-solana-cyan text-white px-6 py-3 rounded-lg font-semibold text-base hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-solana-purple focus:ring-offset-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed; } /* Slightly larger button */
</style>
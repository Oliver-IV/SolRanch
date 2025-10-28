<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { useWallet } from 'solana-wallets-vue';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { useAuthStore } from '@/stores/auth';
import { Loader2, Check, X, Inbox, User, Calendar, Hash, Trash2, Clock, AlertTriangle, RefreshCcw } from 'lucide-vue-next';
import { RPC_URL } from '../utils/configs';

const authStore = useAuthStore();

// --- State ---
const loading = ref(false);
const actionLoading = ref(null);
const successMessage = ref('');
const errorMessage = ref('');
const showSuccessModal = ref(false);
const showErrorModal = ref(false);
const pendingList = ref([]);
const animalToReject = ref(null);
const showConfirmRejectModal = ref(false);

// --- Wallet & Connection ---
const { publicKey, signTransaction } = useWallet();
const connection = new Connection(RPC_URL, 'confirmed');

// --- Utils ---
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// --- Fetch pending animals ---
const fetchPendingAnimals = async () => {
  loading.value = true;
  errorMessage.value = '';
  showErrorModal.value = false;
  try {
    const response = await api.animals.getPendingForMe();
    pendingList.value = response.data.filter(a => !a.isVerified);
  } catch (err) {
    console.error("❌ Error fetching pending animals:", err);
    errorMessage.value = err.response?.data?.message || "Failed to load animals awaiting verification.";
    showErrorModal.value = true;
  } finally {
    loading.value = false;
  }
};

// --- Approve ---
const handleApprove = async (animal) => {
  if (!publicKey.value || !signTransaction.value) return;
  actionLoading.value = animal.pda;
  try {
    const txResponse = await api.animals.buildApproveTx(animal.pda);
    const tx = Transaction.from(Buffer.from(txResponse.data.transaction, 'base64'));
    const signedTx = await signTransaction.value(tx);
    const txid = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    await api.animals.confirmApproveTx(animal.pda, { animal_pda: animal.pda, txid, latestBlockhash });
    successMessage.value = `Animal ${animal.idChip || animal.pda.slice(0,6)} approved successfully!`;
    showSuccessModal.value = true;
    await fetchPendingAnimals();
  } catch (err) {
    console.error("❌ Error approving animal:", err);
    errorMessage.value = err.response?.data?.message || err.message || "Failed to approve animal.";
    showErrorModal.value = true;
  } finally {
    actionLoading.value = null;
  }
};

// --- Reject ---
const openRejectModal = (animal) => { animalToReject.value = animal; showConfirmRejectModal.value = true; };
const closeRejectModal = () => { animalToReject.value = null; showConfirmRejectModal.value = false; };
const confirmReject = async () => {
  if (!animalToReject.value || !publicKey.value || !signTransaction.value) return;

  const animal = animalToReject.value;
  actionLoading.value = animal.pda;

  closeRejectModal();
  errorMessage.value = '';
  showErrorModal.value = false;

  try {
    // --- Verificar existencia on-chain usando connection ---
    const accountInfo = await connection.getAccountInfo(new PublicKey(animal.pda));
    if (!accountInfo) {
      console.warn(`Animal ${animal.pda} already deleted on-chain.`);

      // Borrar del backend
      await api.animals.deleteLocalAnimal(animal.pda);

      successMessage.value = `Animal ${animal.idChip || animal.pda.slice(0, 6)} was already deleted on-chain. Local record removed.`;
      showSuccessModal.value = true;
      await fetchPendingAnimals();
      return;
    }

    // --- Construir y firmar transacción ---
    const txResponse = await api.animals.buildRejectTx(animal.pda);
    const tx = Transaction.from(Buffer.from(txResponse.data.transaction, 'base64'));
    tx.feePayer = publicKey.value;

    const signedTx = await signTransaction.value(tx);

    // --- Enviar transacción ---
    const txid = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    const latestBlockhash = await connection.getLatestBlockhash('finalized');

    // --- Confirmar en backend ---
    await api.animals.confirmRejectTx(animal.pda, {
      animal_pda: animal.pda,
      txid,
      latestBlockhash,
    });

    successMessage.value = `Registration for ${animal.idChip || animal.pda.slice(0, 6)} rejected successfully.`;
    showSuccessModal.value = true;
    await fetchPendingAnimals();

  } catch (err) {
    console.error('❌ Error rejecting animal:', err);
    errorMessage.value = err.response?.data?.message || err.message || 'Failed to reject animal.';
    showErrorModal.value = true;
  } finally {
    actionLoading.value = null;
  }
};



// --- Session & modals ---
const refreshSession = async () => {
  try { await authStore.refreshAuth(); successMessage.value='Session refreshed successfully.'; showSuccessModal.value=true; await fetchPendingAnimals(); } 
  catch { errorMessage.value='Failed to refresh session'; showErrorModal.value=true; }
};
const closeSuccessModal = () => { showSuccessModal.value=false; successMessage.value=''; };
const closeErrorModal = () => { showErrorModal.value=false; errorMessage.value=''; };

// --- Lifecycle ---
onMounted(async () => { await authStore.refreshAuth(); await fetchPendingAnimals(); });
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <section class="border-b border-gray-200 pb-6 mb-8 flex justify-between items-center flex-wrap gap-4">
      <div>
        <h1 class="text-3xl sm:text-4xl font-bold text-brand-text mb-2">Verifier Dashboard</h1>
        <p class="text-lg text-brand-text-light">Animals waiting for your verification.</p>
      </div>
      <button @click="refreshSession" class="button-secondary flex items-center gap-2">
        <RefreshCcw class="h-4 w-4" />
        Refresh Session
      </button>
    </section>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <Loader2 class="h-12 w-12 animate-spin text-solana-purple" />
    </div>

    <div v-else-if="!loading && pendingList?.length === 0 && !showErrorModal"
      class="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
      <Inbox class="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-2xl font-semibold text-brand-text mb-2">All Clear!</h3>
      <p class="text-brand-text-light max-w-xs mx-auto">
        There are no animals pending your verification right now.
      </p>
    </div>

    <div v-else class="space-y-4">
      <div v-for="animal in pendingList" :key="animal.pda"
        class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
        <div class="p-5 flex flex-col md:flex-row gap-4">
          <div class="flex-1 space-y-3">
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-bold text-brand-text">{{ animal.idChip }}</h2>
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
                <Clock class="h-3 w-3" /> Pending
              </span>
            </div>
            <p class="text-brand-text-light text-lg">{{ animal.specie }} • {{ animal.breed }}</p>
            <p class="text-brand-text-light text-sm">
              Ranch: <strong>{{ animal.originRanch?.name || 'N/A' }}</strong>
            </p>

            <div class="text-sm text-brand-text-light space-y-2 pt-2 border-t border-gray-100">
              <p class="flex items-center gap-2">
                <Hash class="h-4 w-4" />
                <span class="font-mono" :title="animal.pda">{{ animal.pda.slice(0, 12) }}...{{ animal.pda.slice(-8)
                }}</span>
              </p>
              <p class="flex items-center gap-2">
                <User class="h-4 w-4" />
                <span class="font-mono" :title="animal.owner?.pubkey">{{ animal.owner?.pubkey.slice(0, 12) }}...{{
                  animal.owner?.pubkey.slice(-8) }}</span>
              </p>
              <p class="flex items-center gap-2">
                <Calendar class="h-4 w-4" />
                <span>Born: {{ formatDate(animal.birthDate) }}</span>
              </p>
              <p class="flex items-center gap-2">
                <Calendar class="h-4 w-4 opacity-70" />
                <span>Registered: {{ formatDate(animal.createdAt) }}</span>
              </p>
            </div>
          </div>

          <div class="flex-shrink-0 flex flex-col gap-3 w-full md:w-auto md:min-w-[120px]">
            <button @click="handleApprove(animal)" :disabled="actionLoading === animal.pda"
              class="button-primary !bg-gradient-to-r !from-green-500 !to-green-600 hover:!from-green-600 hover:!to-green-700">
              <Loader2 v-if="actionLoading === animal.pda && !showErrorModal" class="h-5 w-5 animate-spin" />
              <Check v-else class="h-5 w-5" />
              Approve
            </button>
            <button @click="openRejectModal(animal)" :disabled="actionLoading === animal.pda"
              class="button-secondary w-full border-red-200 !text-red-600 hover:!bg-red-50">
              <Loader2 v-if="actionLoading === animal.pda && showErrorModal" class="h-5 w-5 animate-spin" />
              <X v-else class="h-5 w-5" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showSuccessModal" @click="closeSuccessModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div class="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
              <Check class="h-8 w-8 text-green-600" />
            </div>
            <h3 class="text-xl font-bold text-center text-brand-text mb-2">Success!</h3>
            <p class="text-center text-brand-text-light mb-6">{{ successMessage }}</p>
            <button @click="closeSuccessModal" class="button-primary w-full">
              Got it!
            </button>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Error Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showErrorModal" @click="closeErrorModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle class="h-8 w-8 text-red-600" />
            </div>
            <h3 class="text-xl font-bold text-center text-brand-text mb-2">Error</h3>
            <p class="text-center text-brand-text-light mb-6">{{ errorMessage }}</p>
            <button @click="closeErrorModal" class="button-primary w-full bg-gradient-to-r from-red-500 to-red-600">
              Close
            </button>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Confirm Reject Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showConfirmRejectModal" @click="closeRejectModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 class="h-8 w-8 text-red-600" />
            </div>
            <h3 class="text-xl font-bold text-center text-brand-text mb-2">Confirm Rejection</h3>
            <p class="text-center text-brand-text-light mb-6">
              Are you sure you want to reject the registration for
              <strong class="font-mono">{{ animalToReject?.id_chip || animalToReject?.animalPda?.slice(0, 6)
                }}</strong>?
              This action cannot be undone.
            </p>
            <div class="flex gap-3">
              <button @click="closeRejectModal" class="button-secondary flex-1">
                Cancel
              </button>
              <button @click="confirmReject"
                class="button-primary flex-1 bg-gradient-to-r from-red-500 to-red-600 focus:ring-red-400">
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.button-primary {
  @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-solana-purple to-solana-cyan text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-solana-purple focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
}

.button-secondary {
  @apply inline-flex items-center justify-center gap-2 bg-gray-100 border border-gray-200 text-brand-text-light px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
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

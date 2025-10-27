<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';
import {
  CheckCircle, Clock, UserCheck, AlertTriangle, PlusCircle,
  Loader2, X, Check, XCircle, Shield, ShieldOff, Power
} from 'lucide-vue-next';
import SuccessModal from '@/components/SuccessModal.vue';
import ErrorModal from '@/components/ErrorModal.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';

const pendingRanches = ref([]);
const verifiedRanches = ref([]);
const allVerifiers = ref([]);
const loadingRanches = ref(true);
const loadingVerifiedRanches = ref(true);
const loadingVerifiers = ref(true);
const errorRanches = ref(null);
const errorVerifiedRanches = ref(null);
const errorVerifiers = ref(null);
const verifyingRanchPda = ref(null);
const unverifyingRanchPda = ref(null);
const togglingVerifierPda = ref(null);
const showRegisterForm = ref(false);
const newVerifierPubkey = ref('');
const newVerifierName = ref('');
const registeringVerifier = ref(false);
const registerError = ref(null);

const showSuccessModal = ref(false);
const successMessage = ref('');
const showErrorModal = ref(false);
const errorMessage = ref('');

// Confirm Modal State
const showConfirmModal = ref(false);
const confirmModalConfig = ref({
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
  onConfirm: () => { },
});

const activeTab = ref('pending'); // 'pending' | 'verified'

const fetchPendingRanches = async () => {
  loadingRanches.value = true;
  errorRanches.value = null;
  try {
    const response = await api.ranches.getAll({ isVerified: false });
    pendingRanches.value = response.data.data;
  } catch (err) {
    console.error("Error fetching pending ranches:", err);
    errorRanches.value = "Failed to load pending ranches.";
  } finally {
    loadingRanches.value = false;
  }
};

const fetchVerifiedRanches = async () => {
  loadingVerifiedRanches.value = true;
  errorVerifiedRanches.value = null;
  try {
    const response = await api.ranches.getAll({ isVerified: true });
    verifiedRanches.value = response.data.data;
  } catch (err) {
    console.error("Error fetching verified ranches:", err);
    errorVerifiedRanches.value = "Failed to load verified ranches.";
  } finally {
    loadingVerifiedRanches.value = false;
  }
};

const fetchAllVerifiers = async () => {
  loadingVerifiers.value = true;
  errorVerifiers.value = null;
  try {
    const response = await api.verifiers.getAll({ limit: 100 });
    allVerifiers.value = response.data.data;
  } catch (err) {
    console.error("Error fetching verifiers:", err);
    errorVerifiers.value = "Failed to load verifiers.";
  } finally {
    loadingVerifiers.value = false;
  }
};

const handleRegisterVerifier = async () => {
  if (!newVerifierPubkey.value || !newVerifierName.value) {
    registerError.value = "Public Key and Name are required.";
    return;
  }

  registeringVerifier.value = true;
  registerError.value = null;

  try {
    const verifierData = {
      verifier_authority: newVerifierPubkey.value,
      name: newVerifierName.value,
    };

    await api.verifiers.registerVerifier(verifierData);

    successMessage.value = `Verifier "${newVerifierName.value}" registered successfully!`;
    showSuccessModal.value = true;

    newVerifierPubkey.value = '';
    newVerifierName.value = '';
    showRegisterForm.value = false;
    await fetchAllVerifiers();

  } catch (err) {
    console.error("Error registering verifier:", err);
    if (err.response?.data?.message) {
      registerError.value = Array.isArray(err.response.data.message)
        ? err.response.data.message.join(', ')
        : err.response.data.message;
    } else {
      registerError.value = "Failed to register verifier.";
    }
  } finally {
    registeringVerifier.value = false;
  }
};

const verifyRanch = async (ranchPda, ranchName) => {
  if (verifyingRanchPda.value) return;

  verifyingRanchPda.value = ranchPda;

  try {
    console.log(`Verifying ranch ${ranchPda}...`);

    await api.ranches.setVerification(ranchPda, { isVerified: true });

    console.log(`Ranch ${ranchPda} verified successfully!`);

    pendingRanches.value = pendingRanches.value.filter(ranch => ranch.pda !== ranchPda);

    await fetchVerifiedRanches();

    successMessage.value = `Ranch "${ranchName}" has been verified successfully!`;
    showSuccessModal.value = true;

  } catch (err) {
    console.error(`Error verifying ranch ${ranchPda}:`, err);

    const apiError = err.response?.data?.message;
    errorMessage.value = apiError
      ? (Array.isArray(apiError) ? apiError.join(', ') : apiError)
      : 'Failed to verify ranch. Please try again.';
    showErrorModal.value = true;

  } finally {
    verifyingRanchPda.value = null;
  }
};

const promptUnverifyRanch = (ranchPda, ranchName) => {
  confirmModalConfig.value = {
    title: 'Unverify Ranch?',
    message: `Are you sure you want to UNVERIFY ranch "${ranchName}"? This will prevent them from registering animals until verified again.`,
    confirmText: 'Yes, Unverify',
    cancelText: 'Cancel',
    variant: 'danger',
    onConfirm: () => unverifyRanch(ranchPda, ranchName),
  };
  showConfirmModal.value = true;
};

const unverifyRanch = async (ranchPda, ranchName) => {
  if (unverifyingRanchPda.value) return;

  unverifyingRanchPda.value = ranchPda;

  try {
    console.log(`Unverifying ranch ${ranchPda}...`);

    await api.ranches.setVerification(ranchPda, { isVerified: false });

    console.log(`Ranch ${ranchPda} unverified successfully!`);

    verifiedRanches.value = verifiedRanches.value.filter(ranch => ranch.pda !== ranchPda);

    await fetchPendingRanches();

    successMessage.value = `Ranch "${ranchName}" has been unverified.`;
    showSuccessModal.value = true;

  } catch (err) {
    console.error(`Error unverifying ranch ${ranchPda}:`, err);

    const apiError = err.response?.data?.message;
    errorMessage.value = apiError
      ? (Array.isArray(apiError) ? apiError.join(', ') : apiError)
      : 'Failed to unverify ranch. Please try again.';
    showErrorModal.value = true;

  } finally {
    unverifyingRanchPda.value = null;
  }
};

const promptToggleVerifierStatus = (verifierPda, verifierName, currentStatus) => {
  const action = currentStatus ? 'deactivate' : 'activate';
  const actionPast = currentStatus ? 'deactivated' : 'activated';
  
  confirmModalConfig.value = {
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Verifier?`,
    message: `Are you sure you want to ${action} verifier "${verifierName}"?`,
    confirmText: `Yes, ${action.charAt(0).toUpperCase() + action.slice(1)}`,
    cancelText: 'Cancel',
    variant: currentStatus ? 'warning' : 'primary',
    onConfirm: () => toggleVerifierStatus(verifierPda, verifierName, actionPast), // ✅ Pasa actionPast
  };
  showConfirmModal.value = true;
};

const toggleVerifierStatus = async (verifierPda, verifierName, wasActive) => {
  if (togglingVerifierPda.value) return;
  
  const actionPast = wasActive ? 'deactivated' : 'activated';
  
  togglingVerifierPda.value = verifierPda;
  
  try {
    console.log(`Toggling verifier status ${verifierPda}...`);
    
    await api.verifiers.toggleStatus(verifierPda);
    
    console.log(`Verifier ${verifierPda} ${actionPast} successfully!`);
    
    await fetchAllVerifiers();
    
    successMessage.value = `Verifier "${verifierName}" has been ${actionPast}.`;
    showSuccessModal.value = true;

  } catch (err) {
    console.error(`Error toggling verifier status ${verifierPda}:`, err);
    
    const apiError = err.response?.data?.message;
    errorMessage.value = apiError 
      ? (Array.isArray(apiError) ? apiError.join(', ') : apiError)
      : `Failed to update verifier status. Please try again.`;
    showErrorModal.value = true;
    
  } finally {
    togglingVerifierPda.value = null;
  }
};

const closeSuccessModal = () => {
  showSuccessModal.value = false;
  successMessage.value = '';
};

const closeErrorModal = () => {
  showErrorModal.value = false;
  errorMessage.value = '';
};

const activeVerifiers = computed(() => allVerifiers.value.filter(v => v.isActive));
const inactiveVerifiers = computed(() => allVerifiers.value.filter(v => !v.isActive));

onMounted(() => {
  fetchPendingRanches();
  fetchVerifiedRanches();
  fetchAllVerifiers();
});
</script>

<template>
  <div class="space-y-10 md:space-y-12">
    <section class="border-b border-gray-200 pb-6">
      <h1 class="text-3xl sm:text-4xl font-bold text-brand-text mb-2">
        Admin Settings
      </h1>
      <p class="text-lg text-brand-text-light">
        Manage ranch verifications and verifier accounts.
      </p>
    </section>

    <!-- Ranches Section with Tabs -->
    <section class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <div class="flex items-center gap-3 mb-6">
        <Shield class="h-6 w-6 text-orange-500" />
        <h2 class="text-xl font-semibold text-brand-text">Ranch Management</h2>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200 mb-6">
        <button @click="activeTab = 'pending'" :class="[
          'px-4 py-2 font-medium text-sm transition-colors relative',
          activeTab === 'pending'
            ? 'text-solana-purple'
            : 'text-gray-500 hover:text-gray-700'
        ]">
          <span class="flex items-center gap-2">
            <Clock class="h-4 w-4" />
            Pending ({{ pendingRanches.length }})
          </span>
          <div v-if="activeTab === 'pending'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-solana-purple"></div>
        </button>
        <button @click="activeTab = 'verified'" :class="[
          'px-4 py-2 font-medium text-sm transition-colors relative',
          activeTab === 'verified'
            ? 'text-green-600'
            : 'text-gray-500 hover:text-gray-700'
        ]">
          <span class="flex items-center gap-2">
            <CheckCircle class="h-4 w-4" />
            Verified ({{ verifiedRanches.length }})
          </span>
          <div v-if="activeTab === 'verified'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>
        </button>
      </div>

      <!-- Pending Ranches Tab -->
      <div v-show="activeTab === 'pending'">
        <div v-if="loadingRanches" class="space-y-4 animate-pulse">
          <div v-for="i in 3" :key="`ranch-skel-${i}`"
            class="flex justify-between items-center p-4 border border-gray-100 rounded-lg">
            <div>
              <div class="h-5 bg-gray-200 rounded w-48 mb-1"></div>
              <div class="h-4 bg-gray-200 rounded w-64"></div>
            </div>
            <div class="h-10 bg-gray-200 rounded-lg w-24"></div>
          </div>
        </div>

        <div v-else-if="errorRanches"
          class="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertTriangle class="h-5 w-5" />
          <span>{{ errorRanches }}</span>
        </div>

        <div v-else-if="pendingRanches.length === 0" class="text-center py-10">
          <CheckCircle class="h-12 w-12 text-green-500 mx-auto mb-3 opacity-70" />
          <p class="text-brand-text-light">No ranches currently pending verification.</p>
        </div>

        <div v-else class="space-y-3">
          <div v-for="ranch in pendingRanches" :key="ranch.pda"
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div class="mb-3 sm:mb-0">
              <p class="font-semibold text-brand-text">{{ ranch.name }}</p>
              <p class="text-xs text-brand-text-light font-mono" :title="ranch.pda">
                PDA: {{ ranch.pda.slice(0, 10) }}...{{ ranch.pda.slice(-8) }}
              </p>
              <p class="text-xs text-brand-text-light mt-1">Country: {{ ranch.country }}</p>
            </div>
            <button @click="verifyRanch(ranch.pda, ranch.name)" :disabled="verifyingRanchPda === ranch.pda"
              class="button-success w-full sm:w-auto">
              <Loader2 v-if="verifyingRanchPda === ranch.pda" class="h-4 w-4 animate-spin" />
              <template v-else>
                <CheckCircle class="h-4 w-4" /> Verify Ranch
              </template>
            </button>
          </div>
        </div>
      </div>

      <!-- Verified Ranches Tab -->
      <div v-show="activeTab === 'verified'">
        <div v-if="loadingVerifiedRanches" class="space-y-4 animate-pulse">
          <div v-for="i in 3" :key="`verified-skel-${i}`"
            class="flex justify-between items-center p-4 border border-gray-100 rounded-lg">
            <div>
              <div class="h-5 bg-gray-200 rounded w-48 mb-1"></div>
              <div class="h-4 bg-gray-200 rounded w-64"></div>
            </div>
            <div class="h-10 bg-gray-200 rounded-lg w-32"></div>
          </div>
        </div>

        <div v-else-if="errorVerifiedRanches"
          class="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertTriangle class="h-5 w-5" />
          <span>{{ errorVerifiedRanches }}</span>
        </div>

        <div v-else-if="verifiedRanches.length === 0" class="text-center py-10">
          <Shield class="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p class="text-brand-text-light">No verified ranches yet.</p>
        </div>

        <div v-else class="space-y-3">
          <div v-for="ranch in verifiedRanches" :key="ranch.pda"
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <div class="mb-3 sm:mb-0">
              <div class="flex items-center gap-2">
                <p class="font-semibold text-brand-text">{{ ranch.name }}</p>
                <CheckCircle class="h-4 w-4 text-green-600" />
              </div>
              <p class="text-xs text-brand-text-light font-mono" :title="ranch.pda">
                PDA: {{ ranch.pda.slice(0, 10) }}...{{ ranch.pda.slice(-8) }}
              </p>
              <p class="text-xs text-brand-text-light mt-1">Country: {{ ranch.country }}</p>
            </div>
            <button @click="promptUnverifyRanch(ranch.pda, ranch.name)" :disabled="unverifyingRanchPda === ranch.pda"
              class="button-danger w-full sm:w-auto">
              <Loader2 v-if="unverifyingRanchPda === ranch.pda" class="h-4 w-4 animate-spin" />
              <template v-else>
                <ShieldOff class="h-4 w-4" /> Unverify Ranch
              </template>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Verifiers Section -->
    <section class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div class="flex items-center gap-3">
          <UserCheck class="h-6 w-6 text-blue-500" />
          <h2 class="text-xl font-semibold text-brand-text">Verifier Management</h2>
        </div>
        <button @click="showRegisterForm = !showRegisterForm" class="button-secondary text-sm">
          <PlusCircle class="h-4 w-4" />
          <span>{{ showRegisterForm ? 'Cancel' : 'Register New Verifier' }}</span>
        </button>
      </div>

      <transition name="slide-fade">
        <div v-if="showRegisterForm"
          class="bg-gradient-to-r from-purple-50 to-cyan-50 p-5 rounded-lg border border-purple-200 mb-6 space-y-4">
          <h3 class="font-semibold text-brand-text flex items-center gap-2">
            <PlusCircle class="h-5 w-5 text-solana-purple" />
            New Verifier Details
          </h3>
          <div>
            <label for="verifierPubkey" class="block text-sm font-medium text-brand-text-light mb-1">Verifier Public
              Key</label>
            <input v-model="newVerifierPubkey" id="verifierPubkey" type="text"
              placeholder="Enter the user's wallet public key" class="input-field w-full" />
          </div>
          <div>
            <label for="verifierName" class="block text-sm font-medium text-brand-text-light mb-1">Verifier Name</label>
            <input v-model="newVerifierName" id="verifierName" type="text" placeholder="E.g., John Doe Verifications"
              class="input-field w-full" />
          </div>
          <div v-if="registerError"
            class="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-md border border-red-200">
            <AlertTriangle class="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{{ registerError }}</span>
          </div>
          <button @click="handleRegisterVerifier" :disabled="registeringVerifier"
            class="button-primary w-full sm:w-auto">
            <Loader2 v-if="registeringVerifier" class="h-4 w-4 animate-spin" />
            <span v-else>Submit Registration</span>
          </button>
        </div>
      </transition>

      <div v-if="loadingVerifiers" class="space-y-4 animate-pulse">
        <div v-for="i in 3" :key="`verifier-skel-${i}`" class="p-4 border border-gray-100 rounded-lg">
          <div class="h-5 bg-gray-200 rounded w-40 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-64"></div>
        </div>
      </div>

      <div v-else-if="errorVerifiers"
        class="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <AlertTriangle class="h-5 w-5" />
        <span>{{ errorVerifiers }}</span>
      </div>

      <div v-else-if="allVerifiers.length === 0" class="text-center py-10">
        <UserCheck class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-brand-text-light">No verifiers registered yet.</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Active Verifiers -->
        <div v-if="activeVerifiers.length > 0">
          <h3 class="text-sm font-semibold text-brand-text-light mb-3 flex items-center gap-2">
            <Power class="h-4 w-4 text-green-600" />
            Active Verifiers ({{ activeVerifiers.length }})
          </h3>
          <div class="space-y-3">
            <div v-for="verifier in activeVerifiers" :key="verifier.pda"
              class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <div class="mb-3 sm:mb-0">
                <div class="flex items-center gap-2">
                  <p class="font-semibold text-brand-text">{{ verifier.name }}</p>
                  <span class="px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">ACTIVE</span>
                </div>
                <p class="text-xs text-brand-text-light font-mono mt-1">
                  PDA: {{ verifier.pda }}
                </p>
              </div>
              <button @click="promptToggleVerifierStatus(verifier.pda, verifier.name, verifier.isActive)"
                :disabled="togglingVerifierPda === verifier.pda" class="button-warning w-full sm:w-auto">
                <Loader2 v-if="togglingVerifierPda === verifier.pda" class="h-4 w-4 animate-spin" />
                <template v-else>
                  <XCircle class="h-4 w-4" /> Deactivate
                </template>
              </button>
            </div>
          </div>
        </div>

        <!-- Inactive Verifiers -->
        <div v-if="inactiveVerifiers.length > 0">
          <h3 class="text-sm font-semibold text-brand-text-light mb-3 flex items-center gap-2">
            <XCircle class="h-4 w-4 text-gray-400" />
            Inactive Verifiers ({{ inactiveVerifiers.length }})
          </h3>
          <div class="space-y-3">
            <div v-for="verifier in inactiveVerifiers" :key="verifier.pda"
              class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors opacity-75">
              <div class="mb-3 sm:mb-0">
                <div class="flex items-center gap-2">
                  <p class="font-semibold text-brand-text">{{ verifier.name }}</p>
                  <span class="px-2 py-0.5 bg-gray-400 text-white text-xs font-medium rounded">INACTIVE</span>
                </div>
                <p class="text-xs text-brand-text-light font-mono mt-1">
                  PDA: {{ verifier.pda }}
                </p>
              </div>
              <button @click="promptToggleVerifierStatus(verifier.pda, verifiername, verifier.isActive)"
                :disabled="togglingVerifierPda === verifier.pda" class="button-success w-full sm:w-auto">
                <Loader2 v-if="togglingVerifierPda === verifier.pda" class="h-4 w-4 animate-spin" />
                <template v-else>
                  <CheckCircle class="h-4 w-4" /> Activate
                </template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- Modals -->
    <SuccessModal v-model="showSuccessModal" :message="successMessage" />
    <ErrorModal v-model="showErrorModal" :message="errorMessage" />
    <ConfirmModal v-model="showConfirmModal" :title="confirmModalConfig.title" :message="confirmModalConfig.message"
      :confirmText="confirmModalConfig.confirmText" :cancelText="confirmModalConfig.cancelText"
      :variant="confirmModalConfig.variant" @confirm="confirmModalConfig.onConfirm" />
  </div>
</template>
<style scoped>
.input-field {
  @apply block w-full border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-solana-purple focus:border-transparent transition text-sm;
}

.button-primary {
  @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-solana-purple to-solana-cyan text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-solana-purple focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
}

.button-secondary {
  @apply inline-flex items-center justify-center gap-2 bg-gray-100 text-brand-text-light px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed;
}

.button-success {
  @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30;
}

.button-danger {
  @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30;
}

.button-warning {
  @apply inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30;
}

/* Animations */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
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
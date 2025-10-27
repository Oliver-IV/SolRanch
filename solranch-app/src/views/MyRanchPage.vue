<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWallet } from 'solana-wallets-vue';
import { Transaction, Connection, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import api from '@/services/api';
import {
  Home, MapPin, CheckCircle, Clock, AlertTriangle, PlusCircle, Loader2,
  Hourglass, X, ShieldCheck, Calendar, Hash, Tag, Check, Send,
  Users,
  DollarSign,
  Trash2,
  ShieldOff,
  Edit,
  UserCheck,
} from 'lucide-vue-next';
import SuccessModal from '@/components/SuccessModal.vue';
import ErrorModal from '@/components/ErrorModal.vue';
import SetPriceModal from '@/components/SetPriceModal.vue';
import SetAllowedBuyerModal from '@/components/SetAllowedBuyerModal.vue';
import AnimalDetailsModal from '../components/AnimalDetailsModal.vue';

const router = useRouter();
const { publicKey, signTransaction } = useWallet();

const RPC_URL = 'http://127.0.0.1:8899';
const connection = new Connection(RPC_URL, 'confirmed');

const ranch = ref(null);
const animals = ref([]);
const pendingAnimals = ref([]);
const verifiers = ref([]);
const loadingRanch = ref(true);
const loadingAnimals = ref(false);
const loadingVerifiers = ref(false);
const errorRanch = ref(null);
const errorAnimals = ref(null);
const errorVerifiers = ref(null);
const deleting = ref(false);

const showRegisterModal = ref(false);
const registering = ref(false);
const registerError = ref(null);
const registerStep = ref('form');

const showSuccessModal = ref(false);
const successMessage = ref('');
const showErrorModal = ref(false);
const errorMessage = ref('');

const showConfirmDeleteModal = ref(false);
const animalToDelete = ref(null);
const deletingPda = ref(null);

// New state for set price and allowed buyer
const showSetPriceModal = ref(false);
const showSetAllowedBuyerModal = ref(false);
const selectedAnimal = ref(null);
const showDetailsModal = ref(false);

const animalForm = ref({
  id_chip: '',
  specie: '',
  breed: '',
  birth_date: '',
  verifier_pda: ''
});

const speciesOptions = [
  { value: 'Cattle', label: '🐄 Cattle' },
  { value: 'Horse', label: '🐴 Horse' },
  { value: 'Sheep', label: '🐑 Sheep' },
  { value: 'Goat', label: '🐐 Goat' },
  { value: 'Pig', label: '🐷 Pig' },
  { value: 'Chicken', label: '🐔 Chicken' },
];

const isFormValid = computed(() => {
  return animalForm.value.id_chip.trim() &&
    animalForm.value.specie &&
    animalForm.value.breed.trim() &&
    animalForm.value.birth_date &&
    animalForm.value.verifier_pda;
});

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

const fetchData = async () => {
  loadingRanch.value = true;
  errorRanch.value = null;
  animals.value = [];
  pendingAnimals.value = [];
  try {
    const ranchResponse = await api.ranches.getMy();
    ranch.value = ranchResponse.data;

    if (!ranch.value) {
      errorRanch.value = "No ranch profile found for this user.";
      loadingRanch.value = false;
      return;
    }
    const [confirmedResponse, pendingResponse] = await Promise.all([
      api.animals.getAll({
        ranchPda: ranch.value.pda,
        limit: 100
      }),
      api.animals.getPendingForRancher()
    ]);
    const allRanchAnimals = confirmedResponse.data.data || [];
    animals.value = allRanchAnimals.filter(animal => animal.isVerified === true);
    pendingAnimals.value = pendingResponse.data || [];

  } catch (err) {
    console.error('❌ Error fetching ranch data:', err);
    errorRanch.value = err.response?.data?.message || err.message || "Failed to load ranch data.";
  } finally {
    loadingRanch.value = false;
  }
};

const fetchVerifiers = async () => {
  loadingVerifiers.value = true;
  errorVerifiers.value = null;
  try {
    const response = await api.verifiers.getAll({ limit: 100 });
    verifiers.value = response.data.data || [];
    console.log('Verifiers loaded:', verifiers.value.length);
  } catch (err) {
    console.error('Error fetching verifiers:', err);
    errorVerifiers.value = err.response?.data?.message || err.message || "Failed to load verifiers.";
  } finally {
    loadingVerifiers.value = false;
  }
};

const openRegisterModal = () => {
  registerError.value = null;
  registerStep.value = 'form';
  animalForm.value = { id_chip: '', specie: '', breed: '', birth_date: '', verifier_pda: '' };
  showRegisterModal.value = true;
  if (verifiers.value.length === 0) {
    fetchVerifiers();
  }
};

const closeRegisterModal = async () => {
  showRegisterModal.value = false;
  registering.value = false;
  await fetchData();
};

const handleRegisterAnimal = async () => {
  if (!isFormValid.value || !publicKey.value || !signTransaction.value) return;
  registering.value = true;
  registerError.value = null;
  let animal_pda = '';
  let blockhashForConfirmation = null;

  try {
    const birthDateTimestamp = Math.floor(new Date(animalForm.value.birth_date).getTime() / 1000);
    registerStep.value = 'building';

    const buildResponse = await api.animals.buildRegisterTx({
      id_chip: animalForm.value.id_chip.trim(),
      specie: animalForm.value.specie,
      breed: animalForm.value.breed.trim(),
      birth_date: birthDateTimestamp,
      verifier_pda: animalForm.value.verifier_pda
    });

    const { transaction: builtTxBase64, animalPda: pdaFromBuild } = buildResponse.data;
    animal_pda = pdaFromBuild;
    registerStep.value = 'signing';

    blockhashForConfirmation = await connection.getLatestBlockhash('confirmed');
    const txBuffer = Buffer.from(builtTxBase64, 'base64');
    const tx = Transaction.from(txBuffer);
    tx.recentBlockhash = blockhashForConfirmation.blockhash;
    tx.lastValidBlockHeight = blockhashForConfirmation.lastValidBlockHeight;

    const signedTx = await signTransaction.value(tx);

    registerStep.value = 'sending-to-solana';
    const txid = await connection.sendRawTransaction(signedTx.serialize());

    registerStep.value = 'confirming-on-solana';
    const confirmationResult = await connection.confirmTransaction({
      signature: txid,
      blockhash: blockhashForConfirmation.blockhash,
      lastValidBlockHeight: blockhashForConfirmation.lastValidBlockHeight,
    }, 'confirmed');

    if (confirmationResult.value.err) {
      throw new Error(`Solana transaction confirmation failed: ${confirmationResult.value.err}`);
    }

    registerStep.value = 'confirming-backend';
    await api.animals.confirmRegistration({
      animal_pda: animal_pda,
      txid: txid,
      latestBlockhash: blockhashForConfirmation
    });
    registerStep.value = 'success';
    successMessage.value = `Animal "${animalForm.value.id_chip}" registered! Waiting for verifier approval.`;
    showSuccessModal.value = true;
    setTimeout(closeRegisterModal, 2000);

  } catch (err) {
    console.error('❌ Animal registration failed:', err);
    const apiError = err.response?.data?.message;
    const solanaError = err.message;
    errorMessage.value = apiError
      ? (Array.isArray(apiError) ? apiError.join(', ') : apiError)
      : solanaError || 'Failed to register animal.';
    showErrorModal.value = true;
    registerStep.value = 'form';
  } finally {
    registering.value = false;
  }
};

const handleDeletePending = (animal) => {
  animalToDelete.value = animal;
  showConfirmDeleteModal.value = true;
};

const closeConfirmDeleteModal = () => {
  showConfirmDeleteModal.value = false;
  animalToDelete.value = null;
};

const confirmDelete = async () => {
  if (!animalToDelete.value || !animalToDelete.value.pda) {
    errorMessage.value = "No se encontró el identificador del animal (PDA).";
    showErrorModal.value = true;
    return;
  }

  const pdaToDelete = animalToDelete.value.pda;
  deletingPda.value = pdaToDelete;
  deleting.value = true;
  closeConfirmDeleteModal();

  try {
    const buildResponse = await api.animals.buildCancelTx(pdaToDelete);
    const txBase64 = buildResponse.data.transaction || buildResponse.transaction;

    if (!txBase64) throw new Error("No transaction returned from buildCancelTx");

    const versionedTx = VersionedTransaction.deserialize(Buffer.from(txBase64, "base64"));

    if (!signTransaction.value) throw new Error("Wallet signTransaction not available");

    const signedTx = await signTransaction.value(versionedTx);

    const txid = await connection.sendRawTransaction(signedTx.serialize());

    const latestBlockhashForConfirm = await connection.getLatestBlockhash('confirmed');
    const confirmationResult = await connection.confirmTransaction({
      signature: txid,
      blockhash: latestBlockhashForConfirm.blockhash,
      lastValidBlockHeight: latestBlockhashForConfirm.lastValidBlockHeight
    }, 'confirmed');

    if (confirmationResult.value?.err) {
      throw new Error(`Solana cancel transaction confirmation failed: ${JSON.stringify(confirmationResult.value.err)}`);
    }

    await api.animals.confirmCancelTx(pdaToDelete, {
      animal_pda: pdaToDelete,
      txid: txid,
      latestBlockhash: latestBlockhashForConfirm
    });

    successMessage.value = `Pending registration for ${pdaToDelete.slice(0, 6)}... has been cancelled.`;
    showSuccessModal.value = true;

    await fetchData();

  } catch (err) {
    console.error("Error deleting pending animal:", err);
    const apiError = err.response?.data?.message;
    errorMessage.value = apiError
      ? (Array.isArray(apiError) ? apiError.join(', ') : apiError)
      : (err.message || 'Failed to delete pending registration.');
    showErrorModal.value = true;
  } finally {
    deletingPda.value = null;
    deleting.value = false;
  }
};

// New functions for set price and allowed buyer
const openSetPriceModal = (animal) => {
  selectedAnimal.value = animal;
  showSetPriceModal.value = true;
};

const openSetAllowedBuyerModal = (animal) => {
  selectedAnimal.value = animal;
  showSetAllowedBuyerModal.value = true;
};

const openDetailsModal = (animal) => {
  selectedAnimal.value = animal;
  showDetailsModal.value = true;
};

const handleSetPriceSuccess = async (message) => {
  successMessage.value = message;
  showSuccessModal.value = true;
  await fetchData();
};

const handleSetAllowedBuyerSuccess = async (message) => {
  successMessage.value = message;
  showSuccessModal.value = true;
  await fetchData();
};

onMounted(async () => {
  await fetchData();
  if (ranch.value) {
    await fetchVerifiers();
  }
});
</script>

<template>
  <div class="space-y-8">

    <section v-if="loadingRanch" class="animate-pulse">
      <div class="h-10 bg-gray-200 rounded w-64 mb-4"></div>
      <div class="h-6 bg-gray-200 rounded w-96"></div>
    </section>

    <section v-else-if="errorRanch" class="bg-red-50 border border-red-200 rounded-xl p-6">
      <div class="flex items-center gap-3 text-red-700">
        <AlertTriangle class="h-6 w-6" />
        <span class="font-medium">{{ errorRanch }}</span>
      </div>
    </section>

    <section v-else-if="ranch"
      class="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-2xl p-6 border border-purple-200">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold text-brand-text mb-2 flex items-center gap-3">
            <Home class="h-8 w-8 text-solana-purple" />
            {{ ranch.name }}
          </h1>
          <div class="flex flex-wrap gap-4 text-sm text-brand-text-light">
            <span class="flex items-center gap-1.5">
              <MapPin class="h-4 w-4" />
              {{ formatCountry(ranch.country) }}
            </span>
            <span class="flex items-center gap-1.5">
              <Calendar class="h-4 w-4" />
              Created {{ formatDate(ranch.createdAt) }}
            </span>
            <span class="flex items-center gap-1.5">
              <Users class="h-4 w-4" />
              {{ ranch.animalCount || 0 }} Animals
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
          :class="ranch.isVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'">
          <ShieldCheck v-if="ranch.isVerified" class="h-4 w-4" />
          <ShieldOff v-else class="h-4 w-4" />
          {{ ranch.isVerified ? 'Verified' : 'Pending Verification' }}
        </div>
      </div>
      <div class="bg-white/60 backdrop-blur rounded-lg p-3 text-xs font-mono text-brand-text-light">
        <span class="font-semibold">PDA:</span> {{ ranch.pda }}
      </div>
    </section>

    <section class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-brand-text flex items-center gap-2">
          <Users class="h-6 w-6 text-solana-purple" />
          My Animals
        </h2>
        <button @click="openRegisterModal" :disabled="!ranch?.isVerified" class="button-primary"
          :title="!ranch?.isVerified ? 'Ranch must be verified first' : ''">
          <PlusCircle class="h-5 w-5" />
          Register Animal
        </button>
      </div>

      <div v-if="!ranch?.isVerified" class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div class="flex items-start gap-3 text-orange-700">
          <AlertTriangle class="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium">Ranch Not Verified</p>
            <p class="text-sm text-orange-600 mt-1">Your ranch must be verified by an admin before you can register
              animals.</p>
          </div>
        </div>
      </div>

      <div v-if="loadingAnimals" class="space-y-4 animate-pulse">
        <div v-for="i in 3" :key="`skel-${i}`" class="border border-gray-200 rounded-lg p-4">
          <div class="h-5 bg-gray-200 rounded w-40 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-64"></div>
        </div>
      </div>

      <div v-else-if="errorAnimals" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center gap-3 text-red-700">
          <AlertTriangle class="h-5 w-5" />
          <span>{{ errorAnimals }}</span>
        </div>
      </div>

      <div v-else-if="animals.length === 0" class="text-center py-12">
        <Users class="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p class="text-brand-text-light text-lg mb-2">No animals registered yet</p>
        <p class="text-sm text-brand-text-light mb-4">Start building your herd by registering your first animal</p>
        <button @click="openRegisterModal" :disabled="!ranch?.isVerified" class="button-secondary">
          <PlusCircle class="h-4 w-4" />
          Register First Animal
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="animal in animals" :key="animal.pda" @click="openDetailsModal(animal)"
          class="border-2 border-gray-200 rounded-xl p-4 opacity-70 hover:opacity-100 hover:shadow-md transition-all cursor-pointer">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="font-bold text-brand-text text-lg">{{ animal.idChip }}</h3>
              <p class="text-sm text-brand-text-light">{{ animal.specie }} • {{ animal.breed }}</p>
            </div>
            <span v-if="animal.is_on_sale"
              class="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <DollarSign class="h-3 w-3" />
              For Sale
            </span>
          </div>

          <div class="space-y-2 text-xs text-brand-text-light mb-4">
            <div class="flex items-center gap-2">
              <Calendar class="h-3.5 w-3.5" />
              <span>Born: {{ formatDate(animal.birthDate) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle class="h-3.5 w-3.5" />
              <span class="font-mono">{{ animal.pda.slice(0, 8) }}...{{ animal.pda.slice(-6) }}</span>
            </div>
          </div>

          <div class="flex gap-2">
            <button @click.stop="openSetPriceModal(animal)"
              class="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-50 text-green-700 px-3 py-2 rounded-lg font-medium text-xs hover:bg-green-100 transition-colors"
              title="Set sale price">
              <DollarSign class="h-3.5 w-3.5" />
              Set Price
            </button>
            <button @click.stop="openSetAllowedBuyerModal(animal)"
              class="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-medium text-xs hover:bg-blue-100 transition-colors"
              title="Set allowed buyer">
              <UserCheck class="h-3.5 w-3.5" />
              Set Buyer
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="pendingAnimals.length > 0" class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-brand-text flex items-center gap-2">
          <Hourglass class="h-6 w-6 text-yellow-600" />
          Pending Verification ({{ pendingAnimals.length }})
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="animal in pendingAnimals" :key="animal.pda" @click="openDetailsModal(animal)"
          class="border-2 border-gray-200 rounded-xl p-4 hover:border-solana-purple hover:shadow-md transition-all cursor-pointer">

          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="font-bold text-brand-text text-lg">{{ animal.idChip }}</h3>
              <p class="text-sm text-brand-text-light">{{ animal.specie }} • {{ animal.breed }}</p>
            </div>

            <div class="flex items-center flex-shrink-0 gap-2">
              <span
                class="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                Pending
              </span>
              <button @click.stop="handleDeletePending(animal)" :disabled="deletingPda === animal.animalPda"
                class="text-red-500 hover:text-red-700 disabled:opacity-50 p-1 rounded-full hover:bg-red-100 transition-colors"
                title="Delete pending registration">
                <Loader2 v-if="deletingPda === animal.animalPda" class="h-4 w-4 animate-spin" />
                <Trash2 v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="space-y-2 text-xs text-brand-text-light">
            <div class="flex items-center gap-2">
              <Calendar class="h-3.5 w-3.5" />
              <span>Born: {{ formatDate(animal.birthDate) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle class="h-3.5 w-3.5" />
              <span class="font-mono">{{ animal.pda?.slice(0, 8) }}...{{ animal.pda?.slice(-6) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Register Animal Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showRegisterModal" @click="closeRegisterModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div @click.stop
            class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">

            <div class="sticky top-0 bg-gradient-to-r from-purple-50 to-cyan-50 p-6 border-b border-purple-200">
              <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-brand-text flex items-center gap-2">
                  <PlusCircle class="h-6 w-6 text-solana-purple" />
                  Register New Animal
                </h2>
                <button @click="closeRegisterModal" class="text-gray-400 hover:text-gray-600 transition-colors">
                  <X class="h-6 w-6" />
                </button>
              </div>
            </div>

            <form @submit.prevent="handleRegisterAnimal" class="p-6 space-y-5">
              <div>
                <label for="id_chip" class="block text-sm font-medium text-brand-text-light mb-1.5">
                  ID Chip / Tag Number *
                </label>
                <input v-model="animalForm.id_chip" id="id_chip" type="text" required maxlength="100"
                  placeholder="e.g., US123456789" class="input-field w-full" :disabled="registering" />
              </div>

              <div>
                <label for="specie" class="block text-sm font-medium text-brand-text-light mb-1.5">
                  Species *
                </label>
                <select v-model="animalForm.specie" id="specie" required class="select-field w-full"
                  :disabled="registering">
                  <option value="">Select Species</option>
                  <option v-for="option in speciesOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <div>
                <label for="breed" class="block text-sm font-medium text-brand-text-light mb-1.5">
                  Breed *
                </label>
                <input v-model="animalForm.breed" id="breed" type="text" required maxlength="30"
                  placeholder="e.g., Angus, Holstein, etc." class="input-field w-full" :disabled="registering" />
              </div>

              <div>
                <label for="birth_date" class="block text-sm font-medium text-brand-text-light mb-1.5">
                  Birth Date *
                </label>
                <input v-model="animalForm.birth_date" id="birth_date" type="date" required
                  :max="new Date().toISOString().split('T')[0]" class="input-field w-full" :disabled="registering" />
              </div>

              <div>
                <label for="verifier" class="block text-sm font-medium text-brand-text-light mb-1.5">
                  Verifier *
                </label>
                <select v-model="animalForm.verifier_pda" id="verifier" required class="select-field w-full"
                  :disabled="registering || loadingVerifiers">
                  <option value="">{{ loadingVerifiers ? 'Loading verifiers...' : 'Select Verifier' }}</option>
                  <option v-for="verifier in verifiers" :key="verifier.pda" :value="verifier.pda">
                    {{ verifier.name }}
                  </option>
                </select>
                <p class="text-xs text-brand-text-light mt-1">
                  The selected verifier will need to approve this registration
                </p>
              </div>

              <div v-if="registerError"
                class="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                <AlertTriangle class="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{{ registerError }}</span>
              </div>

              <div v-if="registering" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-center gap-3 text-blue-700 mb-2">
                  <Loader2 class="h-5 w-5 animate-spin" />
                  <span class="font-medium">
                    {{ registerStep === 'building' ? 'Building transaction...' :
                      registerStep === 'signing' ? 'Waiting for signature...' :
                        registerStep === 'sending-to-solana' ? 'Sending to network...' :
                          registerStep === 'confirming-on-solana' ? 'Confirming on network...' :
                            registerStep === 'confirming-backend' ? 'Finalizing registration...' :
                              registerStep === 'success' ? 'Success!' : 'Processing...' }}
                  </span>
                </div>
                <div class="flex gap-2">
                  <div class="flex-1 h-2 rounded-full"
                    :class="['building', 'signing', 'rancher-signed', 'success'].indexOf(registerStep) >= 0 ? 'bg-blue-500' : 'bg-gray-200'">
                  </div>
                  <div class="flex-1 h-2 rounded-full"
                    :class="['signing', 'rancher-signed', 'success'].indexOf(registerStep) >= 0 ? 'bg-blue-500' : 'bg-gray-200'">
                  </div>
                  <div class="flex-1 h-2 rounded-full"
                    :class="['rancher-signed', 'success'].indexOf(registerStep) >= 0 ? 'bg-blue-500' : 'bg-gray-200'">
                  </div>
                  <div class="flex-1 h-2 rounded-full"
                    :class="registerStep === 'success' ? 'bg-blue-500' : 'bg-gray-200'"></div>
                </div>
              </div>

              <div class="flex gap-3 pt-4">
                <button type="button" @click="closeRegisterModal" :disabled="registering"
                  class="button-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" :disabled="!isFormValid || registering" class="button-primary flex-1">
                  <Loader2 v-if="registering" class="h-5 w-5 animate-spin" />
                  <template v-else>
                    <Check class="h-5 w-5" />
                    Register Animal
                  </template>
                </button>
              </div>
            </form>
          </div>
        </div>
      </transition>
    </Teleport>
    <SuccessModal v-model="showSuccessModal" :message="successMessage" />
    <ErrorModal v-model="showErrorModal" :message="errorMessage" />
    <AnimalDetailsModal v-model="showDetailsModal" :animal="selectedAnimal" />
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showConfirmDeleteModal" @click="closeConfirmDeleteModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">

              <Trash2 class="h-8 w-8 text-red-600" />

            </div>
            <h3 class="text-xl font-bold text-center text-brand-text mb-2">Are you sure?</h3>
            <p class="text-center text-brand-text-light mb-6">
              Do you want to delete the pending registration for
              <strong class="font-mono">{{ animalToDelete?.idChip || animalToDelete?.pda?.slice(0, 6)
              }}</strong>?
            </p>
            <div class="flex gap-3">
              <button @click="closeConfirmDeleteModal" class="button-secondary flex-1">
                Cancel
              </button>
              <button @click="confirmDelete" :disabled="deleting"
                class="button-primary flex-1 bg-gradient-to-r from-red-500 to-red-600 focus:ring-red-400">
                <Loader2 v-if="deleting" class="h-5 w-5 animate-spin" />
                <span v-else>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <Teleport to="body">

      <SetPriceModal v-if="showSetPriceModal" :animal="selectedAnimal" @close="showSetPriceModal = false"
        @success="handleSetPriceSuccess" @error="(msg) => { errorMessage = msg; showErrorModal = true; }" />

    </Teleport>

    <Teleport to="body">

      <SetAllowedBuyerModal v-if="showSetAllowedBuyerModal" :animal="selectedAnimal"
        @close="showSetAllowedBuyerModal = false" @success="handleSetAllowedBuyerSuccess"
        @error="(msg) => { errorMessage = msg; showErrorModal = true; }" />

    </Teleport>
  </div>
</template>

<style scoped>
.input-field {
  @apply block w-full border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-solana-purple focus:border-transparent transition text-sm disabled:opacity-70 disabled:bg-gray-50;
}

.select-field {
  @apply block w-full border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-solana-purple focus:border-transparent transition text-sm appearance-none bg-white bg-no-repeat bg-right pr-10 disabled:opacity-70 disabled:bg-gray-50;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.7rem center;
  background-size: 1.1em 1.1em;
}

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
<script setup>
import { ref, onMounted, computed } from 'vue'
import { Search, Filter, X, ChevronLeft, ChevronRight, MapPin, DollarSign } from 'lucide-vue-next'
import api from '../services/api'
import AnimalCard from '../components/AnimalCard.vue'
import { convertUSDToLamports } from '../utils/solana-prices'

// --- Objeto Country (Valores en camelCase como en el backend) ---
const Country = {
  OTHER: 'other',
  UNITED_STATES: 'unitedStates',
  BRAZIL: 'brazil',
  ARGENTINA: 'argentina',
  MEXICO: 'mexico',
  CANADA: 'canada',
  COLOMBIA: 'colombia',
  URUGUAY: 'uruguay',
  PARAGUAY: 'paraguay',
  FRANCE: 'france',
  GERMANY: 'germany',
  UNITED_KINGDOM: 'unitedKingdom',
  IRELAND: 'ireland',
  SPAIN: 'spain',
  ITALY: 'italy',
  POLAND: 'poland',
  NETHERLANDS: 'netherlands',
  RUSSIA: 'russia',
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
}

const countryOptions = computed(() => {
  return Object.entries(Country).map(([key, value]) => ({
    value: value, 
    text: formatCountryName(value) 
  })).sort((a, b) => a.text.localeCompare(b.text)); 
});

const animals = ref([])
const loading = ref(true)
const filters = ref({
  specie: '',
  breed: '',
  country: '',
  minPriceUSD: '',
  maxPriceUSD: '',
  isOnSale: 'true',
})
const pagination = ref({
  page: 1,
  limit: 12,
  total: 0,
})

// --- Computed ---
const totalPages = computed(() => {
  if (pagination.value.total === 0) return 1;
  return Math.ceil(pagination.value.total / pagination.value.limit)
})

const paginationButtons = computed(() => {
  const total = totalPages.value;
  const current = pagination.value.page;
  const maxButtons = 5;
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  let start = Math.max(1, current - Math.floor(maxButtons / 2));
  let end = Math.min(total, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

// --- Methods ---
const fetchAnimals = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...(filters.value.specie.trim() && { specie: filters.value.specie.trim() }),
      ...(filters.value.breed.trim() && { breed: filters.value.breed.trim() }),
      ...(filters.value.country && { country: filters.value.country }),
      ...(filters.value.isOnSale !== 'all' && { isOnSale: filters.value.isOnSale === 'true' }),
    }

    // Convertir USD a lamports si hay precios
    if (filters.value.minPriceUSD) {
      const minLamports = await convertUSDToLamports(parseFloat(filters.value.minPriceUSD))
      if (minLamports) params.minPrice = minLamports
    }
    if (filters.value.maxPriceUSD) {
      const maxLamports = await convertUSDToLamports(parseFloat(filters.value.maxPriceUSD))
      if (maxLamports) params.maxPrice = maxLamports
    }

    const response = await api.animals.getAll(params)
    animals.value = response.data.data
    pagination.value.total = response.data.total
    pagination.value.page = response.data.page
    pagination.value.limit = response.data.limit
  } catch (error) {
    console.error('Error fetching animals:', error)
    animals.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  pagination.value.page = 1
  fetchAnimals()
}

const clearFilters = () => {
  filters.value = {
    specie: '',
    breed: '',
    country: '',
    minPriceUSD: '',
    maxPriceUSD: '',
    isOnSale: 'true',
  }
  applyFilters()
}

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value && page !== pagination.value.page) {
    pagination.value.page = page
    fetchAnimals()
  }
}

// --- Lifecycle ---
onMounted(() => {
  fetchAnimals()
})
</script>

<template>
  <div class="space-y-10 md:space-y-12">
    <section class="text-center space-y-3">
       <h1 class="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-solana-purple to-solana-cyan bg-clip-text text-transparent">
         Animal Marketplace 🐄
       </h1>
       <p class="text-lg text-brand-text-light max-w-2xl mx-auto">
         Explore, filter, and find verified animals on the Solana blockchain.
       </p>
    </section>

    <section class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <div class="flex items-center gap-2 mb-6">
        <Filter class="h-5 w-5 text-solana-purple" />
        <h2 class="text-xl font-semibold text-brand-text">Search Filters</h2>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5 items-end">

        <div class="col-span-1">
          <label for="species" class="block text-sm font-medium text-brand-text-light mb-1.5">Species</label>
          <input id="species" v-model="filters.specie" @keyup.enter="applyFilters" type="text" placeholder="E.g., Bovine" class="input-field" />
        </div>

        <div class="col-span-1">
          <label for="breed" class="block text-sm font-medium text-brand-text-light mb-1.5">Breed</label>
          <input id="breed" v-model="filters.breed" @keyup.enter="applyFilters" type="text" placeholder="E.g., Angus" class="input-field" />
        </div>

        <div class="col-span-1">
           <label for="country" class="block text-sm font-medium text-brand-text-light mb-1.5 flex items-center gap-1">
             <MapPin class="h-4 w-4 inline-block" /> Country
           </label>
           <select
             id="country"
             v-model="filters.country" class="select-field bg-white"
           >
             <option value="">All Countries</option>
             <option v-for="option in countryOptions" :key="option.value" :value="option.value">
               {{ option.text }}
             </option>
           </select>
         </div>

        <div class="col-span-1">
           <label for="saleStatus" class="block text-sm font-medium text-brand-text-light mb-1.5">Sale Status</label>
           <select id="saleStatus" v-model="filters.isOnSale" class="select-field bg-white">
             <option value="true">Only For Sale</option>
             <option value="all">All Animals</option>
             <option value="false">Not For Sale</option>
           </select>
         </div>

        <div class="col-span-1">
          <label for="min-price" class="block text-sm font-medium text-brand-text-light mb-1.5 flex items-center gap-1">
            <DollarSign class="h-4 w-4" /> Min Price (USD)
          </label>
          <input id="min-price" v-model="filters.minPriceUSD" @keyup.enter="applyFilters" type="number" min="0" step="1" placeholder="0" class="input-field" />
        </div>

        <div class="col-span-1">
          <label for="max-price" class="block text-sm font-medium text-brand-text-light mb-1.5 flex items-center gap-1">
            <DollarSign class="h-4 w-4" /> Max Price (USD)
          </label>
          <input id="max-price" v-model="filters.maxPriceUSD" @keyup.enter="applyFilters" type="number" min="0" step="1" placeholder="10000" class="input-field" />
        </div>

        <div class="col-span-full sm:col-span-2 lg:col-span-2 flex flex-col sm:flex-row gap-3 sm:items-end justify-end pt-4 sm:pt-0 lg:col-start-3 xl:col-start-auto xl:col-span-2">
          <button @click="clearFilters" class="button-secondary">
            <X class="h-4 w-4" /> Clear
          </button>
          <button @click="applyFilters" class="button-primary">
            <Search class="h-4 w-4" /> Search
          </button>
        </div>
      </div>
    </section>

    <section>
       <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
         <h2 class="text-2xl font-semibold text-brand-text mb-2 sm:mb-0">
           Available Animals <span v-if="!loading">({{ pagination.total }})</span>
         </h2>
         <span v-if="!loading && pagination.total > 0" class="text-sm text-brand-text-light whitespace-nowrap">
           Page {{ pagination.page }} of {{ totalPages }}
         </span>
       </div>
       <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
          <div v-for="i in pagination.limit" :key="`skel-${i}`" class="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div class="bg-gray-200 h-48 rounded-t-2xl"></div>
            <div class="p-5 space-y-4">
              <div class="h-5 bg-gray-200 rounded w-3/4"></div>
              <div class="h-4 bg-gray-200 rounded w-1/2"></div>
              <div class="h-10 bg-gray-200 rounded-xl mt-4"></div>
            </div>
          </div>
       </div>
       <div v-else-if="!loading && animals.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         <AnimalCard v-for="animal in animals" :key="animal.pda" :animal="animal"/>
       </div>
        <div v-else-if="!loading && animals.length === 0" class="text-center py-16 bg-white rounded-2xl shadow border border-gray-100">
           <div class="text-7xl mb-4 opacity-30">🐄</div>
          <h3 class="text-2xl font-semibold text-brand-text mb-2">No animals found</h3>
          <p class="text-brand-text-light max-w-xs mx-auto">Try adjusting your search filters or clearing some criteria.</p>
          <button @click="clearFilters" class="mt-6 text-solana-purple font-semibold hover:underline">
            Clear all filters
          </button>
        </div>
        <div v-if="!loading && totalPages > 1" class="mt-10 flex justify-center">
          <nav class="inline-flex rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <button @click="goToPage(pagination.page - 1)" :disabled="pagination.page === 1" class="pagination-button">
              <ChevronLeft class="h-5 w-5" />
            </button>
            <button v-for="page in paginationButtons" :key="page" @click="goToPage(page)" :class="['pagination-button', pagination.page === page ? 'pagination-button-active' : '']">
              {{ page }}
            </button>
            <button @click="goToPage(pagination.page + 1)" :disabled="pagination.page === totalPages" class="pagination-button">
               <ChevronRight class="h-5 w-5" />
            </button>
          </nav>
        </div>
    </section>
  </div>
</template>

<style scoped>
.input-field {
  @apply block w-full border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-solana-purple focus:border-transparent transition text-sm;
}
.select-field {
   @apply block w-full border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-solana-purple focus:border-transparent transition text-sm appearance-none bg-no-repeat bg-right pr-8;
   background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
   background-position: right 0.7rem center;
   background-size: 1.1em 1.1em;
}
.button-primary {
  @apply w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-solana-purple to-solana-cyan text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-solana-purple focus:ring-offset-2 order-1 sm:order-2 whitespace-nowrap;
}
.button-secondary {
  @apply w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-100 text-brand-text-light px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 order-2 sm:order-1 whitespace-nowrap;
}
.pagination-button {
   @apply px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-1 focus:ring-solana-purple focus:z-10 bg-white text-brand-text hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed;
}
.pagination-button-active {
   @apply bg-solana-purple text-white border-y border-solana-purple z-10 hover:bg-solana-purple;
}

.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
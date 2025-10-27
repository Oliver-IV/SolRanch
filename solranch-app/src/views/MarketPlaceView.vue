<script setup>
import { ref, onMounted, computed } from 'vue'
import { Search, Filter, X } from 'lucide-vue-next'
import api from '../services/api'
import AnimalCard from '../components/AnimalCard.vue'

const animals = ref([])
const loading = ref(true)
const filters = ref({
  specie: '',
  breed: '',
  minPrice: '',
  maxPrice: '',
  isOnSale: null,
})

const pagination = ref({
  page: 1,
  limit: 12,
  total: 0,
})

const lamportsPerSol = 1_000_000_000

const fetchAnimals = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...(filters.value.specie && { specie: filters.value.specie }),
      ...(filters.value.breed && { breed: filters.value.breed }),
      ...(filters.value.minPrice && { minPrice: parseFloat(filters.value.minPrice) * lamportsPerSol }),
      ...(filters.value.maxPrice && { maxPrice: parseFloat(filters.value.maxPrice) * lamportsPerSol }),
      ...(filters.value.isOnSale !== null && { isOnSale: filters.value.isOnSale }),
    }
    
    const response = await api.animals.getAll(params)
    animals.value = response.data.data
    pagination.value.total = response.data.total
  } catch (error) {
    console.error('Error fetching animals:', error)
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
    minPrice: '',
    maxPrice: '',
    isOnSale: null,
  }
  applyFilters()
}

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.limit))

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    pagination.value.page = page
    fetchAnimals()
  }
}

onMounted(() => {
  fetchAnimals()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <section class="text-center space-y-3">
      <h1 class="text-5xl font-bold bg-gradient-to-r from-solana-purple to-solana-cyan bg-clip-text text-transparent">
        Marketplace de Ganado
      </h1>
      <p class="text-lg text-brand-text-light max-w-2xl mx-auto">
        Explora, filtra y encuentra animales verificados en la blockchain de Solana
      </p>
    </section>

    <!-- Filters -->
    <section class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <div class="flex items-center gap-2 mb-5">
        <Filter class="h-5 w-5 text-solana-purple" />
        <h2 class="text-xl font-semibold text-brand-text">Filtros de Búsqueda</h2>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-brand-text-light mb-2">Especie</label>
          <input 
            v-model="filters.specie"
            type="text" 
            placeholder="Ej: Bovine"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-brand-text-light mb-2">Raza</label>
          <input 
            v-model="filters.breed"
            type="text" 
            placeholder="Ej: Angus"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-brand-text-light mb-2">Precio Mín (SOL)</label>
          <input 
            v-model="filters.minPrice"
            type="number" 
            step="0.1"
            placeholder="0"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-brand-text-light mb-2">Precio Máx (SOL)</label>
          <input 
            v-model="filters.maxPrice"
            type="number" 
            step="0.1"
            placeholder="10"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent transition"
          />
        </div>

        <div class="flex flex-col justify-end gap-2">
          <button 
            @click="applyFilters"
            class="flex items-center justify-center gap-2 bg-gradient-to-r from-solana-purple to-solana-cyan text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            <Search class="h-4 w-4" />
            Buscar
          </button>
          <button 
            @click="clearFilters"
            class="flex items-center justify-center gap-2 bg-gray-100 text-brand-text-light px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <X class="h-4 w-4" />
            Limpiar
          </button>
        </div>
      </div>
    </section>

    <!-- Results -->
    <section>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-semibold text-brand-text">
          Animales Disponibles
        </h2>
        <span class="text-sm text-brand-text-light">
          {{ animals.length }} de {{ pagination.total }} resultados
        </span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="bg-white rounded-2xl shadow-lg border border-gray-100 animate-pulse">
          <div class="bg-gray-200 h-48 rounded-t-2xl"></div>
          <div class="p-5 space-y-3">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            <div class="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Animals Grid -->
      <div v-else-if="animals.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimalCard 
          v-for="animal in animals" 
          :key="animal.pda" 
          :animal="animal" 
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <div class="text-6xl mb-4">🐄</div>
        <h3 class="text-2xl font-semibold text-brand-text mb-2">No hay animales disponibles</h3>
        <p class="text-brand-text-light">Intenta ajustar los filtros de búsqueda</p>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && animals.length > 0" class="mt-10 flex justify-center">
        <nav class="inline-flex rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <button
            @click="goToPage(pagination.page - 1)"
            :disabled="pagination.page === 1"
            class="px-4 py-2 bg-white text-brand-text-light hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Anterior
          </button>
          
          <button
            v-for="page in Math.min(totalPages, 5)"
            :key="page"
            @click="goToPage(page)"
            :class="[
              'px-4 py-2 transition',
              pagination.page === page
                ? 'bg-solana-purple text-white'
                : 'bg-white text-brand-text hover:bg-gray-50'
            ]"
          >
            {{ page }}
          </button>

          <button
            @click="goToPage(pagination.page + 1)"
            :disabled="pagination.page === totalPages"
            class="px-4 py-2 bg-white text-brand-text-light hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Siguiente
          </button>
        </nav>
      </div>
    </section>
  </div>
</template>

<style scoped>
.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
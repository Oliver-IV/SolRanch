<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Eye } from 'lucide-vue-next'
import { convertLamportsToUSD } from '../utils/solana-prices'
import { getSpeciesIcon } from "../utils/species" ;

const props = defineProps({
  animal: {
    type: Object,
    required: true,
  },
})

const router = useRouter()
const priceUSD = ref(null)
const loadingPrice = ref(true)

// Determine if the animal is for sale
const isForSale = computed(() => {
  return props.animal.salePrice && props.animal.salePrice !== '0' && BigInt(props.animal.salePrice) > 0n
})

// Load price on mount
onMounted(async () => {
  if (isForSale.value) {
    priceUSD.value = await convertLamportsToUSD(props.animal.salePrice)
  }
  loadingPrice.value = false
})

const viewDetails = () => {
  if (props.animal && props.animal.pda) {
    router.push(`/animal/${props.animal.pda}`)
  } else {
    console.error("Cannot navigate, animal PDA is missing:", props.animal);
  }
}
</script>

<template>
  <div
    class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 group cursor-pointer flex flex-col"
    @click="viewDetails"
  >
    <div class="bg-gradient-to-br from-gray-100 to-gray-200 h-48 flex items-center justify-center relative overflow-hidden">
      <div class="text-6xl opacity-20">{{  getSpeciesIcon(animal.specie)  }}</div>
      <div class="absolute top-3 right-3">
        <span v-if="isForSale" class="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          For Sale
        </span>
        <span v-else class="bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          Not for Sale
        </span>
      </div>
    </div>

    <div class="p-5 space-y-3 flex-grow flex flex-col justify-between">
       <div>
         <h3 class="text-base font-bold text-brand-text truncate group-hover:text-solana-purple transition-colors mb-1.5" :title="animal.idChip">
           {{ animal.idChip }}
         </h3>
         <div class="flex items-center justify-between text-xs text-brand-text-light">
           <div class="flex items-center gap-1">
             <span>{{ animal.specie }}</span>
           </div>
           <span class="font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600">{{ animal.breed }}</span>
         </div>
       </div>

       <div class="pt-3 border-t border-gray-100">
         <div class="min-h-[3rem] mb-3">
           <p v-if="loadingPrice && isForSale" class="text-sm text-brand-text-light italic">
             Loading price...
           </p>
           <p v-else-if="isForSale && priceUSD !== null" class="text-2xl font-bold text-green-600">
             ${{ priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
           </p>
           <p v-else-if="isForSale && priceUSD === null" class="text-sm text-orange-600 italic">
             Price unavailable
           </p>
           <p v-else class="text-sm text-brand-text-light italic pt-1">
             Price not set
           </p>
         </div>
         <button
           class="w-full flex items-center justify-center gap-2 bg-solana-purple text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-solana-purple-dark transition-colors focus:outline-none focus:ring-2 focus:ring-solana-purple focus:ring-offset-2"
         >
           <Eye class="h-4 w-4" />
           View Details
         </button>
       </div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BadgeCheck, Eye } from 'lucide-vue-next'

const props = defineProps({
  animal: {
    type: Object,
    required: true,
  },
})

const router = useRouter()

// Calculate price in SOL
const priceInSol = computed(() => {
  if (!props.animal.salePrice || props.animal.salePrice === '0') return null // Also check for "0"
  try {
    // Use Number for SOL conversion, BigInt might be overkill here
    const priceLamports = BigInt(props.animal.salePrice)
    const sol = Number(priceLamports) / 1_000_000_000;
    // Format nicely, handling potential floating point issues
    return sol.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 });
  } catch (e) {
    console.error("Error parsing salePrice:", props.animal.salePrice, e);
    return null; // Handle potential parsing errors
  }
})

// Determine if the animal is for sale based on priceInSol calculation
const isForSale = computed(() => priceInSol.value !== null)

const viewDetails = () => {
  // Check if animal and pda exist before navigating
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
      <div class="text-6xl opacity-20">🐄</div>
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
         <div class="min-h-[3rem] mb-3"> <p v-if="isForSale" class="text-2xl font-bold text-solana-cyan-dark">
             {{ priceInSol }} SOL
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
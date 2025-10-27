<script setup>
import { RouterLink } from 'vue-router'
import { useWallet } from 'solana-wallets-vue'
import { WalletIcon, ChevronDown, LogOut, Copy, Check, Home, ShieldCheck, UserCog, X } from 'lucide-vue-next'
import { ref, computed, watch } from 'vue'
import logo from '@/assets/logo.png'
import { useAuthStore } from '@/stores/auth'

const { select, wallets, publicKey, disconnect, connected, signMessage } = useWallet()
const showWalletModal = ref(false)
const showWalletMenu = ref(false)
const copied = ref(false)

const authStore = useAuthStore()

// Watch for wallet connection to trigger login
watch(connected, async (newValue, oldValue) => {
  // Only trigger login when connecting (not on initial load if already connected)
  if (newValue && !oldValue && publicKey.value && !authStore.isLoggedIn) {
    try {
      await authStore.login({
        connected: connected.value,
        publicKey: publicKey.value,
        signMessage: signMessage.value
      })
    } catch (error) {
      console.error('Auto-login failed:', error)
      // Optionally disconnect on login failure
      await disconnect()
    }
  }
})

const shortAddress = computed(() => {
  if (!publicKey.value) return ''
  const addr = publicKey.value.toBase58()
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
})

const connectWallet = (wallet) => {
  select(wallet.adapter.name)
  showWalletModal.value = false
}

const copyAddress = async () => {
  if (!publicKey.value) return
  await navigator.clipboard.writeText(publicKey.value.toBase58())
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

const handleDisconnect = async () => {
  try {
    await authStore.logout(disconnect)
  } catch (error) {
    console.error('Logout failed:', error)
    await disconnect()
  } finally {
    showWalletMenu.value = false
  }
}
</script>

<template>
  <header class="bg-white shadow-md sticky top-0 z-50 border-b border-gray-100">
    <div class="container mx-auto px-4 py-4 max-w-7xl">
      <div class="flex justify-between items-center">
        <RouterLink
          to="/"
          class="flex items-center space-x-3 text-2xl font-bold text-brand-text hover:opacity-80 transition-opacity"
        >
          <img :src="logo" alt="Solranch Logo" class="h-10 w-10 object-cover rounded-md" /> 
          <span class="bg-gradient-to-r from-solana-purple to-solana-cyan bg-clip-text text-transparent">
            SolRanch
          </span>
        </RouterLink>

        <nav class="hidden md:flex items-center space-x-6 lg:space-x-8"> 
          <RouterLink
            to="/"
            class="nav-link"
            active-class="nav-link-active"
          >
            Marketplace
          </RouterLink>

          <RouterLink
            v-if="authStore.isLoggedIn && authStore.hasRole('RANCHER')" 
            to="/my-ranch"
            class="nav-link"
            active-class="nav-link-active"
          >
             <Home class="h-4 w-4 inline-block mr-1 -mt-0.5" /> My Ranch
          </RouterLink>

          <RouterLink
            v-if="authStore.isLoggedIn && !authStore.hasRole('RANCHER')" to="/register-ranch"
            class="nav-link"
            active-class="nav-link-active"
           >
             Register Ranch
          </RouterLink>

          <RouterLink
            v-if="authStore.isLoggedIn && authStore.hasRole('VERIFIER')" 
            to="/verifier/dashboard" 
            class="nav-link"
            active-class="nav-link-active"
          >
            <ShieldCheck class="h-4 w-4 inline-block mr-1 -mt-0.5" /> Verifier Panel
          </RouterLink>

           <RouterLink
            v-if="authStore.isLoggedIn && authStore.isAdmin"
            to="/admin"
            class="nav-link"
            active-class="nav-link-active"
          >
            <UserCog class="h-4 w-4 inline-block mr-1 -mt-0.5" /> Admin Settings
          </RouterLink>

        </nav>

        <div class="relative">
          <button
            v-if="!connected"
            @click="showWalletModal = true"
            class="button-connect"
          >
            <WalletIcon class="h-5 w-5" />
            <span>Connect Wallet</span>
          </button>

          <button
            v-else
            @click="showWalletMenu = !showWalletMenu"
            class="button-connected"
          >
            <WalletIcon class="h-5 w-5" />
            <span class="hidden sm:inline">{{ shortAddress }}</span>
            <ChevronDown :class="['h-4 w-4 transition-transform duration-200', showWalletMenu ? 'rotate-180' : '']" />
          </button>

          <transition name="fade"> 
            <div
              v-if="connected && showWalletMenu"
              @click.stop
              class="dropdown-menu"
            >
              <div class="dropdown-header">
                <p class="text-xs text-brand-text-light mb-1">Connected Wallet</p>
                <p class="text-sm font-mono font-semibold text-brand-text break-all">
                  {{ publicKey?.toBase58() }}
                </p>
              </div>
              <div class="p-2">
                <button @click="copyAddress" class="dropdown-item group">
                   <Copy v-if="!copied" class="h-4 w-4 text-gray-400 group-hover:text-solana-purple transition-colors" />
                   <Check v-else class="h-4 w-4 text-green-500" />
                  <span>{{ copied ? 'Copied!' : 'Copy Address' }}</span>
                </button>
                <button @click="handleDisconnect" class="dropdown-item group text-red-600 hover:bg-red-50">
                   <LogOut class="h-4 w-4 text-red-400 group-hover:text-red-600 transition-colors" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>

  <Teleport to="body">
     <transition name="fade">
        <div
          v-if="showWalletModal"
          @click="showWalletModal = false"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            @click.stop
            class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in cursor-default"
          >
            <div class="p-5 border-b border-gray-100 flex justify-between items-center"> 
               <h2 class="text-xl font-bold text-brand-text">Connect Wallet</h2>
               <button @click="showWalletModal = false" class="text-gray-400 hover:text-gray-600">
                  <X class="h-5 w-5"/>
               </button>
            </div>

            <div class="p-4 space-y-2 max-h-[70vh] overflow-y-auto"> 
              <button
                v-for="wallet in wallets"
                :key="wallet.adapter.name"
                @click="connectWallet(wallet)"
                :disabled="wallet.readyState !== 'Installed'"
                class="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-solana-purple hover:bg-purple-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img :src="wallet.adapter.icon" :alt="wallet.adapter.name" class="h-8 w-8 rounded-lg"/>
                <div class="flex-1 text-left">
                  <p class="font-semibold text-brand-text group-hover:text-solana-purple transition-colors">
                    {{ wallet.adapter.name }}
                  </p>
                </div>
                <span v-if="wallet.readyState !== 'Installed'" class="text-xs text-orange-500 font-medium mr-2">Not Installed</span> 
                <ChevronDown class="h-5 w-5 text-brand-text-light group-hover:text-solana-purple -rotate-90 transition-all" />
              </button>
            </div>

            <div class="p-4 border-t border-gray-100 bg-gray-50">
              <p class="text-xs text-center text-brand-text-light">
                By connecting, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
     </transition>
  </Teleport>

  <div
    v-if="showWalletMenu"
    @click="showWalletMenu = false"
    class="fixed inset-0 z-40"
  ></div>
</template>

<style scoped>
.nav-link {
  @apply text-brand-text-light hover:text-solana-purple transition-colors font-medium relative py-1;
}
.nav-link::after {
   content: '';
   position: absolute;
   left: 0;
   bottom: -2px;
   width: 100%;
   height: 2px;
   background-color: theme('colors.solana-purple');
   transform: scaleX(0);
   transition: transform 0.2s ease-out;
   transform-origin: center;
}
.nav-link-active::after {
   transform: scaleX(1);
}
.nav-link-active {
   @apply text-solana-purple font-semibold;
}

.button-connect {
  @apply flex items-center gap-2 bg-gradient-to-r from-solana-purple to-solana-cyan text-white px-5 py-2 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-solana-purple/20 text-sm;
}
.button-connected {
  @apply flex items-center gap-2 bg-white border border-gray-200 text-brand-text-light px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm;
}

.dropdown-menu {
   @apply absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50;
}
.dropdown-header{
   @apply p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-cyan-50;
}
.dropdown-item {
   @apply w-full flex items-center gap-3 px-4 py-2.5 text-brand-text hover:bg-gray-50 rounded-lg transition-colors text-sm;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-scale-in {
  animation: scale-in 0.15s ease-out;
}
</style>
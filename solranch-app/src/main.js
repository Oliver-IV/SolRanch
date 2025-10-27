import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

import SolanaWallets from 'solana-wallets-vue'
import 'solana-wallets-vue/styles.css'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'

const walletOptions = {
  wallets: [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet }),
  ],
  autoConnect: true,
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(SolanaWallets, walletOptions)

app.mount('#app')
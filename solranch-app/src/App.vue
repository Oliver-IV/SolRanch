<script setup>
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import MainHeader from './components/MainHeader.vue';
import { WalletProvider } from '@solana/wallet-adapter-vue';
import { WalletModalProvider } from '@solana/wallet-adapter-vue-ui';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore(); 

onMounted(() => {
  authStore.fetchUserProfile();
});
</script>

<template>
  <WalletProvider>
    <WalletModalProvider>
      <div class="min-h-screen bg-brand-background font-sans antialiased text-brand-text">
        <MainHeader />
        <main class="container mx-auto px-4 py-8 lg:py-12">
          <RouterView />
        </main>
      </div>
    </WalletModalProvider>
  </WalletProvider>
</template>

<style>
body {
  margin: 0;
}
</style>
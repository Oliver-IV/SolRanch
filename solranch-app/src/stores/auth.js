import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import bs58 from 'bs58'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  const initialCheckDone = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const userRoles = computed(() => user.value?.roles || [])
  const userPubkey = computed(() => user.value?.pubkey || null)
  const isAdmin = computed(() => user.value?.isAdmin === true)

  const hasRole = (role) => {
    return userRoles.value.includes(role)
  }

  /**
   * Login - Pass wallet objects from the component
   * @param {Object} walletContext - { connected, publicKey, signMessage }
   */
  async function login(walletContext) {
    const { connected, publicKey, signMessage } = walletContext

    if (!connected || !publicKey || !signMessage) {
      console.error('Login attempt failed: Wallet not ready.')
      return
    }

    if (loading.value) return
    loading.value = true
    console.log('Starting login for:', publicKey.toBase58())

    try {
      const nonceResponse = await api.auth.requestNonce(publicKey.toBase58())
      const message = nonceResponse.data.message
      if (!message) throw new Error('Nonce message not received.')

      const messageBytes = new TextEncoder().encode(message)
      const signatureBytes = await signMessage(messageBytes)
      const signature = bs58.encode(signatureBytes)

      await api.auth.verifySignature(publicKey.toBase58(), signature)
      await fetchUserProfile()
      console.log('Login successful')
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message || error.message)
      user.value = null
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchUserProfile() {
    if (!initialCheckDone.value) loading.value = true

    try {
      const profileResponse = await api.auth.getProfile()
      user.value = profileResponse.data
      console.log('User profile fetched:', user.value)
    } catch (error) {
      console.log('Failed to fetch user profile:', error.response?.status)
      user.value = null
    } finally {
      if (!initialCheckDone.value) loading.value = false
      initialCheckDone.value = true
    }
  }

  /**
   * Logout - Pass disconnect function from the component
   * @param {Function} disconnectFn - The disconnect function from useWallet()
   */
  async function logout(disconnectFn) {
    loading.value = true

    try {
      await api.auth.logout()
      console.log('Logout successful (backend)')
    } catch (error) {
      console.error('Backend logout failed:', error.response?.data?.message || error.message)
    } finally {
      user.value = null

      if (disconnectFn) {
        try {
          await disconnectFn()
          console.log('Wallet disconnected')
        } catch (e) {
          console.error('Error disconnecting wallet:', e)
        }
      }

      loading.value = false
      console.log('Frontend logout complete')
    }
  }

  async function refreshAuth() {
    try {
      await api.auth.refreshToken();
      await fetchUserProfile();
      console.log('Auth refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      throw error;
    }
  }

  return {
    user,
    loading,
    initialCheckDone,
    isLoggedIn,
    userRoles,
    userPubkey,
    isAdmin,
    hasRole,
    login,
    logout,
    fetchUserProfile,
    refreshAuth
  }
})
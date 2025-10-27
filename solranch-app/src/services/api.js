import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('No autenticado')
    }
    return Promise.reject(error)
  }
)

export default {
  auth: {
    requestNonce(pubkey) {
      return api.post('/auth/login-request', { pubkey })
    },
    verifySignature(pubkey, signature) {
      return api.post('/auth/login-verify', { pubkey, signature })
    },
    getProfile() {
      return api.get('/auth/me')
    },
    refreshToken() {
      return api.post('/auth/refresh-token')
    },
    logout() {
      return api.post('/auth/logout')
    },
  },

  animals: {
    // Registration
    buildRegisterTx(data) {
      return api.post('/animal/build-tx', data)
    },
    confirmRegistration(data) {
      return api.post('/animal/confirm', data)
    },
    buildCancelTx(animalPda) {
      return api.post(`/animal/cancel-tx/${animalPda}/build`);
    },
    confirmCancelTx(animalPda, data) {
      return api.post(`/animal/cancel-tx/${animalPda}/confirm`, data);
    },
    buildRejectTx(animalPda) {
      return api.post(`/animal/reject-tx/${animalPda}/build`);
    },
    confirmRejectTx(animalPda, data) {
      return api.post(`/animal/reject-tx/${animalPda}/confirm`, data);
    },
    getPendingForMe() {
      return api.get('/animal/pending-for-me')
    },
    buildApproveTx(animalPda) {
      return api.get(`/animal/pending-tx/${animalPda}/build`);
    },
    confirmApproveTx(animalPda, data) {
      return api.post(`/animal/pending-tx/${animalPda}/confirm`, data);
    },
    buildSetPriceTx(animalPda, data) {
      return api.post(`/animal/${animalPda}/build-set-price`, data);
    },
    confirmSetPrice(animalPda, data) {
      return api.post(`/animal/${animalPda}/confirm-set-price`, data);
    },
    buildSetAllowedBuyerTx(animalPda, data) {
      return api.post(`/animal/${animalPda}/build-set-allowed-buyer`, data);
    },
    confirmSetAllowedBuyer(animalPda, data) {
      return api.post(`/animal/${animalPda}/confirm-set-allowed-buyer`, data);
    },
    buildPurchaseTx(animalPda) {
      return api.post(`/animal/${animalPda}/build-purchase`);
    },
    confirmPurchase(animalPda, data) {
      return api.post(`/animal/${animalPda}/confirm-purchase`, data);
    },
    getAll(params = {}) {
      return api.get('/animal', { params })
    },
    getById(pda) {
      return api.get(`/animal/${pda}`)
    },
    getPendingForRancher() {
      return api.get('/animal/pending/me');
    },
  },

  ranches: {
    getAll(params = {}) {
      return api.get('/ranch', { params })
    },
    getMy() {
      return api.get('/ranch/me')
    },
    buildRegisterTx(ranchData) { 
      return api.post('/ranch/build-tx', ranchData)
    },
    confirmRegistration(confirmData) {
      return api.post('/ranch/confirm', confirmData)
    },
    setVerification(pda, data) {
      return api.post(`/ranch/set-verification/${pda}`, data)
    },
  },

  verifiers: {
    getAll(params = {}) {
      return api.get('/verifiers', { params })
    },
    registerVerifier(verifierData) { 
      return api.post('/verifiers/register', verifierData)
    },
    getMyStatus() {
      return api.get('/verifiers/me') 
    },
    toggleStatus(pda) {
      return api.post(`/verifiers/toggle-status/${pda}`)
    },
  }
}
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import AdminPage from '../views/AdminPage.vue'
import { useAuthStore } from '@/stores/auth'
import RegisterRanchPage from '../views/RegisterRanchPage.vue'
import api from '@/services/api';
import MyRanchPage from '../views/MyRanchPage.vue'
import VerifierDashboard from '../views/VerifierDashboard.vue'

const requireAuth = async (to, from, next) => {
  const authStore = useAuthStore();
  if (!authStore.initialCheckDone) {
    await authStore.fetchUserProfile();
  }
  if (authStore.isLoggedIn) {
    next(); 
  } else {
    console.warn('Access denied (not logged in), redirecting to home.');
    next({ name: 'home' });
  }
};

const requireVerifier = async (to, from, next) => {
  const authStore = useAuthStore();
  if (!authStore.initialCheckDone) {
    await authStore.fetchUserProfile();
  }
  
  if (authStore.isLoggedIn && authStore.hasRole('VERIFIER')) {
    next(); 
  } else {
    console.warn('Access denied to /verifier/dashboard (not a verifier).');
    next({ name: 'home' });
  }
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminPage,
      beforeEnter: async (to, from, next) => {
        const authStore = useAuthStore();
        if (!authStore.initialCheckDone) {
          await authStore.fetchUserProfile();
        }
        if (authStore.isLoggedIn && authStore.isAdmin) {
          next();
        } else {
          console.warn('Access denied to /admin route.');
          next({ name: 'home' });
        }
      }
    },
    {
      path: '/register-ranch',
      name: 'register-ranch',
      component: RegisterRanchPage,
      beforeEnter: async (to, from, next) => {
        const authStore = useAuthStore();
        if (!authStore.initialCheckDone) {
          await authStore.fetchUserProfile();
        }
        if (!authStore.isLoggedIn) {
          next({ name: 'home' }); 
          return;
        }
        try {
          await api.ranches.getMy();
          console.log('User already has a ranch. Redirecting to My Ranch.');
          next({ name: 'my-ranch' });
        } catch (error) {
          if (error.response && error.response.status === 404) {
            console.log('User does not have a ranch. Allowing access to registration.');
            next(); 
          } else {
            console.error('Error checking for existing ranch:', error);
            next({ name: 'home' }); 
          }
        }
      }
    },
    {
      path: '/my-ranch',
      name: 'my-ranch',
      component: MyRanchPage,
      beforeEnter: requireAuth 
    },
    {
      path: '/verifier/dashboard',
      name: 'verifier-dashboard',
      component: VerifierDashboard,
      beforeEnter: requireVerifier 
    },
  ]
})


export default router
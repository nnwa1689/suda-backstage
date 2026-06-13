import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { layout: 'Auth' }
  },
  {
    path: '/',
    component: () => import('../layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '/',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/employees',
        name: 'EmployeeManagement',
        component: () => import('../views/EmployeeManagementView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/employees/create',
        name: 'EmployeeCreate',
        component: () => import('../views/EmployeeCreateView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/employees/:id/edit', // 新增員工編輯路由
        name: 'EmployeeEdit',
        component: () => import('../views/EmployeeEditView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/depts',
        name: 'DepartmentManagement',
        component: () => import('../views/DepartmentManagementView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/depts/create',
        name: 'DepartmentCreate',
        component: () => import('../views/DepartmentCreateView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/depts/:id/edit',
        name: 'DepartmentEdit',
        component: () => import('../views/DepartmentEditView.vue'),
        meta: { requiresAuth: true }
      },
      // ... 其他如排班、打卡的路由
    ]
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  
  // 如果要去的地方需要權限，且沒有 Token
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else {
    next();
  }
});
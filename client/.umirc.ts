import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '@umijs/max',
  },
  routes: [
    { path: '/', component: '@/pages/index', layout:false },
    { path: '/voters', component: '@/pages/VoteListPage', layout:false },
  ],
  npmClient: 'pnpm',
  proxy: {
    '/api': {
      'target': 'http://localhost:5000',
      'changeOrigin': true,
    },
  },
});


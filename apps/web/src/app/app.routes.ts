import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage), canActivate: [guestGuard] },
  { path: 'entrar', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage), canActivate: [guestGuard] },
  { path: 'registro', loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPage), canActivate: [guestGuard] },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
      { path: 'laberintos', loadComponent: () => import('./pages/mazes.page').then((m) => m.MazesPage) },
      { path: 'laberintos/:slug', loadComponent: () => import('./pages/maze-detail.page').then((m) => m.MazeDetailPage) },
      { path: 'checkout/:mazeId', loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPage), canActivate: [authGuard] },
      { path: 'confirmacion/:code', loadComponent: () => import('./pages/confirm.page').then((m) => m.ConfirmPage), canActivate: [authGuard] },
      { path: 'carrera/:code', loadComponent: () => import('./pages/public-run.page').then((m) => m.PublicRunPage) },
      { path: 'mis-carreras', loadComponent: () => import('./pages/my-runs.page').then((m) => m.MyRunsPage), canActivate: [authGuard] },
      { path: 'mis-carreras/:code', loadComponent: () => import('./pages/my-run-detail.page').then((m) => m.MyRunDetailPage), canActivate: [authGuard] },
      { path: 'clasificacion', loadComponent: () => import('./pages/leaderboard.page').then((m) => m.LeaderboardPage) },
      { path: 'staff', loadComponent: () => import('./pages/staff.page').then((m) => m.StaffPage), canActivate: [roleGuard(['staff', 'admin'])] },
      { path: 'admin', loadComponent: () => import('./pages/admin.page').then((m) => m.AdminPage), canActivate: [roleGuard(['admin'])] },
      { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage) },
    ],
  },
];

import { Router } from 'expo-router';

export const scootFoodFlow = [
  'ReminderCekResto',
  'FoodPilihLokasi',
  'FoodNotes',
  'FoodMenungguDriver',
  'FoodMendapatDriver',
  'FoodChat',
  'FoodValidasi',
  'FoodRating',
  'FoodBackHome',
];

type AnyRouter = { push: (arg: any) => void; replace?: (arg: any) => void; back?: () => void } | any;

export function navigateNext(router: AnyRouter, currentStep: string, params?: Record<string, any>) {
  const idx = scootFoodFlow.indexOf(currentStep);
  const next = idx >= 0 && idx < scootFoodFlow.length - 1 ? scootFoodFlow[idx + 1] : null;
  if (next) {
    router.push({ pathname: `/screens/customer/ScootFoodCustomer/${next}`, params } as any);
  } else {
    // reached end — go back to home
    if (router.replace) router.replace({ pathname: '/screens/customer/HomeCustomer' } as any);
    else router.push({ pathname: '/screens/customer/HomeCustomer' } as any);
  }
}

export function navigateTo(router: AnyRouter, step: string, params?: Record<string, any>) {
  if (scootFoodFlow.includes(step)) {
    router.push({ pathname: `/screens/customer/ScootFoodCustomer/${step}`, params } as any);
  } else if (step === 'Home') {
    if (router.replace) router.replace({ pathname: '/screens/customer/HomeCustomer' } as any);
    else router.push({ pathname: '/screens/customer/HomeCustomer' } as any);
  } else {
    router.push({ pathname: step, params } as any);
  }
}

export default {
  scootFoodFlow,
  navigateNext,
  navigateTo,
};

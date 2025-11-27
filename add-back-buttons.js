// Script untuk add back button ke semua screen

const screens = [
  'app/screens/driver/ScootFoodDriver/Daftar_Pesanan_ScootFood_On.tsx',
  'app/screens/driver/ScootSendDriver/Daftar_Pesanan_ScootSend_Off.tsx',
  'app/screens/driver/ScootSendDriver/Daftar_Pesanan_ScootSend_On.tsx',
  'app/screens/driver/ScootFoodDriver/Ambil_ScootFood.tsx',
  'app/screens/driver/ScootRideDriver/Ambil_ScootRide.tsx',
  'app/screens/driver/ScootSendDriver/Ambil_ScootSend.tsx',
  'app/screens/driver/ScootFoodDriver/Preview_Food.tsx',
  'app/screens/driver/ScootSendDriver/Preview_Send.tsx',
  'app/screens/driver/ScootFoodDriver/HalamanChat_Food_Driver.tsx',
  'app/screens/driver/ScootRideDriver/HalamanChat_Ride_Driver.tsx',
  'app/screens/driver/ScootSendDriver/HalamanChat_Send_Driver.tsx',
  'app/screens/driver/Riwayat_Driver.tsx',
  'app/screens/customer/TermsAndConditionCustomer.tsx',
];

console.log('Screens to update:', screens.length);
console.log('\nFiles:');
screens.forEach((screen, i) => {
  console.log(`${i+1}. ${screen}`);
});

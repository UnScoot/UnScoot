// Script untuk add back button ke semua screen
const fs = require('fs');
const path = require('path');

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

const backButtonCode = `          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

`;

const backButtonStyles = `  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 30,
    color: "#016837",
    fontWeight: "bold",
  },
`;

console.log('Screens to update:', screens.length);
console.log('\nFiles:');
screens.forEach((screen, i) => {
  console.log(`${i+1}. ${screen}`);
});

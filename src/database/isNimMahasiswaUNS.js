// Helper untuk validasi NIM mahasiswa_uns
import { supabase } from "./supabase";

/**
 * Cek apakah NIM terdaftar di mahasiswa_uns
 * @param {string} nim
 * @returns {Promise<boolean>}
 */
export async function isNimMahasiswaUNS(nim) {
  console.log("[isNimMahasiswaUNS] Checking NIM:", nim, "Type:", typeof nim);
  
  try {
    // Coba dengan string
    const nimString = String(nim);
    console.log("[isNimMahasiswaUNS] Querying with NIM as string:", nimString);
    
    const { data, error } = await supabase
      .from("mahasiswa_uns")
      .select("*")
      .eq("nim", nimString)
      .maybeSingle();
    
    console.log("[isNimMahasiswaUNS] Query result - Data:", data, "Error:", error);
    
    if (error) {
      console.error("[isNimMahasiswaUNS] Error checking mahasiswa_uns:", error);
      console.error("[isNimMahasiswaUNS] Error details:", JSON.stringify(error, null, 2));
      
      // Jika ada error, coba dengan query count sebagai fallback
      console.log("[isNimMahasiswaUNS] Trying fallback count query...");
      const { count, error: countError } = await supabase
        .from("mahasiswa_uns")
        .select("*", { count: 'exact', head: true })
        .eq("nim", nimString);
      
      console.log("[isNimMahasiswaUNS] Count result:", count, "Error:", countError);
      
      if (countError) {
        console.error("[isNimMahasiswaUNS] Error count mahasiswa_uns:", countError);
        return false;
      }
      
      return count > 0;
    }
    
    const result = !!data;
    console.log("[isNimMahasiswaUNS] Final result:", result);
    return result;
  } catch (e) {
    console.error("[isNimMahasiswaUNS] Exception checking NIM:", e);
    return false;
  }
}

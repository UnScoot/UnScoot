import { supabase } from "./supabase";

/**
 * Delete user account by email (from auth.users and profile table)
 * This calls the Edge Function to delete user with admin privileges
 */
export const deleteUserByEmail = async (email) => {
  try {
    console.log("[deleteUserByEmail] Attempting to delete user:", email);

    // Call Edge Function untuk delete user
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { email }
    });

    if (error) {
      console.error("[deleteUserByEmail] Edge Function error:", error);
      return { 
        success: false, 
        error: error.message || "Gagal menghapus user" 
      };
    }

    // Check response dari Edge Function
    if (data?.error) {
      console.error("[deleteUserByEmail] Server error:", data.error);
      return { 
        success: false, 
        error: data.error 
      };
    }

    if (data?.success) {
      console.log("[deleteUserByEmail] User deleted successfully:", data.userId);
      return { 
        success: true, 
        message: "Akun berhasil dihapus dari authentication dan database" 
      };
    }

    return { 
      success: false, 
      error: "Respons tidak valid dari server" 
    };

  } catch (error) {
    console.error("[deleteUserByEmail] Unexpected error:", error);
    return { 
      success: false, 
      error: error.message || "Terjadi kesalahan yang tidak terduga" 
    };
  }
};

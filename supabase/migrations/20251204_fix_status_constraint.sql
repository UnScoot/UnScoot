-- Drop constraint lama
ALTER TABLE scoot_ride 
DROP CONSTRAINT IF EXISTS scoot_ride_status_check;

-- Buat constraint baru dengan semua status yang valid
ALTER TABLE scoot_ride 
ADD CONSTRAINT scoot_ride_status_check 
CHECK (status IN ('pending', 'accepted', 'ongoing', 'completed', 'cancelled', 'rejected'));

-- Add comment
COMMENT ON COLUMN scoot_ride.status IS 'Status pesanan: pending (menunggu driver), accepted (driver terima), ongoing (dalam perjalanan), completed (selesai), cancelled (dibatalkan customer), rejected (ditolak driver)';

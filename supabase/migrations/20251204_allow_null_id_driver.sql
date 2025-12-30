-- Allow id_driver to be NULL initially (customer pesan dulu, driver terima nanti)
ALTER TABLE scoot_ride 
ALTER COLUMN id_driver DROP NOT NULL;

-- Add comment to explain why id_driver can be NULL
COMMENT ON COLUMN scoot_ride.id_driver IS 'Driver ID - NULL saat customer pesan, diisi saat driver terima pesanan';

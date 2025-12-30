-- Create chat_ride table for real-time chat between driver and customer

CREATE TABLE IF NOT EXISTS chat_ride (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_scoot_ride uuid NOT NULL REFERENCES scoot_ride(id) ON DELETE CASCADE,
  id_sender uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'driver')),
  message text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_chat_ride_order ON chat_ride(id_scoot_ride, timestamp);
CREATE INDEX idx_chat_ride_sender ON chat_ride(id_sender);

-- Enable RLS (Row Level Security)
ALTER TABLE chat_ride ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all messages for their orders
CREATE POLICY "Users can view chat messages"
ON chat_ride
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to insert messages
CREATE POLICY "Users can send messages"
ON chat_ride
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable Realtime for chat_ride table
-- NOTE: You need to enable this in Supabase Dashboard -> Database -> Replication
-- Turn ON the toggle for chat_ride table

COMMENT ON TABLE chat_ride IS 'Real-time chat messages between driver and customer for ScootRide orders';
COMMENT ON COLUMN chat_ride.sender_type IS 'Either customer or driver';
COMMENT ON COLUMN chat_ride.id_sender IS 'UUID of the sender (either customer.id or driver.id)';

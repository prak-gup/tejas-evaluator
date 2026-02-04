
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pcoiccfqieeubadewoco.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb2ljY2ZxaWVldWJhZGV3b2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODU3MzMsImV4cCI6MjA4NTY2MTczM30.mtta1SyhylEct5-1FloR6LZyc_6AsNhXskJ6ROKrRYI'

export const supabase = createClient(supabaseUrl, supabaseKey)

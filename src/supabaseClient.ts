import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nlztcbltrxatqxjgjuvq.supabase.co'
const supabaseAnonKey = 'sb_publishable_DSxSsHtsPKTriTRFBcIdWQ_ZBPEqldh'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
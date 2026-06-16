import { createClient } from "@supabase/supabase-js";

const supabaseUrl1 = "https://ezmidzyehjizliqstany.supabase.co";
const supabaseAnonKey1 = "sb_publishable_snReGDuOEY5rUQ3cuMJ2ZA_bhVtZFr5";
export const supabase_one = createClient(supabaseUrl1, supabaseAnonKey1);

const supabaseUrl2 = "https://nrgpdrsdvahjrrqosdnb.supabase.co";
const supabaseKey2 = "sb_publishable_9r2IvVl_wKPVpLg1gP_ivA_g8tGuTEh";
export const supabase_two = createClient(supabaseUrl2, supabaseKey2);

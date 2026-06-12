import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ezmidzyehjizliqstany.supabase.co";
const supabaseAnonKey = "sb_publishable_snReGDuOEY5rUQ3cuMJ2ZA_bhVtZFr5";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

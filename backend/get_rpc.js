import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRpcSort() {
  const { data, error } = await supabase.rpc('hospitals_within_radius', {
    lat: 27.2, lng: 31.1, radius: 50000, p_limit: 50
  });
  
  if (error) {
    console.error("RPC Error:", error);
    return;
  }
  
  console.log(`Total returned: ${data.length}`);
  
  const distances = data.map(d => ({ name: d.name, distance: d.distance }));
  console.log("Returned Ordering:");
  distances.slice(0, 10).forEach((d, i) => {
    console.log(`${i+1}. ${d.name} -> ${d.distance}`);
  });
  
  let isSorted = true;
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].distance > data[i+1].distance) {
      isSorted = false;
      break;
    }
  }
  console.log("Is the API returning STRICTLY SORTED data? :", isSorted ? "YES" : "NO");
}

checkRpcSort().catch(console.error);

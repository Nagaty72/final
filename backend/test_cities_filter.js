import axios from 'axios';

async function testFilter() {
  try {
    // 1. Test All Facilities
    const resAll = await axios.get('http://localhost:5001/api/v1/public/hospitals?limit=100');
    console.log("ALL:", resAll.data.data.length);

    // 2. Test specific city filter
    const resCairo = await axios.get('http://localhost:5001/api/v1/public/hospitals?city=Cairo&limit=100');
    console.log("CAIRO ONLY:", resCairo.data.data.length);
    
    // 3. Test Assiut city filter
    const resAssiut = await axios.get('http://localhost:5001/api/v1/public/hospitals?city=Assiut&limit=100');
    console.log("ASSIUT ONLY:", resAssiut.data.data.length);
    if (resAssiut.data.data.length > 0) {
       console.log("Assiut sample:", resAssiut.data.data[0].city);
    }

  } catch (e) {
    console.error("Error:", e.message);
  }
}
testFilter();

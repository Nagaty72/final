// Using native Node 20 fetch

async function simulateDashboard() {
  const baseUrl = 'http://localhost:5001/api/v1/analytics';

  console.log('--- STARTING DASHBOARD SIMULATION ---');

  const requests = [
    // KpiCards
    fetch(`${baseUrl}/kpis`),
    fetch(`${baseUrl}/trends`),
    
    // ExecutiveSummary
    fetch(`${baseUrl}/kpis`),
    fetch(`${baseUrl}/trends`),
    fetch(`${baseUrl}/disease-breakdown`),
    
    // TrendsChart
    fetch(`${baseUrl}/trends`),
    
    // DiseaseBreakdown
    fetch(`${baseUrl}/disease-breakdown`),
    
    // DiseaseTrendChart
    fetch(`${baseUrl}/trends`),
    fetch(`${baseUrl}/disease-breakdown`), // fallback logic calls it
    
    // SeverityChart
    fetch(`${baseUrl}/severity`),
  ];

  await Promise.allSettled(requests);
  
  console.log('--- END OF DASHBOARD SIMULATION ---');
}

simulateDashboard();

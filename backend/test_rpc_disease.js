import { AnalyticsRepository } from './src/repositories/analytics.repository.js';

async function test() {
  console.log("Testing COVID-19:");
  let data1 = await AnalyticsRepository.getKpis({ disease: ['0fa9990d-4ead-447e-9ed5-a55829925f21'] });
  console.log(data1);

  console.log("Testing Diabetes:");
  let data2 = await AnalyticsRepository.getKpis({ disease: ['41e9f5b2-be64-43e1-ad20-5a205ec9bfb9'] });
  console.log(data2);

  console.log("Testing Hypertension:");
  let data3 = await AnalyticsRepository.getKpis({ disease: ['38e88d0b-58f9-44c9-acda-850c5e6b13d7'] });
  console.log(data3);

  process.exit(0);
}

test().catch(console.error);

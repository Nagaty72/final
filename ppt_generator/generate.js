const pptxgen = require('pptxgenjs');

let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';

pres.defineSlideMaster({
  title: 'MASTER_SLIDE',
  background: { color: 'F1F5F9' },
  objects: [
    { rect: { x: 0, y: 0, w: '100%', h: 0.75, fill: { color: '2563EB' } } },
    { text: { text: 'Epicare: AI-Powered Healthcare Intelligence Platform', options: { x: 0.2, y: 0.15, w: 8, h: 0.5, color: 'FFFFFF', fontSize: 16, bold: true } } },
    { rect: { x: 0, y: 5.3, w: '100%', h: 0.3, fill: { color: '0F172A' } } },
    { text: { text: 'Epicare Presentation • 2026', options: { x: 0.2, y: 5.35, w: 5, h: 0.2, color: 'FFFFFF', fontSize: 10 } } },
  ],
  slideNumber: { x: 9.5, y: 5.35, color: 'FFFFFF', fontSize: 10 }
});

pres.defineSlideMaster({
  title: 'TITLE_SLIDE',
  background: { color: '0F172A' },
  objects: [
    { rect: { x: 0, y: 3, w: '100%', h: 2.625, fill: { color: '1E293B' } } }
  ]
});

const addSlide = (title, bulletPoints, notes, speaker) => {
  let slide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
  slide.addText(title, { x: 0.5, y: 1.0, w: 9, h: 0.6, fontSize: 32, bold: true, color: '0F172A' });
  
  let textObjects = bulletPoints.map(bp => {
    if (typeof bp === 'string') {
        return { text: bp, options: { bullet: { type: 'number' }, color: '334155', fontSize: 18, breakLine: true } };
    }
    return { text: bp.text, options: { bullet: bp.bullet !== false, color: bp.color || '334155', fontSize: bp.size || 18, bold: bp.bold || false, breakLine: true, indentLevel: bp.indent || 0 } };
  });

  slide.addText(textObjects, { x: 0.5, y: 1.8, w: 8.5, h: 3.2, align: 'left', valign: 'top' });
  
  if (speaker) {
      slide.addText(`Speaker: ${speaker}`, { x: 8.0, y: 1.0, w: 2, h: 0.5, color: '2563EB', fontSize: 14, italic: true, align: 'right' });
  }

  if (notes) {
      slide.addNotes(notes);
  }
}

// 1
let s1 = pres.addSlide({ masterName: 'TITLE_SLIDE' });
s1.addText('Epicare', { x: 0, y: 1.5, w: '100%', align: 'center', color: '3B82F6', fontSize: 64, bold: true });
s1.addText('AI-Powered Healthcare Intelligence Platform\nBridging the Gap Between Real-time Data and Public Health Policy in Egypt', { x: 0, y: 2.8, w: '100%', align: 'center', color: 'F8FAFC', fontSize: 20 });
s1.addText('Graduation Project Defense', { x: 0, y: 4.5, w: '100%', align: 'center', color: '94A3B8', fontSize: 16 });
s1.addNotes('Good morning, respected panel and guests. We are proud to present Epicare, our graduation project. Epicare is an AI-Powered Healthcare Intelligence Platform designed to transform how public health data is monitored and acted upon in Egypt.');

// 2
addSlide('What is Epicare?', [
  { text: 'Core Concept:', bold: true },
  { text: 'A distributed intelligence system for healthcare decision-makers.', indent: 1 },
  { text: 'Pillars:', bold: true },
  { text: 'Epidemiological tracking, hospital resource management, spatial visualization, and conversational AI.', indent: 1 },
  { text: 'Target Audience:', bold: true },
  { text: 'Ministry of Health officials, epidemiologists, and hospital administrators.', indent: 1 }
], 'Epicare is a comprehensive intelligence system. Our goal is to empower Egyptian healthcare decision-makers by providing real-time epidemiological tracking, dynamic resource management, and AI-driven conversational analytics.', 'Presenter 1');

// 3
addSlide('Presentation Outline', [
  { text: '1. Context & Problem Definition', bullet: false },
  { text: '2. Policy Analysis & Research', bullet: false },
  { text: '3. Technical Architecture & Workflow', bullet: false },
  { text: '4. Advanced Modules & Future Outlook', bullet: false }
], 'Today, we will take you through a structured journey. First, defining the public health problem. Next, analyzing policy alternatives. Then, diving into the core technical architecture and workflows, and finally showcasing our GIS and AI modules.', 'Presenter 1');

// 4
addSlide('The Problem: Fragmented & Reactive Healthcare', [
  { text: 'Fragmented Data:', bold: true },
  { text: 'Siloed databases prevent a unified view of health crises.', indent: 1 },
  { text: 'Reactive Surveillance:', bold: true },
  { text: 'Manual reporting latency causes delayed responses to outbreaks.', indent: 1 },
  { text: 'Resource Mismanagement:', bold: true },
  { text: 'Inability to track dynamic hospital capacity leads to overwhelmed infrastructure.', indent: 1 }
], 'The Egyptian healthcare system currently faces a critical data bottleneck. Data is siloed, and surveillance is reactive. When an outbreak occurs, resource allocation—such as routing patients to available ICU beds—becomes dangerously inefficient due to reporting latency.', 'Presenter 1');

// 5
addSlide('Our Research Question', [
  { text: 'How can the integration of artificial intelligence, geographic information systems (GIS), and real-time data analytics optimize disease surveillance, improve resource allocation, and enhance data-driven healthcare policy making in Egypt?', bold: true, size: 22, color: '2563EB', bullet: false }
], 'This brings us to our core research question: How can we leverage modern technologies—specifically AI, GIS, and real-time data aggregation—to shift our public health strategy from a reactive model to a proactive, predictive one?', 'Presenter 1');

// 6
addSlide('Why Epicare Matters', [
  { text: 'Public Health:', bold: true },
  { text: 'Enables early detection and rapid containment of infectious diseases.', indent: 1 },
  { text: 'Economic:', bold: true },
  { text: 'Optimizes hospital bed utilization, reducing operational waste.', indent: 1 },
  { text: 'Strategic:', bold: true },
  { text: 'Replaces intuition-based policy with empirical, real-time governance.', indent: 1 }
], 'Epicare\'s importance spans three domains. Publicly, it saves lives through rapid outbreak containment. Economically, it prevents the collapse of hospital infrastructure. Strategically, it provides the empirical data needed for evidence-based policy making.', 'Presenter 1');

// 7
addSlide('Project Objectives', [
  { text: 'Policy Objectives:', bold: true, color: '2563EB' },
  { text: 'Improve healthcare governance', indent: 1 },
  { text: 'Support evidence-based decision making', indent: 1 },
  { text: 'Enhance disease surveillance', indent: 1 },
  { text: 'Improve healthcare resource allocation', indent: 1 },
  { text: 'Technical Objectives:', bold: true, color: '2563EB' },
  { text: 'Build a healthcare analytics platform', indent: 1 },
  { text: 'Implement GIS-based healthcare mapping', indent: 1 },
  { text: 'Develop AI-assisted healthcare analytics', indent: 1 },
  { text: 'Support intelligent patient routing', indent: 1 },
  { text: 'Enable real-time healthcare monitoring', indent: 1 }
], 'Our project aims to achieve clear policy and technical objectives. From a policy standpoint, we focus on improving governance and evidence-based decision-making. Technically, we set out to build a highly available platform with GIS mapping, AI analytics, and real-time monitoring capabilities.', 'Presenter 1');

// 8
addSlide('Literature Review: Evolution of Surveillance', [
  { text: 'Traditional Models:', bold: true },
  { text: 'Manual epidemiological reports with high latency.', indent: 1 },
  { text: 'Spatial Epidemiology (GIS):', bold: true },
  { text: 'Proven success in localized mapping, but often static.', indent: 1 },
  { text: 'AI in Healthcare:', bold: true },
  { text: 'LLMs are democratizing data access, translating complex queries into actionable insights.', indent: 1 }
], 'Our literature review highlighted a clear evolution. Traditional surveillance relies on slow reporting. GIS advanced spatial mapping but is often static. Recently, Large Language Models have shown immense potential in democratizing data, allowing non-technical users to query complex databases.', 'Presenter 2');

// 9
addSlide('Case Studies & Context', [
  { text: 'Global Precedent:', bold: true },
  { text: 'John Hopkins COVID-19 Dashboard (Proven necessity of real-time spatial data).', indent: 1 },
  { text: 'Regional Context:', bold: true },
  { text: 'Egypt\'s "100 Million Healthy Lives" campaign.', indent: 1 },
  { text: 'Proven capability for mass data collection, but highlighted the need for unified, real-time analytics.', indent: 2 }
], 'The John Hopkins COVID-19 Dashboard set the global standard for spatial tracking. Locally, Egypt\'s 100 Million Healthy Lives campaign proved that mass health data collection is possible, but exposed the lack of a unified, real-time analytics platform to visualize that data dynamically.', 'Presenter 2');

// 10
addSlide('Benefits of Real-Time Analytics', [
  { text: 'Faster outbreak monitoring', bullet: true },
  { text: 'Improved healthcare visibility', bullet: true },
  { text: 'Better resource allocation', bullet: true },
  { text: 'Reduced decision-making delays', bullet: true },
  { text: 'Enhanced situational awareness', bullet: true },
  { text: 'Improved healthcare planning', bullet: true }
], 'Unlike legacy systems that suffer from reporting delays, Epicare\'s real-time analytics provide immediate visibility. This allows for faster outbreak monitoring, dynamic resource allocation, and significantly reduced delays in critical public health decision-making.', 'Presenter 2');

// 11
addSlide('Evaluating Policy Alternatives', [
  { text: 'Alternative A (Status Quo):', bold: true },
  { text: 'Fragmented, siloed legacy systems.', indent: 1 },
  { text: 'Alternative B (Centralized DB):', bold: true },
  { text: 'Unified data warehouse. Requires technical analysts to write SQL reports.', indent: 1 },
  { text: 'Alternative C (Epicare):', bold: true },
  { text: 'Integrated GIS & AI platform. Real-time, spatial, and accessible via natural language.', indent: 1 }
], 'Policymakers have three alternatives. A: Maintain the fragmented status quo. B: Build a centralized data warehouse, which solves data silos but requires technical analysts for every report. C: Implement an integrated platform like Epicare, equipped with accessible AI and GIS.', 'Presenter 2');

// 12
addSlide('Alternative Evaluation Matrix', [
  { text: 'Evaluation Criteria:', bold: true },
  { text: 'Cost, Implementation Speed, Real-time Capability, and User Accessibility.', indent: 1 },
  { text: 'A: Low Cost, Poor Real-time, Low Accessibility.', bold: false },
  { text: 'B: Medium Cost, Moderate Real-time, Low Accessibility.', bold: false },
  { text: 'C (Epicare): Moderate/High Initial Cost, Excellent Real-time, High Accessibility.', bold: true, color: '059669' }
], 'Evaluating these via our matrix, Alternative A is ineffective. Alternative B improves data consolidation but fails on accessibility. Epicare requires a modern infrastructure investment but scores highest in real-time capability and non-technical accessibility.', 'Presenter 2');

// 13
addSlide('The Solution: Epicare (Alternative C)', [
  { text: 'Democratizes data access for non-technical officials.', bullet: true },
  { text: 'Provides critical spatial context for epidemiological response.', bullet: true },
  { text: 'Highly scalable cloud-native architecture.', bullet: true }
], 'We selected Epicare. It democratizes data. An official can simply ask our AI about ICU capacity and get an instant answer, backed by real-time spatial mapping. It bridges the gap between raw data and immediate policy action.', 'Presenter 2');

// 14
addSlide('From Policy to Engineering', [
  { text: 'Paradigm:', bold: true },
  { text: 'Modern, distributed microservices architecture.', indent: 1 },
  { text: 'Core Stack:', bold: true },
  { text: 'Frontend: Next.js (React)', indent: 1 },
  { text: 'Backend API: Node.js / Express', indent: 1 },
  { text: 'Database: Supabase (PostgreSQL + PostGIS)', indent: 1 },
  { text: 'AI Service: FastAPI / Google Gemini', indent: 1 }
], 'To realize this policy goal, we engineered a distributed, cloud-native architecture. We decoupled our system into a Next.js frontend, an Express backend, a robust PostgreSQL database hosted on Supabase, and a dedicated FastAPI microservice for our AI.', 'Presenter 3');

// 15
addSlide('High-Level System Architecture', [
  { text: 'Distributed system composed of 4 main tiers:', bullet: false },
  { text: '1. Client Browser interacts with Express API Gateway.', bullet: true },
  { text: '2. Secure stateless JWT authentication flow.', bullet: true },
  { text: '3. Express securely queries the Supabase DB.', bullet: true },
  { text: '4. AI requests are proxied to the FastAPI Intent-Based Routing wrapper.', bullet: true }
], 'This is our high-level architecture. The client interacts with our Express API gateway, which handles JWT authentication statelessly. The backend securely queries our Supabase database. When AI analytics are requested, the backend proxies data to our dedicated FastAPI wrapper.', 'Presenter 3');

// 16
addSlide('Frontend Architecture', [
  { text: 'Framework:', bold: true },
  { text: 'Next.js (App Router) for SEO and server-side rendering performance.', indent: 1 },
  { text: 'State Management:', bold: true },
  { text: 'Zustand for lightweight, scalable client state.', indent: 1 },
  { text: 'Styling:', bold: true },
  { text: 'Tailwind CSS with a custom Glassmorphism design system supporting Light/Dark modes.', indent: 1 }
], 'Our frontend is built on the Next.js App Router for high performance. We utilize Zustand for agile state management. Visually, we implemented a custom, highly accessible glassmorphism design system using Tailwind CSS, ensuring readability across both dark and light modes.', 'Presenter 3');

// 17
addSlide('Backend Architecture', [
  { text: 'API Design:', bold: true },
  { text: 'RESTful API utilizing Express.js.', indent: 1 },
  { text: 'Security:', bold: true },
  { text: 'Middleware enforcing strict Role-Based Access Control (RBAC).', indent: 1 },
  { text: 'Data Integrity:', bold: true },
  { text: 'Express controllers interface with Repositories to ensure separation of concerns.', indent: 1 },
  { text: 'Task Management:', bold: true },
  { text: 'Database-driven job queuing architecture for background analytics.', indent: 1 }
], 'Our backend serves as a secure REST API using Node.js. We utilize a strict Controller-Service-Repository pattern. We enforce Role-Based Access Control natively through middleware. We also implemented a database-driven job table architecture to handle background analytics securely.', 'Presenter 3');

// 18
addSlide('Database Design', [
  { text: 'Core Entities:', bold: true, color: '2563EB' },
  { text: 'Users, Roles, Diseases, Hospitals, Patients, Medical Records, Notifications.', indent: 1 },
  { text: 'Design Approach:', bold: true, color: '2563EB' },
  { text: 'Relational design to guarantee data integrity across extensive health records.', indent: 1 },
  { text: 'One-to-Many relationships mapping patients and diseases to specific geographic hospitals.', indent: 1 },
  { text: 'Why PostgreSQL?', bold: true, color: '2563EB' },
  { text: 'Chosen for ACID compliance, rigorous data constraints, and seamless integration with PostGIS for spatial mapping.', indent: 1 }
], 'Our database architecture relies on core entities like Patients, Hospitals, and Medical Records linked via strict foreign keys. We chose a relational design on PostgreSQL because healthcare data requires absolute ACID compliance, robust data integrity, and the advanced spatial querying that PostGIS provides.', 'Presenter 3');

// 19
addSlide('Database & Performance', [
  { text: 'Core Entity Engine:', bold: true },
  { text: 'Relational tracking of hospitals, patients, and medical records via Supabase.', indent: 1 },
  { text: 'Optimization:', bold: true },
  { text: 'Materialized Views (e.g., disease_summary) pre-aggregate data for instant dashboard loading.', indent: 1 },
  { text: 'Spatial Support:', bold: true },
  { text: 'Native integration with the PostGIS extension.', indent: 1 }
], 'Because analytical queries on extensive health records can be slow, we engineered Materialized Views in PostgreSQL, specifically the disease_summary view. These pre-aggregate data so our dashboards load instantly. Furthermore, we enabled PostGIS natively to handle complex geographic coordinates.', 'Presenter 3');

// 20
addSlide('Complete System Workflow', [
  { text: '1. Client Request:', bold: true },
  { text: 'User interacts with Next.js Frontend.', indent: 1 },
  { text: '2. Authentication:', bold: true },
  { text: 'Auth Middleware validates JWT directly against Supabase API.', indent: 1 },
  { text: '3. Business Logic:', bold: true },
  { text: 'Request passes to Controller → Service → Repository.', indent: 1 },
  { text: '4. Data Layer:', bold: true },
  { text: 'Repository executes SQL against PostgreSQL via Supabase client.', indent: 1 },
  { text: '5. Response:', bold: true },
  { text: 'Data is returned, updating the Zustand state and Recharts dashboard instantly.', indent: 1 }
], 'To understand Epicare’s data lifecycle, look at this workflow. A frontend action triggers an API request to our Express server. Crucially, our Authentication Middleware intercepts this to validate the JWT against the Supabase API. Once cleared, it passes through our Controller and Repository layers, fetching data from PostgreSQL, and rendering it instantly on the user\'s dashboard.', 'Presenter 3');

// 21
addSlide('Geographic Information System (GIS)', [
  { text: 'Frontend:', bold: true },
  { text: 'Leaflet.js rendering dynamic interactive maps.', indent: 1 },
  { text: 'Backend:', bold: true },
  { text: 'PostGIS GIST indexing for rapid spatial queries.', indent: 1 },
  { text: 'Use Case:', bold: true },
  { text: 'Tracking disease clusters and finding nearby facilities with available capacity.', indent: 1 }
], 'Moving to our advanced modules, the GIS module is powered by Leaflet.js on the frontend and PostGIS on the backend. By utilizing GIST indexes, we execute rapid spatial queries. This allows decision-makers to visually pinpoint a disease cluster and immediately locate the nearest hospital with available ICU capacity.', 'Presenter 4');

// 22
addSlide('Real-Time Analytics', [
  { text: 'Visualization:', bold: true },
  { text: 'Recharts for dynamic bar, pie, and line graphs.', indent: 1 },
  { text: 'Data Sourcing:', bold: true },
  { text: 'Fed directly by Postgres RPCs and Materialized Views.', indent: 1 },
  { text: 'Features:', bold: true },
  { text: 'Live KPI cards, epidemiological trend analysis, and custom report builders.', indent: 1 }
], 'Our analytics module utilizes Recharts to translate raw data into actionable visual insights. Because we use materialized views, these charts—showing epidemiological trends or live hospital metrics—render without lag, providing policy-makers with an uncompromised snapshot of the nation\'s health.', 'Presenter 4');

// 23
addSlide('Intent-Based Analytics Routing (AI Module)', [
  { text: 'Stack:', bold: true },
  { text: 'FastAPI wrapper + Google Gemini.', indent: 1 },
  { text: 'Mechanism:', bold: true },
  { text: 'Secure Intent-Based Query Routing.', indent: 1 },
  { text: 'Execution:', bold: true },
  { text: 'Natural language is translated into an execution plan (JSON), which triggers validated, pre-programmed analytics.', indent: 1 }
], 'Our AI Module uses a FastAPI wrapper around Google Gemini. To guarantee data safety, we engineered a Secure Intent-Based Routing system. The AI detects the user\'s intent and generates a structured plan. Our Python service maps this to strict, pre-approved analytical queries, fetches the aggregated data, and injects it into the conversational prompt.', 'Presenter 4');

// 24
addSlide('Defensible KPIs', [
  { text: 'Data Aggregation Speed:', bold: true },
  { text: 'Materialized Views process and aggregate large-scale medical datasets in milliseconds.', indent: 1 },
  { text: 'Data Retrieval Time:', bold: true },
  { text: 'Conversational AI reduces analytical query formulation from days (manual SQL) to seconds.', indent: 1 },
  { text: 'Query Optimization:', bold: true },
  { text: 'PostgreSQL RPCs drastically reduce network payload sizes compared to raw data fetching.', indent: 1 },
  { text: 'Security Validation:', bold: true },
  { text: 'Verified user authentication success via robust Supabase Auth pipelines.', indent: 1 }
], 'We measure Epicare\'s success through tangible architectural KPIs. We benchmarked our database: our Materialized Views aggregate massive datasets in milliseconds. Operationally, Epicare reduces the time it takes an official to get a complex analytical report from days of requesting manual SQL queries down to a few seconds via our AI chatbot.', 'Presenter 4');

// 25
addSlide('Feasibility Analysis (PPIS Framework)', [
  { text: 'Technical:', bold: true },
  { text: 'High. Built on mature, scalable stacks (PostgreSQL, Next.js).', indent: 1 },
  { text: 'Operational:', bold: true },
  { text: 'High. Chatbot UI bridges the technical gap for medical staff.', indent: 1 },
  { text: 'Economic:', bold: true },
  { text: 'High. Cloud-native architecture avoids massive on-premise hardware costs.', indent: 1 },
  { text: 'Legal/Compliance:', bold: true },
  { text: 'Moderate/High. Enforces RBAC natively, providing a clear roadmap for full audit trails.', indent: 1 },
  { text: 'Schedule:', bold: true },
  { text: 'High. Successfully delivered the core system architecture within the graduation timeline.', indent: 1 }
], 'Through the PPIS framework, Epicare is highly feasible. Technically and economically, utilizing serverless cloud infrastructure drastically reduces costs. Operationally, the AI lowers the training barrier. Legally, we enforce strict RBAC, establishing a strong foundation for full Egyptian Ministry of Health compliance.', 'Presenter 4');

// 26
addSlide('Future Recommendations', [
  { text: 'Scalability:', bold: true },
  { text: 'Implement map clustering for massive GIS datasets.', indent: 1 },
  { text: 'Security:', bold: true },
  { text: 'Transition to full Row Level Security (RLS) within PostgreSQL.', indent: 1 },
  { text: 'Innovation:', bold: true },
  { text: 'Evolve the AI to use Retrieval-Augmented Generation (RAG) for unstructured document analysis.', indent: 1 }
], 'Looking forward, our technical recommendations include implementing map clustering to handle expanding GIS data smoothly, and transitioning to full Row Level Security for maximum database protection. For the AI, we recommend evolving the architecture to include Retrieval-Augmented Generation.', 'Presenter 4');

// 27
addSlide('Conclusion', [
  { text: 'Epicare bridges the gap between raw medical data and immediate policy action.', bullet: true },
  { text: 'Transforms healthcare from a reactive model to a predictive, intelligent ecosystem.', bullet: true },
  { text: 'Epicare demonstrates how intelligent health information systems can support public policy, improve healthcare service delivery, and enable data-driven decision making in Egypt.', bullet: true }
], 'In conclusion, Epicare demonstrates how intelligent health information systems can support public policy, improve healthcare service delivery, and enable data-driven decision making in Egypt. Epicare is built to scale, ready to transform Egyptian healthcare into a predictive, intelligent ecosystem.', 'Presenter 4');

// 28
let s28 = pres.addSlide({ masterName: 'TITLE_SLIDE' });
s28.addText('Thank You', { x: 0, y: 1.5, w: '100%', align: 'center', color: '3B82F6', fontSize: 64, bold: true });
s28.addText('Questions & Discussion', { x: 0, y: 2.8, w: '100%', align: 'center', color: 'F8FAFC', fontSize: 24 });
s28.addNotes('Thank you for your time and attention. We now welcome your questions and discussion.');

pres.writeFile({ fileName: 'Epicare_Final_Presentation.pptx' }).then(fileName => {
    console.log(`created file: ${fileName}`);
});

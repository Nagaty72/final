import { Router } from 'express';
import { getSupabase } from '../config/supabase.js';
import NodeCache from 'node-cache';
import axios from 'axios';
import { HospitalRepository } from '../repositories/hospital.repository.js';
import { ENV } from '../config/env.js';

const router = Router();
const cache = new NodeCache({ stdTTL: 120, checkperiod: 60 }); // 2-min cache

/**
 * GET /api/v1/public/stats
 * No authentication required — returns aggregate platform metrics for the landing page.
 */
router.get('/stats', async (req, res) => {
  console.log('[BACKEND REQUEST RECEIVED] GET /api/v1/public/stats');
  const CACHE_KEY = 'public_landing_stats';

  const cached = cache.get(CACHE_KEY);
  if (cached) {
    console.log('[BACKEND CACHE HIT]', JSON.stringify(cached));
    return res.json({ success: true, data: cached, cached: true });
  }

  const db = getSupabase();
  if (!db) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured',
    });
  }

  try {
    let kpiResult, diseasesResult, governoratesResult, breakdownResult;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      [
        kpiResult,
        diseasesResult,
        governoratesResult,
        breakdownResult,
      ] = await Promise.all([
        db.rpc('get_dashboard_kpis', {
          p_city: null, p_disease: null, p_gender: null,
          p_severity: null, p_start_date: null, p_end_date: null,
        }),
        db.from('diseases').select('id', { count: 'exact', head: true }),
        db.from('districts').select('city').order('city'),
        db.rpc('get_dashboard_disease_breakdown', {
          p_city: null, p_disease: null, p_gender: null,
          p_severity: null, p_start_date: null, p_end_date: null,
        })
      ]);

      const hasError = kpiResult.error || diseasesResult.error || governoratesResult.error || breakdownResult.error;
      if (!hasError) break;

      attempts++;
      if (attempts >= maxAttempts) break; // Will throw below

      console.warn(`[public/stats] Database query failed, retrying (${attempts}/${maxAttempts})...`);
      await new Promise(res => setTimeout(res, 1500)); // wait 1.5s before retry
    }

    if (kpiResult.error) throw new Error(`KPI RPC Error: ${kpiResult.error.message}`);
    if (diseasesResult.error) throw new Error(`Diseases Query Error: ${diseasesResult.error.message}`);
    if (governoratesResult.error) throw new Error(`Districts Query Error: ${governoratesResult.error.message}`);
    if (breakdownResult.error) throw new Error(`Breakdown RPC Error: ${breakdownResult.error.message}`);

    // Unique governorates
    const allCities = (governoratesResult.data || []).map(d => d.city).filter(Boolean);
    const uniqueGovernorates = [...new Set(allCities)].length;

    // Top diseases
    let topDiseases = [];
    if (breakdownResult.data && !breakdownResult.error) {
      const rows = breakdownResult.data;
      const totalCases = rows.reduce((s, r) => s + Number(r.total_cases || r.count || 0), 0) || 1;
      topDiseases = rows.slice(0, 6).map(d => {
        const cases = Number(d.total_cases || d.count || 0);
        return {
          name: d.disease_name || d.disease || d.name || 'Unknown',
          cases: cases,
          percentage: Number(((cases / totalCases) * 100).toFixed(1)),
        };
      });
    }

    console.log('[BACKEND RPC RESULT] get_dashboard_kpis:', JSON.stringify(kpiResult));
    const kpiData = Array.isArray(kpiResult.data) ? kpiResult.data[0] : (kpiResult.data || {});

    const stats = {
      totalPatients: kpiData.total_patients || 0,
      activeCases: kpiData.active_cases || 0,
      totalHospitals: kpiData.total_hospitals || 0,
      totalDiseases: diseasesResult.count || 0,
      totalRecords: kpiData.total_cases || 0, // Maps to Total Cases
      governoratesCovered: uniqueGovernorates,
      topDiseases,
    };

    cache.set(CACHE_KEY, stats);
    console.log('[BACKEND FINAL RESPONSE]', JSON.stringify(stats));
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[public/stats] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch public stats' });
  }
});

/**
 * POST /api/v1/public/widget-chat
 * No authentication required — strictly allowlisted predefined messages only.
 * Guards against prompt injection. Supports language param for bilingual replies.
 */
const WIDGET_ALLOWED_MESSAGES = new Set([
  // English
  'How do I protect myself and my family from seasonal diseases?',
  'What are the best tips to prevent colds and flu?',
  'What should I do if I develop fever symptoms?',
  'What are the most common diseases in Egypt right now?',
  'How do I maintain a diet that boosts immunity?',
  'What are the essential vaccines for children?',
  'How can I quit smoking and improve my health?',
  'How can I contact medical support or emergency services on the platform?',
  // Arabic
  'كيف أحمي نفسي وعائلتي من الأمراض الموسمية؟',
  'ما هي أهم النصائح للوقاية من نزلات البرد والأنفلونزا؟',
  'ماذا أفعل إذا ظهرت علي أعراض الحمى؟',
  'ما هي الأمراض الأكثر شيوعاً في مصر حالياً؟',
  'كيف أحافظ على نظام غذائي يقوي المناعة؟',
  'ما هي التطعيمات الأساسية للأطفال؟',
  'كيف يمكنني الإقلاع عن التدخين وتحسين صحتي؟',
  'كيف يمكنني التواصل مع الدعم الطبي أو الطوارئ في المنصة؟',
]);

const widgetChatLimiter = new NodeCache({ stdTTL: 60 });

router.post('/widget-chat', async (req, res) => {
  const { message, governorate, context, language = 'en' } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'Message is required.' });
  }

  // Nearest hospital query: build an enriched prompt
  const isHospitalQuery = message.startsWith('__NEAREST_HOSPITAL__');
  let finalMessage = message;

  if (isHospitalQuery) {
    const gov = (governorate || '').trim() || 'Egypt';
    const isAr = language === 'ar';

    // Intercept coordinates and query DB directly instead of timing out the AI service
    let lat, lng;
    if (context?.location) {
      lat = context.location.lat;
      lng = context.location.lng;
    } else {
      const coordsMatch = gov.match(/coordinates\s+([0-9.-]+),([0-9.-]+)/);
      if (coordsMatch) {
        lat = parseFloat(coordsMatch[1]);
        lng = parseFloat(coordsMatch[2]);
      }
    }

    if (lat && lng) {

      try {
        const hospitals = await HospitalRepository.findNearby(lng, lat, 15000, null, null, 3);
        if (hospitals && hospitals.length > 0) {
          const hosp = hospitals[0];
          const responseText = isAr
            ? `أقرب مستشفى إليك هي **${hosp.name}**. تقع في ${hosp.city}${hosp.address ? `، ${hosp.address}` : ''}. رقم الهاتف: ${hosp.phone || 'غير متوفر'}.`
            : `The nearest hospital to you is **${hosp.name}**. It is located in ${hosp.city}${hosp.address ? `, ${hosp.address}` : ''}. Phone: ${hosp.phone || 'N/A'}.`;
          return res.json({ success: true, response: responseText });
        } else {
          const responseText = isAr
            ? 'عذراً، لم أتمكن من العثور على أي مستشفيات قريبة من موقعك (في دائرة قطرها 15 كم).'
            : 'Sorry, I could not find any hospitals near your location (within a 15km radius).';
          return res.json({ success: true, response: responseText });
        }
      } catch (dbErr) {
        console.error('[public/widget-chat] Hospital DB error:', dbErr.message);
        const errMsg = isAr ? 'حدث خطأ أثناء البحث عن المستشفيات.' : 'Error searching for hospitals.';
        return res.status(500).json({ success: false, error: errMsg });
      }
    }

    finalMessage = isAr
      ? `ما هي المستشفيات أو مرافق الرعاية الصحية المتاحة في أو بالقرب من ${context?.governorate || gov}، مصر؟ يرجى تقديم إرشادات عامة للعثور على أقرب منشأة رعاية صحية. أجب باللغة العربية.`
      : `What hospitals or healthcare facilities are available in or near ${context?.governorate || gov}, Egypt? Provide general guidance on finding the nearest healthcare facility.`;
  } else if (!WIDGET_ALLOWED_MESSAGES.has(message)) {
    return res.status(403).json({ success: false, error: 'This message is not permitted via the public widget.' });
  } else if (language === 'ar') {
    // Append instruction to reply in Arabic for the AI
    finalMessage = `${message}\n\nيرجى الإجابة باللغة العربية الفصحى.`;
  }

  // Per-IP rate limiting (5 requests per minute)
  const ip = req.ip || 'unknown';
  const key = `widget_${ip}`;
  const count = widgetChatLimiter.get(key) || 0;
  if (count >= 5) {
    return res.status(429).json({ success: false, error: language === 'ar' ? 'طلبات كثيرة جداً، يرجى الانتظار.' : 'Too many requests. Please wait a moment.' });
  }
  widgetChatLimiter.set(key, count + 1);

  try {
    const aiServiceUrl = ENV.AI_SERVICE_URL || 'http://localhost:8000';
    const aiResponse = await axios.post(
      `${aiServiceUrl}/chat`,
      { message: finalMessage, user_role: 'normal_user', history: [], context },
      { timeout: 120000 }
    );
    const responseText = aiResponse.data?.response || (language === 'ar' ? 'لم يتم توليد رد.' : 'No response generated.');
    const isFallback = aiResponse.data?.isFallback || false;
    return res.json({ success: true, response: responseText, isFallback });
  } catch (err) {
    // Log full error for debugging 502s
    if (err.response) {
      console.error('[public/widget-chat] AI service responded with error:',
        err.response.status, JSON.stringify(err.response.data));
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      console.error('[public/widget-chat] AI service is offline or unreachable:', err.message);
    } else {
      console.error('[public/widget-chat] Unexpected error:', err.message);
    }
    const errMsg = language === 'ar'
      ? 'خدمة الذكاء الاصطناعي غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.'
      : 'The AI service is temporarily unavailable. Please try again shortly.';
    return res.status(502).json({ success: false, error: errMsg });
  }
});


export default router;

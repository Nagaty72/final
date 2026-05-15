"""
Local Medical Knowledge Base
============================
Provides offline, quota-proof medical education for common diseases.
Supports bilingual responses (Arabic & English).
"""

from typing import Optional, Dict, Any

# --- LOCAL KNOWLEDGE DATA ---
DISEASE_KB: Dict[str, Dict[str, Any]] = {
    "covid-19": {
        "en": {
            "name": "COVID-19 (Coronavirus Disease 2019)",
            "description": "An infectious disease caused by the SARS-CoV-2 virus.",
            "symptoms": "Fever, cough, tiredness, loss of taste or smell, and difficulty breathing.",
            "prevention": "Vaccination, wearing masks, social distancing, and regular hand washing.",
            "treatment": "Supportive care, hydration, and in severe cases, hospitalization and antiviral medication."
        },
        "ar": {
            "name": "كوفيد-19 (مرض فيروس كورونا 2019)",
            "description": "مرض معدٍ يسببه فيروس سارس-كوف-2.",
            "symptoms": "الحمى، السعال، التعب، فقدان حاسة التذوق أو الشم، وصعوبة التنفس.",
            "prevention": "التطعيم، ارتداء الكمامات، التباعد الاجتماعي، وغسل اليدين بانتظام.",
            "treatment": "الرعاية الداعمة، الترطيب، وفي الحالات الشديدة، دخول المستشفى والأدوية المضادة للفيروسات."
        }
    },
    "diabetes": {
        "en": {
            "name": "Diabetes Mellitus",
            "description": "A chronic condition that affects how your body turns food into energy.",
            "symptoms": "Increased thirst, frequent urination, unexplained weight loss, and blurred vision.",
            "prevention": "Healthy diet, regular physical activity, and maintaining a healthy weight.",
            "treatment": "Insulin, oral medications, blood sugar monitoring, and lifestyle changes."
        },
        "ar": {
            "name": "مرض السكري",
            "description": "حالة مزمنة تؤثر على كيفية تحويل جسمك للطعام إلى طاقة.",
            "symptoms": "زيادة العطش، كثرة التبول، فقدان الوزن غير المبرر، وضبابية الرؤية.",
            "prevention": "نظام غذائي صحي، نشاط بدني منتظم، والحفاظ على وزن صحي.",
            "treatment": "الأنسولين، الأدوية الفموية، مراقبة سكر الدم، وتغييرات في نمط الحياة."
        }
    },
    "malaria": {
        "en": {
            "name": "Malaria",
            "description": "A life-threatening disease caused by parasites transmitted to people through the bites of infected female Anopheles mosquitoes.",
            "symptoms": "Fever, chills, headache, and muscle aches.",
            "prevention": "Using bed nets, insect repellent, and preventive medications (prophylaxis).",
            "treatment": "Antimalarial drugs (e.g., Artemisinin-based combination therapy)."
        },
        "ar": {
            "name": "الملاريا",
            "description": "مرض يهدد الحياة تسببه طفيليات تنتقل إلى البشر عبر لدغات البعوض المصابة.",
            "symptoms": "الحمى، القشعريرة، الصداع، وآلام العضلات.",
            "prevention": "استخدام الناموسيات، طارد الحشرات، والأدوية الوقائية.",
            "treatment": "الأدوية المضادة للملاريا (مثل العلاج المركب القائم على مادة الأرتيميسينين)."
        }
    },
    "hypertension": {
        "en": {
            "name": "Hypertension (High Blood Pressure)",
            "description": "A condition in which the force of the blood against the artery walls is too high.",
            "symptoms": "Often asymptomatic (the 'silent killer'), but can cause headaches, nosebleeds, and shortness of breath.",
            "prevention": "Reduced salt intake, healthy diet, exercise, and avoiding tobacco.",
            "treatment": "Blood pressure medications (ACE inhibitors, beta-blockers) and lifestyle adjustments."
        },
        "ar": {
            "name": "ارتفاع ضغط الدم",
            "description": "حالة تكون فيها قوة دفع الدم ضد جدران الشرايين مرتفعة للغاية.",
            "symptoms": "غالبًا لا توجد أعراض (القاتل الصامت)، ولكن قد يسبب الصداع ونزيف الأنف وضيق التنفس.",
            "prevention": "تقليل تناول الملح، نظام غذائي صحي، التمارين الرياضية، وتجنب التبغ.",
            "treatment": "أدوية ضغط الدم وتغييرات في نمط الحياة."
        }
    }
}

def format_kb_response(info: Dict[str, str]) -> str:
    """Formats knowledge base data into a professional markdown response."""
    return f"""### 📚 {info['name']}
**Description:** {info['description']}

- **Symptoms:** {info['symptoms']}
- **Prevention:** {info['prevention']}
- **Treatment Overview:** {info['treatment']}

---
*Note: This is general medical information. Please consult a healthcare professional for clinical advice.*
"""

def get_local_knowledge(query: str) -> Optional[str]:
    """Retrieves and formats disease info from the local KB."""
    q = query.lower().strip()
    
    # 1. Detect language (heuristic)
    lang = "ar" if any('\u0600' <= char <= '\u06FF' for char in q) else "en"
    
    # 2. Match disease (simple semantic check)
    target_disease = None
    for key in DISEASE_KB.keys():
        if key in q:
            target_disease = key
            break
            
    # Alias handling (Manual for speed)
    aliases = {
        "كورونا": "covid-19", "كوفيد": "covid-19", "corona": "covid-19",
        "سكري": "diabetes", "سكر": "diabetes",
        "ضغط": "hypertension", "blood pressure": "hypertension",
        "ملاريا": "malaria"
    }
    
    if not target_disease:
        for alias, key in aliases.items():
            if alias in q:
                target_disease = key
                break

    if target_disease:
        info = DISEASE_KB[target_disease][lang]
        return format_kb_response(info)
        
    return None

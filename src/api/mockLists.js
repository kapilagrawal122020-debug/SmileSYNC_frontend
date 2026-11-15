// Generated from masterdata/seed/master_lists.json: the lists the demo needs (medical history and cancel reasons).
// Demo mode only. With a real backend these come from GET /api/lists/.
export const MOCK_LISTS = {
 "medical-conditions": [
  {
   "code": "hypertension",
   "label": "High blood pressure",
   "group": "Heart and blood pressure",
   "labels": {},
   "description": "Check blood pressure before treatment; adrenaline in anaesthetic needs care",
   "metadata": {}
  },
  {
   "code": "heart-disease",
   "label": "Heart disease or heart attack",
   "group": "Heart and blood pressure",
   "labels": {},
   "description": "Reduce stress; physician advice for major procedures",
   "metadata": {}
  },
  {
   "code": "valve-disease",
   "label": "Rheumatic or valve disease, prosthetic valve, past endocarditis",
   "group": "Heart and blood pressure",
   "labels": {},
   "description": "Antibiotic cover may be advised before some procedures",
   "metadata": {}
  },
  {
   "code": "pacemaker",
   "label": "Pacemaker or implanted device",
   "group": "Heart and blood pressure",
   "labels": {},
   "description": "Check device guidance for electrical equipment",
   "metadata": {}
  },
  {
   "code": "stroke",
   "label": "Stroke",
   "group": "Heart and blood pressure",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "diabetes",
   "label": "Diabetes (type 1 or 2)",
   "group": "Sugar and hormones",
   "labels": {},
   "description": "Healing and infection risk; ask about meals and medicines; record last HbA1c if known",
   "metadata": {}
  },
  {
   "code": "thyroid",
   "label": "Thyroid disorder",
   "group": "Sugar and hormones",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "bleeding-disorder",
   "label": "Bleeding disorder (for example haemophilia)",
   "group": "Blood",
   "labels": {},
   "description": "Plan before extractions or surgery",
   "metadata": {}
  },
  {
   "code": "anaemia",
   "label": "Anaemia",
   "group": "Blood",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "asthma",
   "label": "Asthma",
   "group": "Breathing",
   "labels": {},
   "description": "Ask the patient to bring the inhaler",
   "metadata": {}
  },
  {
   "code": "copd",
   "label": "COPD",
   "group": "Breathing",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "tb",
   "label": "Tuberculosis (current or past)",
   "group": "Breathing",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "hepatitis-b",
   "label": "Hepatitis B",
   "group": "Infections",
   "labels": {},
   "description": "Standard precautions apply to every patient; keep the status confidential",
   "metadata": {}
  },
  {
   "code": "hepatitis-c",
   "label": "Hepatitis C",
   "group": "Infections",
   "labels": {},
   "description": "Same",
   "metadata": {}
  },
  {
   "code": "hiv",
   "label": "HIV",
   "group": "Infections",
   "labels": {},
   "description": "Same. Do not change infection control by disclosed status",
   "metadata": {}
  },
  {
   "code": "epilepsy",
   "label": "Epilepsy or seizures",
   "group": "Nervous system and mind",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "fainting-anxiety",
   "label": "Fainting or severe dental anxiety",
   "group": "Nervous system and mind",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "psychiatric",
   "label": "Psychiatric condition",
   "group": "Nervous system and mind",
   "labels": {},
   "description": "Medicines may dry the mouth",
   "metadata": {}
  },
  {
   "code": "kidney-disease",
   "label": "Kidney disease",
   "group": "Other",
   "labels": {},
   "description": "Drug choice and dose",
   "metadata": {}
  },
  {
   "code": "liver-disease",
   "label": "Liver disease",
   "group": "Other",
   "labels": {},
   "description": "Bleeding risk and drug choice",
   "metadata": {}
  },
  {
   "code": "cancer-chemo",
   "label": "Cancer, chemotherapy or head and neck radiotherapy",
   "group": "Other",
   "labels": {},
   "description": "Timing of dental work matters; bone healing risk after radiotherapy",
   "metadata": {}
  },
  {
   "code": "osteoporosis",
   "label": "Osteoporosis",
   "group": "Other",
   "labels": {},
   "description": "See bisphosphonates in medicines",
   "metadata": {}
  },
  {
   "code": "pregnancy",
   "label": "Pregnant",
   "group": "Other",
   "labels": {},
   "description": "Record the trimester; avoid X-rays unless essential; drug choice",
   "metadata": {}
  },
  {
   "code": "breastfeeding",
   "label": "Breastfeeding",
   "group": "Other",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "immunosuppressed",
   "label": "Transplant or immunosuppressed",
   "group": "Other",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "joint-replacement",
   "label": "Prosthetic joint replacement",
   "group": "Other",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "reflux",
   "label": "Acid reflux",
   "group": "Other",
   "labels": {},
   "description": "Can erode tooth surfaces",
   "metadata": {}
  },
  {
   "code": "sleep-apnoea",
   "label": "Sleep apnoea",
   "group": "Other",
   "labels": {},
   "description": "",
   "metadata": {}
  }
 ],
 "allergies": [
  {
   "code": "penicillin",
   "label": "Penicillin or amoxicillin",
   "group": "",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "sulfa",
   "label": "Sulfa drugs",
   "group": "",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "other-antibiotic",
   "label": "Another antibiotic",
   "group": "",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "nsaid",
   "label": "Aspirin or other painkillers (NSAIDs)",
   "group": "",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "local-anaesthetic",
   "label": "Local anaesthetic",
   "group": "",
   "labels": {},
   "description": "Lignocaine, articaine and others",
   "metadata": {}
  },
  {
   "code": "latex",
   "label": "Latex",
   "group": "",
   "labels": {},
   "description": "Use latex-free gloves",
   "metadata": {}
  },
  {
   "code": "iodine",
   "label": "Iodine or povidone-iodine",
   "group": "",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "chlorhexidine",
   "label": "Chlorhexidine",
   "group": "",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "nickel",
   "label": "Nickel or other metals",
   "group": "",
   "labels": {},
   "description": "Matters for braces and crowns",
   "metadata": {}
  },
  {
   "code": "acrylic",
   "label": "Acrylic (methyl methacrylate)",
   "group": "",
   "labels": {},
   "description": "Dentures and temporary crowns",
   "metadata": {}
  },
  {
   "code": "eugenol",
   "label": "Eugenol (clove oil)",
   "group": "",
   "labels": {},
   "description": "Used in some temporary fillings",
   "metadata": {}
  },
  {
   "code": "sulphite",
   "label": "Sulphites",
   "group": "",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "other",
   "label": "Other (write in)",
   "group": "",
   "labels": {},
   "description": "",
   "metadata": {}
  }
 ],
 "flagged-medications": [
  {
   "code": "anticoagulant",
   "label": "Blood thinners (warfarin, acenocoumarol, dabigatran, rivaroxaban, apixaban)",
   "group": "",
   "labels": {},
   "description": "Bleeding; INR may be needed",
   "metadata": {}
  },
  {
   "code": "antiplatelet",
   "label": "Aspirin or clopidogrel",
   "group": "",
   "labels": {},
   "description": "Bleeding",
   "metadata": {}
  },
  {
   "code": "bisphosphonate",
   "label": "Bisphosphonates or denosumab (alendronate, zoledronic acid)",
   "group": "",
   "labels": {},
   "description": "Extraction and surgery planning",
   "metadata": {}
  },
  {
   "code": "steroid",
   "label": "Long-term steroids",
   "group": "",
   "labels": {},
   "description": "Infection and healing",
   "metadata": {}
  },
  {
   "code": "immunosuppressant",
   "label": "Immunosuppressants or chemotherapy",
   "group": "",
   "labels": {},
   "description": "Infection and healing",
   "metadata": {}
  },
  {
   "code": "gum-overgrowth",
   "label": "Amlodipine, nifedipine, phenytoin, ciclosporin",
   "group": "",
   "labels": {},
   "description": "Can cause gum overgrowth",
   "metadata": {}
  },
  {
   "code": "diabetes-drugs",
   "label": "Insulin or diabetes tablets",
   "group": "",
   "labels": {},
   "description": "Low sugar risk if meals are missed",
   "metadata": {}
  },
  {
   "code": "antiepileptic",
   "label": "Anti-epileptic medicines",
   "group": "",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "dry-mouth",
   "label": "Antidepressants, antihistamines, diuretics",
   "group": "",
   "labels": {},
   "description": "Dry mouth raises decay risk",
   "metadata": {}
  },
  {
   "code": "supplements",
   "label": "Herbal supplements",
   "group": "",
   "labels": {},
   "description": "Ask; some affect bleeding",
   "metadata": {}
  }
 ],
 "habits": [
  {
   "code": "cigarette",
   "label": "Cigarettes",
   "group": "Tobacco and substances",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "bidi",
   "label": "Bidi",
   "group": "Tobacco and substances",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "hookah",
   "label": "Hookah",
   "group": "Tobacco and substances",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "smokeless-tobacco",
   "label": "Smokeless tobacco (gutkha, khaini, zarda)",
   "group": "Tobacco and substances",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "betel-quid",
   "label": "Betel quid or paan (with or without tobacco)",
   "group": "Tobacco and substances",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "areca-nut",
   "label": "Areca nut (supari)",
   "group": "Tobacco and substances",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "alcohol",
   "label": "Alcohol",
   "group": "Tobacco and substances",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "bruxism",
   "label": "Teeth grinding or clenching",
   "group": "Oral habits",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "nail-biting",
   "label": "Nail biting",
   "group": "Oral habits",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "thumb-sucking",
   "label": "Thumb or finger sucking",
   "group": "Oral habits",
   "labels": {},
   "description": "Children",
   "metadata": {}
  },
  {
   "code": "mouth-breathing",
   "label": "Mouth breathing",
   "group": "Oral habits",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "tongue-thrust",
   "label": "Tongue thrusting",
   "group": "Oral habits",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "object-biting",
   "label": "Biting pens or objects",
   "group": "Oral habits",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "ice-chewing",
   "label": "Chewing ice",
   "group": "Oral habits",
   "labels": {},
   "description": "",
   "metadata": {}
  }
 ],
 "cancellation-reasons": [
  {
   "code": "patient-cancelled",
   "label": "Patient cancelled",
   "group": "Patient",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "patient-no-response",
   "label": "Patient did not respond",
   "group": "Patient",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "patient-unwell",
   "label": "Patient unwell",
   "group": "Patient",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "cost",
   "label": "Cost or finance",
   "group": "Patient",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "went-elsewhere",
   "label": "Went to another clinic",
   "group": "Patient",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "doctor-unavailable",
   "label": "Doctor unavailable",
   "group": "Clinic",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "clinic-emergency",
   "label": "Emergency at the clinic",
   "group": "Clinic",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "clinic-closed",
   "label": "Clinic closed or holiday",
   "group": "Clinic",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "duplicate",
   "label": "Duplicate booking",
   "group": "Clinic",
   "labels": {},
   "description": "",
   "metadata": {}
  },
  {
   "code": "other",
   "label": "Other",
   "group": "Clinic",
   "labels": {},
   "description": "",
   "metadata": {}
  }
 ]
};

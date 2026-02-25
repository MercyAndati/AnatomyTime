// backend/src/services/contentFilter.service.ts
export interface FilterResult {
  isValid: boolean;
  confidence: number;
  category?: string;
  reason?: string;
  suggestions?: string[];
  detectedTopics: string[];
}

export class ContentFilterService {
  private anatomyCategories = {
    'Skeletal System': [
      'bone', 'skeleton', 'skull', 'vertebra', 'rib', 'sternum', 'clavicle', 'scapula',
      'humerus', 'radius', 'ulna', 'carpal', 'metacarpal', 'phalange', 'femur', 'patella',
      'tibia', 'fibula', 'tarsal', 'metatarsal', 'pelvis', 'sacrum', 'coccyx', 'mandible',
      'maxilla', 'zygomatic', 'temporal', 'parietal', 'occipital', 'frontal', 'sphenoid',
      'ethmoid', 'hyoid', 'ossicle', 'malleus', 'incus', 'stapes', 'atlas', 'axis'
    ],
    
    'Muscular System': [
      'muscle', 'biceps', 'triceps', 'quadriceps', 'hamstring', 'gluteus', 'deltoid',
      'pectoralis', 'trapezius', 'latissimus', 'rhomboid', 'sternocleidomastoid', 'masseter',
      'temporalis', 'orbicularis', 'zygomaticus', 'platysma', 'diaphragm', 'intercostal',
      'rectus abdominis', 'transversus abdominis', 'oblique', 'erector spinae', 'splenius',
      'iliopsoas', 'sartorius', 'gracilis', 'adductor', 'gastrocnemius', 'soleus', 'tibialis',
      'peroneus', 'extensor', 'flexor', 'supinator', 'pronator', 'sphincter'
    ],
    
    'Nervous System': [
      'nerve', 'brain', 'cerebrum', 'cerebellum', 'brainstem', 'medulla', 'pons', 'midbrain',
      'thalamus', 'hypothalamus', 'hippocampus', 'amygdala', 'basal ganglia', 'corpus callosum',
      'spinal cord', 'neuron', 'axon', 'dendrite', 'synapse', 'neurotransmitter', 'meninges',
      'dura mater', 'arachnoid mater', 'pia mater', 'ventricle', 'cerebrospinal fluid',
      'cranial nerve', 'olfactory', 'optic', 'oculomotor', 'trochlear', 'trigeminal', 'abducens',
      'facial', 'vestibulocochlear', 'glossopharyngeal', 'vagus', 'accessory', 'hypoglossal',
      'sciatic', 'femoral', 'radial', 'ulnar', 'median', 'tibial', 'peroneal'
    ],
    
    'Cardiovascular System': [
      'heart', 'cardiac', 'atrium', 'ventricle', 'septum', 'valve', 'tricuspid', 'bicuspid',
      'mitral', 'aortic', 'pulmonary', 'vena cava', 'aorta', 'artery', 'vein', 'capillary',
      'coronary', 'pulmonary artery', 'pulmonary vein', 'carotid', 'subclavian', 'brachial',
      'radial', 'ulnar', 'femoral', 'popliteal', 'tibial', 'iliac', 'mesenteric', 'renal',
      'hepatic', 'splenic', 'gastric', 'jugular', 'saphenous', 'portal', 'sinusoid'
    ],
    
    'Respiratory System': [
      'lung', 'trachea', 'bronchus', 'bronchiole', 'alveolus', 'pleura', 'diaphragm',
      'intercostal', 'pharynx', 'larynx', 'nasal cavity', 'sinus', 'epiglottis', 'cricoid',
      'thyroid cartilage', 'arytenoid', 'carina', 'hilum', 'apex', 'base', 'lobe', 'segment'
    ],
    
    'Digestive System': [
      'esophagus', 'stomach', 'intestine', 'duodenum', 'jejunum', 'ileum', 'colon', 'cecum',
      'appendix', 'rectum', 'anus', 'liver', 'gallbladder', 'pancreas', 'salivary gland',
      'parotid', 'submandibular', 'sublingual', 'tongue', 'tooth', 'enamel', 'dentin', 'pulp',
      'periodontal', 'gingiva', 'uvula', 'pharynx', 'cardiac sphincter', 'pyloric sphincter',
      'ileocecal valve', 'sphincter of Oddi', 'mesentery', 'omentum'
    ],
    
    'Urinary System': [
      'kidney', 'nephron', 'glomerulus', 'tubule', 'collecting duct', 'ureter', 'bladder',
      'urethra', 'renal', 'cortex', 'medulla', 'pyramid', 'papilla', 'pelvis', 'calyx',
      'hilum', 'sphincter', 'trigone', 'detrusor'
    ],
    
    'Reproductive System': [
      'ovary', 'uterine tube', 'uterus', 'endometrium', 'myometrium', 'cervix', 'vagina',
      'vulva', 'labia', 'clitoris', 'vestibule', 'testis', 'epididymis', 'vas deferens',
      'seminal vesicle', 'prostate', 'bulbourethral', 'penis', 'scrotum', 'spermatic cord',
      'seminiferous tubule', 'leydig', 'sertoli', 'follicle', 'corpus luteum', 'placenta'
    ],
    
    'Endocrine System': [
      'pituitary', 'hypothalamus', 'thyroid', 'parathyroid', 'adrenal', 'pancreas', 'islet',
      'pineal', 'thymus', 'gonad', 'ovary', 'testis', 'hormone', 'cortex', 'medulla',
      'follicle', 'zona glomerulosa', 'zona fasciculata', 'zona reticularis', 'chromaffin'
    ],
    
    'Lymphatic System': [
      'lymph node', 'lymph vessel', 'spleen', 'thymus', 'tonsil', 'adenoid', 'peyer patch',
      'lymphocyte', 'macrophage', 'dendritic cell', 'lymph', 'cisterna chyli', 'thoracic duct',
      'right lymphatic duct', 'cortex', 'medulla', 'germinal center', 'mucosa-associated'
    ],
    
    'Integumentary System': [
      'skin', 'epidermis', 'dermis', 'hypodermis', 'keratinocyte', 'melanocyte', 'langerhans',
      'merkel', 'hair', 'follicle', 'sebaceous', 'sudoriferous', 'eccrine', 'apocrine',
      'nail', 'matrix', 'lunula', 'cuticle', 'stratum corneum', 'stratum lucidum',
      'stratum granulosum', 'stratum spinosum', 'stratum basale', 'papilla', 'rete ridge'
    ],
    
    'Special Senses': [
      'eye', 'retina', 'cornea', 'lens', 'iris', 'pupil', 'sclera', 'choroid', 'ciliary body',
      'vitreous', 'aqueous', 'macula', 'fovea', 'optic disc', 'rod', 'cone', 'bipolar cell',
      'ganglion cell', 'ear', 'cochlea', 'vestibule', 'semicircular canal', 'organ of corti',
      'tympanic membrane', 'ossicle', 'malleus', 'incus', 'stapes', 'eustachian tube',
      'pinna', 'external auditory meatus', 'olfactory epithelium', 'taste bud', 'papilla'
    ]
  };

  private nonAnatomyKeywords = [
    // Programming
    'javascript', 'python', 'java', 'c++', 'html', 'css', 'react', 'angular', 'vue',
    'node', 'express', 'django', 'flask', 'spring', 'hibernate', 'sql', 'nosql',
    'algorithm', 'data structure', 'function', 'variable', 'class', 'object',
    
    // Mathematics
    'calculus', 'algebra', 'geometry', 'trigonometry', 'equation', 'derivative',
    'integral', 'matrix', 'vector', 'probability', 'statistics', 'theorem',
    
    // History
    'war', 'revolution', 'century', 'ancient', 'medieval', 'renaissance', 'empire',
    'kingdom', 'dynasty', 'president', 'prime minister', 'battle', 'treaty',
    
    // Literature
    'poem', 'novel', 'author', 'poet', 'literature', 'fiction', 'character', 'plot',
    'theme', 'metaphor', 'simile', 'rhyme', 'meter', 'stanza',
    
    // Business
    'marketing', 'finance', 'accounting', 'management', 'entrepreneurship', 'startup',
    'investment', 'stock', 'bond', 'asset', 'liability', 'revenue', 'profit',
    
    // Arts
    'painting', 'sculpture', 'drawing', 'photography', 'artist', 'canvas', 'brush',
    'color theory', 'perspective', 'composition', 'gallery', 'museum',
    
    // Music
    'guitar', 'piano', 'violin', 'drum', 'orchestra', 'symphony', 'concerto',
    'sonata', 'melody', 'harmony', 'rhythm', 'note', 'scale', 'chord',
    
    // Sports
    'football', 'soccer', 'basketball', 'baseball', 'tennis', 'golf', 'swimming',
    'running', 'athlete', 'coach', 'team', 'score', 'goal', 'tournament'
  ];

  async filterContent(text: string): Promise<FilterResult> {
    const lowerText = text.toLowerCase();
    
    // Check for non-anatomy content first
    for (const keyword of this.nonAnatomyKeywords) {
      if (lowerText.includes(keyword)) {
        return {
          isValid: false,
          confidence: 0.9,
          reason: `Detected non-anatomy topic: ${keyword}`,
          detectedTopics: [keyword]
        };
      }
    }

    // Detect anatomy categories
    const detectedCategories = new Set<string>();
    const detectedTerms: string[] = [];
    
    for (const [category, terms] of Object.entries(this.anatomyCategories)) {
      for (const term of terms) {
        if (lowerText.includes(term)) {
          detectedCategories.add(category);
          detectedTerms.push(term);
        }
      }
    }

    // Calculate confidence based on density of anatomy terms
    const words = lowerText.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;
    const uniqueAnatomyTerms = new Set(detectedTerms).size;
    
    const density = uniqueAnatomyTerms / Math.max(totalWords / 100, 1); // Terms per 100 words
    
    let confidence = Math.min(density, 1);
    
    // If very few anatomy terms, reject
    if (uniqueAnatomyTerms < 3 && totalWords > 100) {
      return {
        isValid: false,
        confidence,
        reason: 'Insufficient anatomy terminology',
        detectedTopics: Array.from(detectedCategories)
      };
    }

    // Generate suggestions for better anatomy focus
    const suggestions = this.generateSuggestions(detectedCategories, detectedTerms);

    return {
      isValid: true,
      confidence,
      category: detectedCategories.size > 0 ? Array.from(detectedCategories)[0] : undefined,
      detectedTopics: Array.from(detectedCategories),
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  async validateAIContent(content: any): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check flashcards
    if (content.flashcards) {
      for (let i = 0; i < content.flashcards.length; i++) {
        const card = content.flashcards[i];
        
        const frontCheck = await this.filterContent(card.front || '');
        if (!frontCheck.isValid) {
          issues.push(`Flashcard ${i + 1} front: ${frontCheck.reason}`);
        }
        
        const backCheck = await this.filterContent(card.back || '');
        if (!backCheck.isValid) {
          issues.push(`Flashcard ${i + 1} back: ${backCheck.reason}`);
        }
      }
    }

    // Check quiz questions
    if (content.questions) {
      for (let i = 0; i < content.questions.length; i++) {
        const q = content.questions[i];
        
        const questionCheck = await this.filterContent(q.text || '');
        if (!questionCheck.isValid) {
          issues.push(`Question ${i + 1}: ${questionCheck.reason}`);
        }
        
        const answerCheck = await this.filterContent(q.correctAnswer || '');
        if (!answerCheck.isValid) {
          issues.push(`Answer ${i + 1}: ${answerCheck.reason}`);
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private generateSuggestions(categories: Set<string>, terms: string[]): string[] {
    const suggestions: string[] = [];
    
    if (categories.size === 0) {
      suggestions.push('Try focusing on specific anatomical systems (e.g., skeletal, muscular, cardiovascular)');
      return suggestions;
    }

    const category = Array.from(categories)[0];
    
    // Suggest related terms from the same category
    const relatedTerms = this.anatomyCategories[category as keyof typeof this.anatomyCategories]
      ?.slice(0, 5)
      .filter(term => !terms.includes(term));
    
    if (relatedTerms?.length) {
      suggestions.push(`Consider including: ${relatedTerms.join(', ')}`);
    }

    // Suggest other categories
    const otherCategories = Object.keys(this.anatomyCategories)
      .filter(c => c !== category)
      .slice(0, 3);
    
    if (otherCategories.length) {
      suggestions.push(`Related systems to explore: ${otherCategories.join(', ')}`);
    }

    return suggestions;
  }

  extractAnatomyTerms(text: string): { term: string; category: string }[] {
    const lowerText = text.toLowerCase();
    const foundTerms: { term: string; category: string }[] = [];

    for (const [category, terms] of Object.entries(this.anatomyCategories)) {
      for (const term of terms) {
        if (lowerText.includes(term)) {
          foundTerms.push({ term, category });
        }
      }
    }

    return foundTerms;
  }
}
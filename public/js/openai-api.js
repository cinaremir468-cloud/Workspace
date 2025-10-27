// OpenAI API - Ultra Enhanced with Chart, Form, Link Support

export { generateContent, generateTitle, editContent };

const OPENAI_API_KEY = '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';
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

const SYSTEM_PROMPTS = {
    auto: `Sen bir yapay zeka asistanısın. Kullanıcının isteğine göre en uygun formatı seç ve sadece o içeriği oluştur. Açıklama yapma, direkt içeriği ver.`,
    
    note: `Sen bir not asistanısın. Kullanıcının verdiği bilgiyi kısa, öz ve net bir not formatında yaz. Açıklama yapma, sadece notu yaz.`,
    
    table: `Sen bir tablo oluşturma asistanısın. Kullanıcının isteğine göre markdown formatında tablo oluştur. Açıklama yapma, sadece tabloyu ver. Format:
| Başlık 1 | Başlık 2 | Başlık 3 |
|----------|----------|----------|
| Veri 1   | Veri 2   | Veri 3   |`,
    
    list: `Sen bir liste asistanısın. Kullanıcının isteğine göre yapılacaklar listesi oluştur. Her maddeyi "- [ ]" ile başlat. Açıklama yapma, sadece listeyi ver.`,
    
    diagram: `Sen bir Mermaid diyagram uzmanısın. SADECE GEÇERLİ VE TUTARLI MERMAID SYNTAX KULLAN.

ZORUNLU KURALLAR:
1. TÜRKÇE KARAKTERLERİ KULLANMA - Sadece İngilizce karakterler (A-Z, a-z, 0-9)
2. Her diyagram türü için doğru syntax kullan
3. Düğüm ID'leri basit olmalı (A, B, C, Start, End)
4. Etiketler kısa ve anlaşılır olmalı
5. Her satır doğru formatta olmalı

GEÇERLİ DIYAGRAM TİPLERİ:

flowchart TD
    Start[Basla] --> Process[Islemi Yap]
    Process --> Decision{Kontrol}
    Decision -->|Evet| Success[Basarili]
    Decision -->|Hayir| Error[Hata]

VEYA:

graph LR
    A[Giris] --> B[Islem]
    B --> C[Cikis]

VEYA:

sequenceDiagram
    User->>System: Istek
    System->>Database: Sorgula
    Database->>System: Sonuc
    System->>User: Yanit

DİKKAT: Açıklama yapma, sadece diyagram kodu ver. Türkçe karakter KULLANMA.`,
    
    link: `Sen bir link koleksiyonu asistanısın. Kullanıcının verdiği linkleri JSON formatında organize et:

{
  "links": [
    {
      "title": "Link Başlığı",
      "url": "https://example.com",
      "description": "Kısa açıklama"
    }
  ]
}

Açıklama yapma, sadece JSON ver.`,
    
    chart: `Sen bir Chart.js veri uzmanısın. Kullanıcının isteğine göre Chart.js için veri yapısı oluştur. JSON formatında ver:

{
  "type": "bar",
  "title": "Grafik Başlığı",
  "labels": ["Ocak", "Şubat", "Mart"],
  "datasets": [
    {
      "label": "Satışlar",
      "data": [12, 19, 3],
      "backgroundColor": "rgba(102, 126, 234, 0.8)"
    }
  ]
}

Desteklenen tipler: bar, line, pie, doughnut
Açıklama yapma, sadece JSON ver.`,
    
    form: `Sen bir form tasarım asistanısın. Kullanıcının isteğine göre form yapısı oluştur. JSON formatında ver:

{
  "title": "Form Başlığı",
  "fields": [
    {
      "type": "text",
      "label": "İsim",
      "placeholder": "Adınızı girin",
      "required": true
    },
    {
      "type": "email",
      "label": "E-posta",
      "required": true
    },
    {
      "type": "textarea",
      "label": "Mesaj",
      "rows": 4
    },
    {
      "type": "select",
      "label": "Kategori",
      "options": ["Seçenek 1", "Seçenek 2"]
    },
    {
      "type": "radio",
      "label": "Cinsiyet",
      "options": ["Erkek", "Kadın", "Diğer"]
    },
    {
      "type": "checkbox",
      "label": "İlgi Alanları",
      "options": ["Spor", "Müzik", "Teknoloji"]
    }
  ]
}

Desteklenen field tipleri: text, email, number, textarea, select, radio, checkbox
Açıklama yapma, sadece JSON ver.`
};

async function generateContent(userMessage, contentType = 'auto') {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('YOUR_')) {
        throw new Error('OpenAI API anahtarı ayarlanmamış!');
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPTS[contentType] || SYSTEM_PROMPTS.auto
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API isteği başarısız');
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();

        let detectedType = contentType;
        if (contentType === 'auto') {
            detectedType = detectContentType(content);
        }

        if (detectedType === 'diagram') {
            content = cleanDiagramContent(content);
        } else if (detectedType === 'link' || detectedType === 'chart' || detectedType === 'form') {
            content = cleanJSONContent(content);
        }

        return {
            content,
            type: detectedType,
            model: MODEL
        };

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw error;
    }
}

async function editContent(originalContent, editInstruction, contentType) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('YOUR_')) {
        throw new Error('OpenAI API anahtarı ayarlanmamış!');
    }

    try {
        const systemPrompt = `Sen bir içerik düzenleme asistanısın.

KURALLAR:
1. Orijinal formatı koru (${contentType})
2. Sadece istenilen değişiklikleri yap
3. ${contentType === 'diagram' ? 'TÜRKÇE KARAKTER KULLANMA' : 'Türkçe kullanabilirsin'}
4. ${['link', 'chart', 'form'].includes(contentType) ? 'JSON formatını koru' : ''}
5. Açıklama yapma, düzenlenmiş içeriği ver

ORİJİNAL İÇERİK TİPİ: ${contentType}`;

        const userPrompt = `Orijinal İçerik:
${originalContent}

Düzenleme Talebi:
${editInstruction}

Lütfen içeriği düzenle ve sadece düzenlenmiş içeriği ver.`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API isteği başarısız');
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();

        if (contentType === 'diagram') {
            content = cleanDiagramContent(content);
        } else if (['link', 'chart', 'form'].includes(contentType)) {
            content = cleanJSONContent(content);
        }

        return content;

    } catch (error) {
        console.error('Edit API Error:', error);
        throw error;
    }
}

async function generateTitle(userMessage) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('YOUR_')) {
        return 'Yeni Sohbet';
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'Sen bir başlık oluşturma asistanısın. 3-5 kelimelik kısa başlık oluştur. Sadece başlığı yaz.'
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 50
            })
        });

        if (!response.ok) return 'Yeni Sohbet';

        const data = await response.json();
        return data.choices[0].message.content.trim();

    } catch (error) {
        console.error('Title generation error:', error);
        return 'Yeni Sohbet';
    }
}

function detectContentType(content) {
    if (content.startsWith('{') && content.includes('"links"')) {
        return 'link';
    }
    if (content.startsWith('{') && content.includes('"type"') && content.includes('"datasets"')) {
        return 'chart';
    }
    if (content.startsWith('{') && content.includes('"fields"')) {
        return 'form';
    }
    if (content.includes('```mermaid') || content.includes('graph ') || content.includes('flowchart ') || content.includes('sequenceDiagram')) {
        return 'diagram';
    }
    if (content.includes('|') && content.includes('---')) {
        return 'table';
    }
    if (content.includes('- [ ]') || content.includes('- [x]')) {
        return 'list';
    }
    return 'note';
}

function cleanDiagramContent(content) {
    let cleaned = content;
    
    if (cleaned.includes('```mermaid')) {
        const match = cleaned.match(/```mermaid\s*([\s\S]*?)```/);
        if (match) cleaned = match[1].trim();
    } else if (cleaned.includes('```')) {
        const match = cleaned.match(/```\s*([\s\S]*?)```/);
        if (match) cleaned = match[1].trim();
    }
    
    cleaned = cleaned
        .replace(/ü/gi, 'u')
        .replace(/ö/gi, 'o')
        .replace(/ş/gi, 's')
        .replace(/ı/gi, 'i')
        .replace(/ğ/gi, 'g')
        .replace(/ç/gi, 'c')
        .replace(/İ/g, 'I');
    
    return cleaned.trim();
}

function cleanJSONContent(content) {
    let cleaned = content;
    
    if (cleaned.includes('```json')) {
        const match = cleaned.match(/```json\s*([\s\S]*?)```/);
        if (match) cleaned = match[1].trim();
    } else if (cleaned.includes('```')) {
        const match = cleaned.match(/```\s*([\s\S]*?)```/);
        if (match) cleaned = match[1].trim();
    }
    
    return cleaned.trim();
}

console.log('✅ OpenAI API loaded (Ultra Enhanced)');

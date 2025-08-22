import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { MODEL_NAME } from '../constants';
import type { VideoOptions, BaseImage, GeneratedPrompts, StoryboardImage, DirectorStyle, ChatMessage, ObjectRole, VideoModel } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// --- Video Generation Service (Single Mode) ---
export async function generateVideo(prompt: string, options: VideoOptions, image: BaseImage | null, model: VideoModel): Promise<any> {
    const config: any = {
      numberOfVideos: 1,
      aspectRatio: options.aspectRatio,
    };
    
    const requestPayload: any = {
        model: model,
        prompt: prompt,
        config: config,
    };

    if (image) {
        requestPayload.image = {
            imageBytes: image.base64,
            mimeType: image.mimeType,
        };
    }

    try {
        return await ai.models.generateVideos(requestPayload);
    } catch (error) {
        console.error("Error starting video generation:", error);
        throw new Error(`Failed to start video generation. ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function pollVideoStatus(
    operation: any, 
    onUpdate: (op: any) => void
): Promise<any> {
    let currentOperation = operation;
    while (!currentOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
            currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
            onUpdate(currentOperation);
        } catch (error) {
            console.error("Error during polling:", error);
            throw new Error(`Failed to poll video status. ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    if(currentOperation.error) {
        throw new Error(`Video generation failed with code ${currentOperation.error.code}: ${currentOperation.error.message}`);
    }

    return currentOperation;
}

export async function fetchVideoBlob(downloadLink: string): Promise<string> {
    try {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to download video. Status: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Error fetching video blob:", error);
        throw new Error(`Failed to download video file. ${error instanceof Error ? error.message : String(error)}`);
    }
}

// --- Audio Generation Service (Storyboard Mode) ---
export async function generateAudioNarration(text: string): Promise<string> {
    console.log(`Simulating TTS generation for: "${text}"`);
    await new Promise(resolve => setTimeout(resolve, 2500));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id-ID&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok, status: ${response.status}`);
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Error fetching narration audio:", error);
        throw new Error("Failed to generate audio narration.");
    }
}


// --- Prompt Generation Services (Storyboard Mode) ---
const styleDescriptions: Record<DirectorStyle, string> = {
    ['NONE']: 'seimbang, profesional, dan bersih.',
    ['CINEMATIC_NOIR']: 'bergaya Sinematik Noir. Gunakan pencahayaan kontras tinggi, bayangan dramatis, dan suasana misterius.',
    ['VIBRANT_ENERGETIC']: 'bergaya Cerah & Energik. Gunakan warna-warna berani, potongan cepat, dan suasana optimis berenergi tinggi.',
    ['DREAMY_ETHEREAL']: 'bergaya Halus & Ethereal. Gunakan fokus lembut, overexposure, dan suasana magis yang sureal.',
    ['GRITTY_REALISTIC']: 'bergaya Kasar & Realistis. Gunakan gerakan kamera genggam, pencahayaan alami, dan suasana otentik seperti dokumenter.',
    ['EPIC_SWEEPING']: 'bergaya Epik & Megah. Gunakan bidikan pemandangan yang luas dan agung serta suasana yang megah dan menakjubkan.',
};

const mainSystemPrompt = `Anda adalah seorang Sutradara dan Penulis Naskah kelas dunia dari Indonesia. Tugas Anda adalah mengubah ide singkat pengguna menjadi naskah video sinematik yang kaya dan lengkap dalam **Bahasa Indonesia**.

**ATURAN WAJIB:**
1.  **Analisis Mendalam**: Baca "Ide Utama" pengguna dan analisis semua "Aset Visual" (Gambar Latar, Aktor, Properti) untuk memahami esensi cerita, suasana, dan detail visual.
2.  **Gaya Sutradara**: Terapkan "Gaya Sutradara" yang dipilih pengguna ke dalam setiap aspek naskah, mulai dari pencahayaan, gerakan kamera, hingga suasana.
3.  **Struktur Naskah**: Naskah Anda HARUS mengikuti format berikut dengan tepat:
    *   **Paragraf Pembuka (Overture)**: Satu paragraf deskriptif yang kaya, melukiskan suasana, karakter, dan latar secara detail. Ini adalah fondasi dari seluruh adegan.
    *   **5 Adegan (Scenes)**: Tulis LIMA adegan yang dinumerasi (Adegan 1, Adegan 2, dst.). Setiap adegan harus mendeskripsikan satu bidikan atau aksi spesifik yang membangun cerita secara visual. Gunakan istilah sinematik (misalnya, "close-up", "kamera meluncur perlahan", "pan yang mulus") untuk memberikan instruksi yang jelas.
4.  **Bahasa**: Seluruh output HARUS dalam Bahasa Indonesia yang indah, puitis, dan sinematik.
5.  **Output Tunggal**: Hasil akhir Anda hanyalah teks naskah. JANGAN tambahkan penjelasan, komentar, atau format JSON.

---
**CONTOH OUTPUT IDEAL:**

Adegan dibuka di sebuah ruang studio minimalis yang diterangi cahaya hangat, bermandikan cahaya alami yang lembut. Dindingnya berwarna terakota yang mengundang, dilengkapi dengan tirai krem tinggi dan menjuntai... (dan seterusnya)

Adegan 1: Kamera meluncur perlahan ke depan, memperlihatkan wanita yang berdiri dengan percaya diri... (dan seterusnya)

Adegan 2: Sebuah close-up berfokus pada kain dan tekstur atasan... (dan seterusnya)
... (dan adegan lainnya)
---
`;

export async function getCreativeSpark(mainBrief: string): Promise<string> {
    const prompt = `Anda adalah seorang ahli kreativitas. Berdasarkan ide naskah pengguna, berikan SATU saran tunggal yang tak terduga dan inspiratif dalam Bahasa Indonesia untuk membuatnya lebih unik. Saran tersebut harus berupa kalimat pendek yang dapat ditindaklanjuti. Jangan menjelaskan diri Anda.
    Ide Naskah Pengguna: "${mainBrief}"
    Saran mengejutkan Anda (dalam Bahasa Indonesia):`;
    try {
        const genAI = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings });
        const result = await genAI.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("Error getting creative spark:", error);
        throw new Error("Could not get a creative spark at this moment.");
    }
}

export async function generateChatTitle(firstMessage: string): Promise<string> {
    const prompt = `Generate a very short, descriptive title (3-5 words max) for a chat session based on this first user message. The title should be in the same language as the message.
User Message: "${firstMessage}"
Title:`;
    try {
        const genAI = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings });
        const result = await genAI.generateContent(prompt);
        return result.response.text().trim().replace(/"/g, ''); // Remove quotes
    } catch (error) {
        console.error("Error generating chat title:", error);
        return "New Chat"; // Fallback
    }
}

export async function translateText(
    sourceText: string,
    sourceLang: 'english' | 'indonesian',
    targetLang: 'english' | 'indonesian'
): Promise<string> {
    if (!sourceText.trim()) return "";

    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Your response must ONLY be the raw translated text.`;
    try {
        const genAI = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings });
        const result = await genAI.generateContent(`${prompt}\n\n"${sourceText}"`);
        return result.response.text().trim();
    } catch (error) {
        console.error("Error translating text:", error);
        throw new Error(`Failed to translate. ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function startChat() {
    const chatSystemPrompt = `You are a "Creative Co-Pilot", a visually-aware brainstorming partner in Bahasa Indonesia. Your goal is to help a user develop their script idea.
- **Be Proactive & Visual:** Every suggestion you make MUST reference the visual elements in the provided images (The Set, Actors, Props).
- **Ask Guiding Questions:** Help the user think deeper about their idea based on what you "see".
- **Offer Concrete, Actionable Ideas:** Propose specific shots, actions, or moods that can be directly added to a script.
- **Keep it Conversational & Encouraging:** Your tone is like a helpful creative partner.
- **Analyze Images First:** Before responding, briefly state what you see to establish context. For example: "Oke, saya lihat kita punya set di ruangan minimalis yang hangat dengan seorang model. Titik awal yang bagus! Perasaan apa yang ingin kakak tonjolkan?"
`;
    const genAI = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings, systemInstruction: chatSystemPrompt });
    const chat = genAI.startChat({ history: [] });

    const sendMessage = async (
        backgroundImage: BaseImage | null,
        objectImages: StoryboardImage[],
        history: ChatMessage[]
    ): Promise<string> => {
        const parts: any[] = [];
        
        const latestMessage = history[history.length - 1];
        if (!latestMessage || latestMessage.role !== 'user') {
            throw new Error("sendMessage was called without a valid user message.");
        }

        const isFirstUserMessage = history.filter(m => m.role === 'user').length === 1;
        
        // Build a combined prompt for the first message
        if (isFirstUserMessage) {
            let firstPrompt = latestMessage.text;
            if (backgroundImage) {
                firstPrompt += "\n\nIni adalah gambar latar (set):";
                parts.push({ inlineData: { mimeType: backgroundImage.mimeType, data: backgroundImage.base64 } });
            }
            if (objectImages.length > 0) {
                firstPrompt += "\nDan ini adalah gambar aktor/properti:";
                objectImages.forEach(img => {
                    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
                });
            }
            parts.unshift({text: firstPrompt});
        } else {
             parts.push({ text: latestMessage.text });
        }
        
        const result = await chat.sendMessage(parts);
        return result.response.text().trim();
    };

    return { sendMessage };
}

export async function summarizeChatIntoBrief(history: ChatMessage[]): Promise<string> {
    const chatTranscript = history.map(msg => `${msg.role === 'user' ? 'Sutradara' : 'Asisten AI'}: ${msg.text}`).join('\n\n');
    
    const systemPrompt = `Anda adalah seorang Editor Naskah profesional. Tugas Anda adalah membaca dialog brainstorming berikut dan menyimpulkannya menjadi satu 'Ide Utama' (Main Brief) yang koheren untuk generator naskah video. Output HARUS dalam Bahasa Indonesia.

---
${chatTranscript}
---

**Ide Utama Final (dalam Bahasa Indonesia):**`;

    try {
        const genAI = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings });
        const result = await genAI.generateContent(systemPrompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("Error summarizing chat:", error);
        throw new Error("Could not summarize the script at this moment.");
    }
}


export async function generatePromptFromStoryboard(
    mainBrief: string,
    backgroundImage: BaseImage | null,
    objectImages: StoryboardImage[],
    directorStyle: DirectorStyle
): Promise<GeneratedPrompts> {
    const parts: any[] = [];
    
    const styleInstruction = styleDescriptions[directorStyle];
    
    let prompt = `${mainSystemPrompt}\n\nSekarang, laksanakan tugas ini untuk permintaan berikut:\n**Ide Utama Pengguna:** "${mainBrief}"\n**Gaya Sutradara:** ${styleInstruction}`;
    parts.push({ text: prompt });

    if (backgroundImage) {
        parts.push({ text: "\n\n[Aset Visual: Gambar Latar]" });
        parts.push({ inlineData: { mimeType: backgroundImage.mimeType, data: backgroundImage.base64 } });
    }
    if (objectImages.length > 0) {
        parts.push({ text: "\n\n[Aset Visual: Aktor/Properti]" });
        objectImages.forEach((img) => {
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        });
    }
    
    try {
        const genAI = ai.getGenerativeModel({ model: 'gemini-1.5-flash-latest', safetySettings });
        const result = await genAI.generateContent({ contents: [{ parts: parts }] });
        
        return result.response.text().trim();

    } catch (error) {
        console.error("Error generating prompt:", error);
        throw new Error(`Failed to generate prompt. ${error instanceof Error ? error.message : String(error)}`);
    }
}

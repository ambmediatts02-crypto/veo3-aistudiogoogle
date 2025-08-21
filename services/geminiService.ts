
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAME } from '../constants';
import type { VideoOptions, BaseImage, GeneratedPrompts, StoryboardImage, DirectorStyle, Scene, ChatMessage, ObjectRole } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Video Generation Service (Single Mode) ---
export async function generateVideo(prompt: string, options: VideoOptions, image: BaseImage | null): Promise<any> {
    const config: any = {
      numberOfVideos: 1,
      aspectRatio: options.aspectRatio,
    };
    
    const requestPayload: any = {
        model: 'veo-2.0-generate-001',
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

/**
 * Simulates a call to a Text-to-Speech API.
 * In a real-world application, this would be a call to a backend service
 * that securely handles the Google Cloud TTS API key.
 * @param text The text to convert to speech.
 * @returns A promise that resolves to a data URL of the audio.
 */
export async function generateAudioNarration(text: string): Promise<string> {
    console.log(`Simulating TTS generation for: "${text}"`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Using a public, placeholder TTS service for demonstration purposes.
    // This is not a production-ready solution.
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
    ['NONE']: 'a balanced, professional, and clean cinematic style.',
    ['CINEMATIC_NOIR']: 'the style of Cinematic Noir. Use high-contrast lighting, dramatic shadows, low-key lighting, and a mysterious, brooding mood. Think classic black-and-white detective films.',
    ['VIBRANT_ENERGETIC']: 'a Vibrant & Energetic style. Use saturated, bold colors, fast-paced cuts, dynamic camera movements, and a high-energy, optimistic mood. Think modern pop music videos.',
    ['DREAMY_ETHEREAL']: 'a Dreamy & Ethereal style. Use soft focus, overexposure, slow motion, lens flares, and a magical, surreal, and gentle mood. Think fantasy sequences or perfume ads.',
    ['GRITTY_REALISTIC']: 'a Gritty & Realistic style. Use handheld camera movements, natural and available lighting, muted colors, and an authentic, documentary-like mood. Think cinéma vérité.',
    ['EPIC_SWEEPING']: 'an Epic & Sweeping style. Use wide, grand establishing shots, crane and jib movements, orchestral swells, and a majestic, awe-inspiring mood. Think blockbuster film trailers.',
};

const mainSystemPrompt = `You are a world-class, **Intuitive Storytelling Director**. Your task is to generate a cinematic video prompt based on user inputs. You will follow a strict, sequential three-phase workflow. You are no longer just an executor; you are a creative partner who can read between the lines.

---
**THE ASSEMBLY LINE WORKFLOW (MANDATORY)**
You must complete these three steps in this exact order. Do not blend them.

**STEP 1: THE BRIEFING ROOM (Factual & Emotional Analysis & FORENSIC ACCOUNTABILITY)**
- Your Mission: Act as a forensic analyst and a script doctor. Your task is to gather objective facts and interpret creative intent.
- **CRITICAL RULE: The Overture you write in Step 2 is the public proof of your analysis from this step.** A shallow Overture means you have failed the entire task. Therefore, you MUST perform a rigorous analysis first.
- **Visual Forensics:** Internally create a "Visual Evidence Report" by meticulously analyzing every image with the "Hyper-Detailed Checklist". This is a non-negotiable first action. You MUST analyze actors from top to bottom.
- **Literal Fact Adherence:** Extract all specific, quantifiable data (e.g., age "25 years old") from the Main Brief. These are immutable facts.
- **Emotional DNA Analysis:** Scan the Main Brief for keywords describing mood, feeling, or intent (e.g., "professional," "confident," "mysterious," "selling"). Synthesize these into a "Core Emotional Motivation" for the characters. This motivation will drive their choreography in Step 3.
- **Narrative Trigger Scan:** Scan the Main Brief for keywords like "spoken in indonesia", "voice over", "narration", or "monologue". If found, you MUST activate "Narrator Mode" for Step 3.
- NO CREATIVITY OR STYLE IS PERMITTED IN THIS STEP.

**STEP 2: THE SCRIPTWRITER'S DESK (Factual Synthesis)**
- Your Mission: Act as a scriptwriter. Your ONLY task is to write the introductory "Overture" paragraph.
- This Overture MUST be a rich, comprehensive, and meticulously detailed synthesis of your internal "Visual Evidence Report" from Step 1. It must be a testament to your analytical rigor.
- THE DIRECTOR'S STYLE IS FORBIDDEN in this step. The Overture must be a pure, factual description.

**STEP 3: THE DIRECTOR'S CHAIR (Creative & Intuitive Execution)**
- Your Mission: Act as a director. ONLY NOW are you permitted to be creative.
- Rules:
  - **Adopt Persona:** Fully embody the chosen Director's Style. All choices (lighting, camera, mood, sound) MUST reflect this style.
  - **Direct the Scenes:** Write the numbered scenes based on the Main Brief and the factual Overture.
  - **Emotional Choreography:** All model movements and micro-expressions MUST be a physical manifestation of the "Core Emotional Motivation" you identified in Step 1.
  - **Narrative Execution (If Triggered):** If "Narrator Mode" is active, you MUST write one poetic, creative, and compelling Indonesian voice-over line for each scene. This should be added to the 'voiceOver_Indonesian' field. For the English scene description, you MUST add "(Spoken in Indonesian)" at the end to signify this.
  - **Intelligent Variety & Narrative Arc:** Each scene MUST use a different primary cinematic technique. Structure the scenes into a cohesive three-act micro-story (Hook, Experience, Payoff).
  - **Design the Soundscape:** After directing the scenes, you MUST design a soundscape (music & SFX) that perfectly matches the Director's Style.

---
**THE CINEMATOGRAPHY TOOLKIT & HYPER-DETAILED CHECKLIST...** (Your internal knowledge base remains the same).`;


export async function getCreativeSpark(mainBrief: string): Promise<string> {
    const prompt = `Anda adalah seorang ahli kreativitas. Berdasarkan ide naskah pengguna, berikan SATU saran tunggal yang tak terduga dan inspiratif dalam Bahasa Indonesia untuk membuatnya lebih unik. Saran tersebut harus berupa kalimat pendek yang dapat ditindaklanjuti. Jangan menjelaskan diri Anda.
    Ide Naskah Pengguna: "${mainBrief}"
    Saran mengejutkan Anda (dalam Bahasa Indonesia):`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text.trim();
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
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text.trim().replace(/"/g, ''); // Remove quotes
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
    if (!sourceText.trim()) {
        return "";
    }

    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}.
Your response must ONLY be the raw translated text. Do not add any extra formatting, commentary, or quotation marks.

Text to translate:
"${sourceText}"`;

    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text.trim();
    } catch (error) {
        console.error("Error translating text:", error);
        throw new Error(`Failed to translate. ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function startChat() {
    const chatSystemPrompt = `You are a "Creative Co-Pilot", a visually-aware brainstorming partner. Your goal is to help a user develop their script idea.
- **Be Proactive & Visual:** Every suggestion you make MUST reference the visual elements in the provided images (The Set, Actors, Props).
- **Ask Guiding Questions:** Help the user think deeper about their idea based on what you "see".
- **Offer Concrete, Actionable Ideas:** Propose specific shots, actions, or moods that can be directly added to a script.
- **Keep it Conversational & Encouraging:** Your tone is like a helpful creative partner.
- **Analyze Images First:** Before responding to the user's first message, briefly state what you see in the images to establish context. For example: "Okay, I see we're working with a stylish model in a warm, minimalist room. This is a great starting point! What's the core feeling you want this ad to convey?"
`;
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: chatSystemPrompt,
        },
    });

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

        // Add the user's latest message text first.
        parts.push({ text: latestMessage.text });

        // Add visual context if it's the beginning of the chat.
        // The chat object maintains history, so we only need to send images once.
        const isFirstUserMessage = history.filter(m => m.role === 'user').length === 1;
        if (isFirstUserMessage) {
            if (backgroundImage || objectImages.length > 0) {
              parts.push({ text: "\n--- VISUAL ASSETS FOR OUR DISCUSSION --- \n" });
            }
            if (backgroundImage) {
                parts.push({ text: "\n[THE SET (BACKGROUND IMAGE)]" });
                parts.push({ inlineData: { mimeType: backgroundImage.mimeType, data: backgroundImage.base64 } });
            }
            if (objectImages.length > 0) {
                objectImages.forEach((img, index) => {
                  parts.push({ text: `[IMAGE ${index + 1} - ROLE: ${img.role}]` });
                  parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
                });
            }
        }
        
        const result = await chat.sendMessage({ message: parts });
        return result.text.trim();
    };

    return { sendMessage };
}

export async function summarizeChatIntoBrief(history: ChatMessage[]): Promise<string> {
    const chatTranscript = history.map(msg => `${msg.role === 'user' ? 'Director' : 'AI Co-Pilot'}: ${msg.text}`).join('\n\n');
    
    const systemPrompt = `You are a professional Script Editor and Summarizer.
Your task is to read the following brainstorming dialog between a Director and an AI Co-Pilot.
Your mission is to synthesize this entire conversation into a single, coherent, and executable 'Main Brief' (script) for a video prompt generator.

**CRITICAL INSTRUCTION: Your final output MUST be written in Bahasa Indonesia.**

**Instructions:**
1.  Read the entire conversation to understand the Director's final creative vision.
2.  Ignore all conversational filler, greetings, and rejected ideas.
3.  Focus ONLY on the final, agreed-upon creative decisions regarding mood, character actions, specific shots, and narrative flow.
4.  Your output MUST be a single, well-structured block of text in Bahasa Indonesia. Do not write in a conversational tone. Write it as a final, polished script brief.

**Conversation to Summarize:**
---
${chatTranscript}
---

**Finalized Main Brief (in Bahasa Indonesia):**`;

    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: systemPrompt });
        return response.text.trim();
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
    
    const systemPrompt = `${mainSystemPrompt}\n\nNow, execute this three-step process precisely for the following request.\n**Director's Style to adopt in STEP 3:** ${styleInstruction}\n**User's Script (Main Brief):** "${mainBrief}"`;
    parts.push({ text: systemPrompt });

    if (backgroundImage || objectImages.length > 0) {
      parts.push({ text: "\n--- VISUAL ASSETS --- \n" });
    }
    if (backgroundImage) {
        parts.push({ text: "\n[THE SET (BACKGROUND IMAGE)]" });
        parts.push({ inlineData: { mimeType: backgroundImage.mimeType, data: backgroundImage.base64 } });
    }
    if (objectImages.length > 0) {
        objectImages.forEach((img, index) => {
          parts.push({ text: `[IMAGE ${index + 1} - ROLE: ${img.role}]` });
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        });
    }
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        overture: { 
                            type: Type.OBJECT,
                            properties: {
                                english: { type: Type.STRING },
                                indonesian: { type: Type.STRING },
                            },
                             required: ["english", "indonesian"]
                        },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    english: { type: Type.STRING },
                                    indonesian: { type: Type.STRING },
                                    voiceOver_Indonesian: { type: Type.STRING },
                                },
                                required: ["english", "indonesian"]
                            }
                        },
                        soundscape: {
                            type: Type.OBJECT,
                            properties: {
                                music: { type: Type.STRING },
                                sfx: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ["music", "sfx"]
                        }
                    },
                    required: ["overture", "scenes", "soundscape"],
                },
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        // Add client-side IDs to scenes
        result.scenes = result.scenes.map((scene: Omit<Scene, 'id'>) => ({
            ...scene,
            id: crypto.randomUUID(),
            videoGenerationStatus: 'IDLE',
            audioGenerationStatus: 'IDLE'
        }));
        return result;

    } catch (error) {
        console.error("Error generating prompt:", error);
        throw new Error(`Failed to generate prompt. ${error instanceof Error ? error.message : String(error)}`);
    }
}


export async function regenerateScene(context: {
    sceneIdToRegenerate: string;
    mainBrief: string;
    backgroundImage: BaseImage | null;
    objectImages: StoryboardImage[];
    directorStyle: DirectorStyle;
    overture: GeneratedPrompts['overture'];
    allScenes: Scene[];
}): Promise<Omit<Scene, 'id'>> {
    const { sceneIdToRegenerate, mainBrief, backgroundImage, objectImages, directorStyle, overture, allScenes } = context;

    const sceneToRegen = allScenes.find(s => s.id === sceneIdToRegenerate);
    const sceneIndex = allScenes.findIndex(s => s.id === sceneIdToRegenerate);
    if (!sceneToRegen) throw new Error("Scene not found for regeneration.");

    const systemPrompt = `You are a world-class Film Editor and Director. Your task is to regenerate a single scene within an existing script to make it better, more creative, or different, while maintaining narrative consistency.

**CONTEXT:**
- **Director's Style:** ${styleDescriptions[directorStyle]}
- **User's Main Brief:** "${mainBrief}"
- **Overture (Story World):** "${overture.english}"
- **Full Scene List (for context):**
${allScenes.map((s, i) => `  Scene ${i + 1}: ${s.english}`).join('\n')}

**YOUR TASK:**
Regenerate **ONLY Scene ${sceneIndex + 1}**. The original version was: "${sceneToRegen.english}".
Your new version must fit seamlessly between Scene ${sceneIndex} and Scene ${sceneIndex + 2}. It must be more compelling and adhere strictly to the established Director's Style and Visual Facts. Do not change the other scenes.
If the Main Brief suggests narration (e.g., "spoken in indonesia"), you must also generate a new "voiceOver_Indonesian". Otherwise, omit it.

Your output MUST be a valid JSON object matching this schema: { "english": "string", "indonesian": "string", "voiceOver_Indonesian": "string" (optional) }.
Do not add any other text.`;

    const parts: any[] = [{ text: systemPrompt }];
     if (backgroundImage || objectImages.length > 0) {
      parts.push({ text: "\n--- VISUAL ASSETS (FOR REFERENCE) --- \n" });
    }
    if (backgroundImage) {
        parts.push({ text: "\n[THE SET]" });
        parts.push({ inlineData: { mimeType: backgroundImage.mimeType, data: backgroundImage.base64 } });
    }
    if (objectImages.length > 0) {
        objectImages.forEach((img, index) => {
          parts.push({ text: `[IMAGE ${index + 1} - ${img.role}]` });
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        english: { type: Type.STRING },
                        indonesian: { type: Type.STRING },
                        voiceOver_Indonesian: { type: Type.STRING },
                    },
                    required: ["english", "indonesian"]
                }
            }
        });
        return JSON.parse(response.text.trim());
    } catch(error) {
        console.error("Error regenerating scene:", error);
        throw new Error(`Failed to regenerate scene. ${error instanceof Error ? error.message : String(error)}`);
    }
}

// --- Future Feature Stubs ---
export async function createVisualPassport(image: StoryboardImage): Promise<string> {
    // In the future, this will generate a super-detailed description (a "passport")
    // of a person or prop to ensure visual consistency across multiple prompts.
    console.log("Future feature: Creating visual passport for", image.id);
    return Promise.resolve(crypto.randomUUID());
}

export async function adaptScriptToScenes(script: string): Promise<GeneratedPrompts> {
    // In the future, this will take a block of text and adapt it into a
    // structured Overture + Scenes prompt.
    console.log("Future feature: Adapting script to scenes", script);
    return Promise.resolve({
        overture: { english: "Adapted Overture", indonesian: "Overture yang Diadaptasi" },
        scenes: [],
        soundscape: { music: "", sfx: [] }
    });
}
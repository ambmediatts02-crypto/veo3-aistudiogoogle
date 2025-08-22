export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum AspectRatio {
  SIXTEEN_NINE = '16:9',
  NINE_SIXTEEN = '9:16',
}

export enum GenerationMode {
  SINGLE = 'SINGLE',
  STORYBOARD = 'STORYBOARD',
  ADAPT_FROM_TEXT = 'ADAPT_FROM_TEXT', // For future feature
}

export enum DirectorStyle {
  NONE = 'NONE',
  CINEMATIC_NOIR = 'CINEMATIC_NOIR',
  VIBRANT_ENERGETIC = 'VIBRANT_ENERGETIC',
  DREAMY_ETHEREAL = 'DREAMY_ETHEREAL',
  GRITTY_REALISTIC = 'GRITTY_REALISTIC',
  EPIC_SWEEPING = 'EPIC_SWEEPING',
}

export enum VideoModel {
  VEO_2 = 'veo-2.0-generate-001',
  VEO_3 = 'veo-3.0-generate-preview',
}

export interface VideoOptions {
  aspectRatio: AspectRatio;
}

export interface BaseImage {
  id: string;
  file: File;
  base64: string;
  mimeType: string;
}

export enum ObjectRole {
  PERSON = 'PERSON',
  PROP = 'PROP',
}

export interface StoryboardImage extends BaseImage {
  role: ObjectRole;
  isLocked?: boolean; // For future Visual Consistency feature
  visualPassportId?: string; // For future Visual Consistency feature
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  history: ChatMessage[];
  isPinned: boolean;
  createdAt: number;
}

export type GeneratedPrompts = string;

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  // Common
  mode: GenerationMode;
  // Single Scene State
  singlePrompt: string;
  singleReferenceImage: BaseImage | null;
  generatedVideoUrl: string | null;
  videoModel: VideoModel;
  // Storyboard State
  mainBrief: string;
  backgroundImage: BaseImage | null;
  objectImages: StoryboardImage[];
  directorStyle: DirectorStyle;
  generatedPrompts: GeneratedPrompts | null;
}

export interface FileInputData { mimeType: string; data: string; }

export interface GridFormData {
  client: string; brandFiles: FileInputData[]; offer: string;
  month: string; postCount: number; focus: string[];
  formats: string; comments?: string;
}

export interface VideoDetails {
  numEscenas: number; promptsEscenasMidjourney: string[];
  promptsVideoAI: string[]; videoAITool: string;
}

export interface Post {
  dia: number; ideaPrincipal: string; enfoquePublicacion: string;
  copyIn: string; copyOut: string; explicacionArte: string;
  formatoArte: "Imagen" | "Video"; masterPromptMidjourney: string;
  videoDetails?: VideoDetails; pasoAPaso: string;
}

export interface ContentGridData {
  posts: Post[];
  creditos: { min: number; max: number; summary: string };
}

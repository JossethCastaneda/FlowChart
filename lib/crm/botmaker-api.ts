/**
 * BotMaker API Client
 * Wraps external calls to the BotMaker API.
 */
export class BotMakerClient {
  private apiKey: string;
  private baseUrl = "https://api.botmaker.com/v2.0";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchAPI(endpoint: string, options?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "access-token": this.apiKey,
        ...(options?.headers || {}),
      },
    });
    
    if (!res.ok) {
      throw new Error(`BotMaker API Error: ${res.statusText}`);
    }
    
    return res.json();
  }

  async getChannels() {
    return this.fetchAPI("/channels");
  }
  
  async getBotErrors() {
    return this.fetchAPI("/bot/errors"); // Note: Example endpoint
  }

  async getVariables() {
    return this.fetchAPI("/variables");
  }

  async analyzeFlow(data: any) {
    return this.fetchAPI("/flows/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

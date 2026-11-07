import { Mistral } from '@mistralai/mistralai';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const MODEL = 'mistral-small-latest';

let client: Mistral | null = null;

function getClient(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error(
      'MISTRAL_API_KEY non impostata: creala in un file .env (vedi .env.example)'
    );
  }
  if (!client) {
    client = new Mistral({ apiKey });
  }
  return client;
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const res = await getClient().chat.complete({ model: MODEL, messages });
  const content = res.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk) => ('text' in chunk && typeof chunk.text === 'string' ? chunk.text : ''))
      .join('');
  }
  return '';
}

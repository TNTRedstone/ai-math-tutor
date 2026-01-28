import { GROQ_CLOUD_API_KEY } from '$env/static/private';
import Groq from 'groq-sdk';

export const config = { maxDuration: 60 };

const groq = new Groq({ apiKey: GROQ_CLOUD_API_KEY });

export async function POST({ request }) {
    const { systemPrompt, reasoning_effort } = await request.json();

    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: ''
            }
        ],
        model: 'openai/gpt-oss-120b',
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        stream: false,
        reasoning_effort: reasoning_effort,
        stop: null
    });

	return new Response(chatCompletion.choices[0]?.message?.content || '');
}

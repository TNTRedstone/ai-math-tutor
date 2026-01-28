import { promptStep1Gen, promptStep2Gen, promptStep3Gen } from './prompt-gen';
import type { ReasoningEffort, Message, CheckDiagnostics } from './types';
import { browser } from '$app/environment';

let loadingStatus = $state('none');
const STORAGE_KEY = 'ai-tutor-conversation';

function loadConversationFromStorage() {
	if (!browser) return { messages: [] as Message[], rateLimitedUntil: 0 };

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return {
				messages: parsed.messages || [],
				rateLimitedUntil: parsed.rateLimitedUntil || 0
			};
		}
	} catch (e) {
		console.warn('Failed to load conversation from localStorage:', e);
	}

	return { messages: [] as Message[], rateLimitedUntil: 0 };
}

export function saveConversationToStorage() {
	if (!browser) return;

	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				messages: conversation.messages,
				rateLimitedUntil: conversation.rateLimitedUntil
			})
		);
	} catch (e) {
		console.warn('Failed to save conversation to localStorage:', e);
	}
}

export const conversation = $state(loadConversationFromStorage());

async function triggerSendMessage(systemPrompt: string, reasoning_effort: ReasoningEffort) {
	const response = await fetch('/api/send-message', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ systemPrompt, reasoning_effort })
	});

	if (response.status === 429) {
		const body = await response.json();
		const seconds = parseInt(body.retryAfter || '60', 10);
		conversation.rateLimitedUntil = Date.now() + seconds * 1000;
		throw new Error('RATE_LIMIT');
	}

	if (!response.ok) throw new Error(`API Error: ${await response.text()}`);
	return await response.text();
}

export async function sendUserMessage(message: string) {
	conversation.messages = [...conversation.messages, { sender: 'user', contents: message }];
	try {
		await generateOutput('', 0);
	} catch (e: any) {
		if (e.message === 'RATE_LIMIT') {
			conversation.messages = [
				...conversation.messages,
				{
					sender: 'model',
					contents: 'Rate limit reached. Please wait a moment before trying again.'
				}
			];
		}
	}
}

async function generateOutput(diagnosticsNotes: string, attempt: number) {
	if (attempt > 3) {
		conversation.messages = [
			...conversation.messages,
			{
				sender: 'model',
				contents: "I'm having trouble processing this math right now. Please try rephrasing."
			}
		];
		return;
	}
	loadingStatus = 'Planning how to best help you';
	const plan = await triggerSendMessage(
		promptStep1Gen(conversation.messages, diagnosticsNotes),
		'medium'
	);

	loadingStatus = 'Writing a response';
	const output = await triggerSendMessage(promptStep2Gen(plan), 'medium');
	loadingStatus = 'Checking the response for safety';
	const diagnosticsString = await triggerSendMessage(promptStep3Gen(output, plan), 'medium');

	let diagnostics: CheckDiagnostics;
	try {
		diagnostics = JSON.parse(diagnosticsString);
	} catch (e) {
		diagnostics = { succeeds: true, notes: 'Auditor returned invalid JSON.' };
	}

	if (diagnostics.succeeds) {
		conversation.messages = [
			...conversation.messages,
			{
				sender: 'model',
				contents: output
			}
		];
	} else {
		await generateOutput(diagnostics.notes || 'General failure', attempt + 1);
	}
}

export function resetConversation() {
	conversation.messages = [];
	conversation.rateLimitedUntil = 0;
	if (browser) {
		localStorage.removeItem(STORAGE_KEY);
	}
}

export function getloadingStatus() {
	return loadingStatus;
}

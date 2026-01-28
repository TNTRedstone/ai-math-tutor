import { promptStep1Gen, promptStep2Gen, promptStep3Gen } from './prompt-gen';
import type { ReasoningEffort, Message, CheckDiagnostics } from './types';

export const conversation = $state({
	messages: [] as Message[],
	rateLimitedUntil: 0
});

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

	const plan = await triggerSendMessage(
		promptStep1Gen(conversation.messages, diagnosticsNotes),
		'medium'
	);

	const output = await triggerSendMessage(promptStep2Gen(plan), 'medium');
	const diagnosticsString = await triggerSendMessage(promptStep3Gen(output, plan), 'medium');

	let diagnostics: CheckDiagnostics;
	try {
		diagnostics = JSON.parse(diagnosticsString);
	} catch (e) {
		diagnostics = { succeeds: false, notes: 'Auditor returned invalid JSON.' };
	}

	if (diagnostics.succeeds) {
		conversation.messages = [...conversation.messages, { sender: 'model', contents: output }];
	} else {
		await generateOutput(diagnostics.notes || 'General failure', attempt + 1);
	}
}

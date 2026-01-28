import { promptStep1Gen, promptStep2Gen, promptStep3Gen } from './prompt-gen';
import type { ReasoningEffort, Message, CheckDiagnostics } from './types';

export const conversation = $state({
	messages: [] as Message[]
});

async function triggerSendMessage(systemPrompt: string, reasoning_effort: ReasoningEffort) {
	const response = await fetch('/api/send-message', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ systemPrompt, reasoning_effort })
	});

	if (!response.ok) throw new Error(`API Error: ${await response.text()}`);
	return await response.text();
}

export async function sendUserMessage(message: string) {
	conversation.messages = [...conversation.messages, { sender: 'user', contents: message }];
	await generateOutput('', 0); // Track attempts to prevent infinite loops
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

	// Safety for malformed JSON from Auditor
	let diagnostics: CheckDiagnostics;
	try {
		diagnostics = JSON.parse(diagnosticsString);
	} catch (e) {
		diagnostics = { succeeds: false, notes: 'Auditor returned invalid JSON.' };
	}


	if (diagnostics.succeeds) {
		conversation.messages = [...conversation.messages, { sender: 'model', contents: output }];
		console.log(output)
	} else {
		// Recursive retry with failure notes
		await generateOutput(diagnostics.notes || 'General failure', attempt + 1);
	}
}

<script lang="ts">
	import { sendUserMessage, conversation } from '$lib/ai-engine.svelte';
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Loader, SendHorizontal, AlertCircle } from 'lucide-svelte';
	import MathMLRenderer from '$lib/components/MathMLRenderer.svelte';

	let userMessage = $state('');
	let loading = $state(false);
	let scrollContainer: HTMLElement | null = $state(null);
	let textareaElement: HTMLTextAreaElement;
	let timeLeft = $state(0);

	let isRateLimited = $derived(conversation.rateLimitedUntil > Date.now());

	$effect(() => {
		if (isRateLimited) {
			const interval = setInterval(() => {
				timeLeft = Math.ceil((conversation.rateLimitedUntil - Date.now()) / 1000);
				if (timeLeft <= 0) clearInterval(interval);
			}, 1000);
			return () => clearInterval(interval);
		}
	});

	function handleInput() {
		if (textareaElement) {
			textareaElement.style.height = 'auto';
			textareaElement.style.height = textareaElement.scrollHeight + 'px';
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSend();
		}
	}

	async function handleSend() {
		if (!userMessage.trim() || loading || isRateLimited) return;
		const msg = userMessage;
		userMessage = '';
		loading = true;

		if (textareaElement) {
			textareaElement.style.height = 'auto';
		}

		await sendUserMessage(msg);
		loading = false;
		scrollToBottom();
	}

	async function scrollToBottom() {
		await tick();
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}
</script>

<div class="fixed inset-0 flex flex-col bg-white font-sans text-zinc-900 antialiased">
	<header class="flex h-14 shrink-0 items-center justify-between border-b px-6">
		<div class="flex items-center gap-3">
			<span class="text-lg font-bold tracking-tight">Math Tutor</span>
		</div>
	</header>

	<main bind:this={scrollContainer} class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-4xl px-6 py-8">
			{#if conversation.messages.length === 0}
				<div class="py-16 text-center">
					<h2 class="mb-4 text-2xl font-semibold text-zinc-800">Welcome to Math Tutor!</h2>
					<p class="mb-8 text-zinc-600">
						I'm here to help you understand math concepts step-by-step. Ask me anything you're
						struggling with!
					</p>
					<div class="mx-auto max-w-md rounded-lg border border-zinc-200 bg-zinc-50 p-6">
						<h3 class="mb-2 font-medium text-zinc-800">How it works:</h3>
						<ul class="mx-auto max-w-md space-y-2 text-left text-zinc-600">
							<li>• Explain your math problem</li>
							<li>• I'll provide step-by-step solutions</li>
							<li>• Practice with similar problems</li>
							<li>• Build understanding at your pace</li>
						</ul>
					</div>
				</div>
			{:else}
				{#each conversation.messages as msg}
					<div class="py-6 {msg.sender === 'user' ? 'flex justify-end' : 'flex justify-start'}">
						<div
							class="max-w-[85%] rounded-2xl px-6 py-4 {msg.sender === 'user'
								? 'bg-blue-600 text-white'
								: 'border border-zinc-200 bg-zinc-50 text-zinc-900'}"
						>
							<div class="text-base leading-relaxed">
								<MathMLRenderer content={msg.contents} />
							</div>
						</div>
					</div>
				{/each}
			{/if}

			{#if loading && conversation.messages.length > 0}
				<div class="flex justify-center py-4">
					<div
						class="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-blue-600 shadow-sm"
					>
						<Loader class="h-4 w-4 animate-spin" />
						<span class="text-sm font-medium">Working on your problem...</span>
					</div>
				</div>
			{/if}

			{#if isRateLimited}
				<div class="flex justify-center py-4">
					<div
						class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 shadow-sm"
					>
						<AlertCircle class="h-4 w-4" />
						<span class="text-sm font-medium">Wait {timeLeft}s to send another message</span>
					</div>
				</div>
			{/if}
		</div>
	</main>

	<footer class="border-t bg-white p-6">
		<div class="mx-auto max-w-5xl">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSend();
				}}
				class="relative flex items-center gap-4"
			>
				<div class="min-w-0 flex-1">
					<textarea
						bind:this={textareaElement}
						placeholder={isRateLimited
							? `Cooldown active (${timeLeft}s)...`
							: 'Type your math problem here...'}
						bind:value={userMessage}
						disabled={loading || isRateLimited}
						rows="1"
						oninput={handleInput}
						onkeydown={handleKeyDown}
						class="w-full resize-none rounded-xl border-2 border-zinc-300 bg-white px-5 py-4 text-base shadow-sm transition-all focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:bg-zinc-100"
					></textarea>
				</div>
				<Button
					type="submit"
					disabled={loading || isRateLimited || !userMessage.trim()}
					class="h-14 shrink-0 rounded-xl bg-blue-600 px-6 text-base font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
				>
					{#if loading}
						<Loader class="mr-2 h-5 w-5 animate-spin" />
					{:else}
						<SendHorizontal class="mr-2 h-5 w-5" />
					{/if}
					Send
				</Button>
			</form>
		</div>
	</footer>
</div>

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
	}
</style>

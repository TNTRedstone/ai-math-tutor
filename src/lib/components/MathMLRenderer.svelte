<script lang="ts">
	import MarkdownIt from 'markdown-it';
	import { katex } from '@mdit/plugin-katex';
	import MathML from 'svelte-tex/package/MathML.svelte';

	export { className as class };
	let className: string = '';
	export let content: string;

	const md = new MarkdownIt({
		html: true,
		breaks: true,
		linkify: true,
		typographer: true
	}).use(katex, {
		renderMath: (str: string, isBlock: boolean) => {
			const type = isBlock ? 'display' : 'inline';
			return `___MATH_TOKEN_${type}_${btoa(encodeURIComponent(str))}___`;
		}
	});

	$: htmlSegments = processMarkdown(content);

	function processMarkdown(text: string) {
		// 1. Render Markdown to HTML (includes our placeholders)
		const rawHtml = md.render(text || '');

		// 2. Split by our custom placeholders
		const regex = /___MATH_TOKEN_(display|inline)_([A-Za-z0-9+/=]+)___/g;
		const segments = [];
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(rawHtml)) !== null) {
			// Add text before the math
			if (match.index > lastIndex) {
				segments.push({
					type: 'text',
					content: rawHtml.slice(lastIndex, match.index)
				});
			}

			// Add the math segment
			segments.push({
				type: match[1], // 'display' or 'inline'
				content: decodeURIComponent(atob(match[2]))
			});

			lastIndex = regex.lastIndex;
		}

		// Add remaining text
		if (lastIndex < rawHtml.length) {
			segments.push({
				type: 'text',
				content: rawHtml.slice(lastIndex)
			});
		}

		return segments.length > 0 ? segments : [{ type: 'text', content: '' }];
	}
</script>

<div class={className}>
	{#each htmlSegments as segment}
		{#if segment.type === 'display'}
			<div class="math-display">
				<MathML tex={segment.content} />
			</div>
		{:else if segment.type === 'inline'}
			<span class="math-inline">
				<MathML tex={segment.content} />
			</span>
		{:else}
			{@html segment.content}
		{/if}
	{/each}
</div>

<style>
	/* Keep your existing styles */
	.math-display {
		display: block;
		text-align: center;
		margin: 1em 0;
	}
	.math-inline {
		display: inline-block;
		vertical-align: middle;
	}
	/* Ensure block elements from @html have spacing */
	:global(p) {
		margin: 1em 0;
	}
	:global(ul),
	:global(ol) {
		padding-left: 1.5em;
		margin: 1em 0;
	}
</style>

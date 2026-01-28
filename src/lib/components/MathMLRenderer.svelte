<script lang="ts">
	import MarkdownIt from 'markdown-it';
	// @ts-ignore - No types available for markdown-it-texmath
	import texmath from 'markdown-it-texmath';
	import MathML from 'svelte-tex/package/MathML.svelte';

	export { className as class };
	let className: string = '';
	export let content: string;

	const md = new MarkdownIt({
		html: true,
		breaks: true,
		linkify: true,
		typographer: true
	}).use(texmath, {
		engine: {
			renderToString: (str: string, options: any) => {
				const isDisplay = options?.displayMode || false;
				const type = isDisplay ? 'display' : 'inline';
				return `___MATH_TOKEN_${type}_${btoa(encodeURIComponent(str))}___`;
			}
		},
		delimiters: 'dollars',
		macros: {}
	});

	$: htmlSegments = processMarkdown(content);

	function processMarkdown(text: string) {
		try {
			// 1. Fix double-escaped LaTeX delimiters from AI-generated content
			const normalizedText = text
				.replace(/\\\\([({)])/g, '\\$1') // Fix \\( -> \(
				.replace(/\\\\([)}])/g, '\\$1') // Fix \\) -> \)
				.replace(/\\\\\\\[/g, '\\[') // Fix \\\[ -> \[
				.replace(/\\\\\\\]/g, '\\]'); // Fix \\\] -> \]

			// 2. Render Markdown to HTML (includes our placeholders)
			const rawHtml = md.render(normalizedText || '');

			// 3. Split by our custom placeholders
			const regex = /___MATH_TOKEN_(display|inline)_([A-Za-z0-9+/=_%-]+)___/g;
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

				// Add the math segment with robust error handling
				try {
					const decodedContent = decodeURIComponent(atob(match[2]));

					// Validate LaTeX content before proceeding
					if (decodedContent && typeof decodedContent === 'string') {
						segments.push({
							type: match[1], // 'display' or 'inline'
							content: decodedContent
						});
					} else {
						throw new Error('Invalid LaTeX content decoded');
					}
				} catch (e) {
					console.error('Failed to decode math token:', match[2], e);
					segments.push({
						type: 'text',
						content: `[Math Rendering Error]`
					});
				}

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
		} catch (e) {
			console.error('Markdown processing failed:', e);
			return [{ type: 'text', content: text }]; // fallback
		}
	}
</script>

<div class={className}>
	{#each htmlSegments as segment}
		{#if segment.type === 'display'}
			<div class="math-display">
				<MathML tex={segment.content} temmlOptions={{ displayMode: true }} />
			</div>
		{:else if segment.type === 'inline'}
			<span class="math-inline">
				<MathML tex={segment.content} temmlOptions={{ displayMode: false }} />
			</span>
		{:else}
			{@html segment.content}
		{/if}
	{/each}
</div>

<style>
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

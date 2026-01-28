declare module 'markdown-it-texmath' {
	import { PluginSimple } from 'markdown-it';

	interface TexMathOptions {
		engine?: {
			renderToString: (str: string, options: any) => string;
			[key: string]: any;
		};
		delimiters?: 'dollars' | 'brackets' | 'all';
		macros?: Record<string, string>;
		[key: string]: any;
	}

	const texmath: PluginSimple<TexMathOptions>;
	export = texmath;
}

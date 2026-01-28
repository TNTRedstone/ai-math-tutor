# ai-math-tutor

A Svelte 5 technical implementation of a multi-stage LLM pipeline designed to provide math assistance without leaking solutions. The system uses a recursive verification loop to ensure the AI never gives the answer to the user's actual math problem.

## Architecture: The Three-Step Chain

The engine moves data through three distinct LLM calls to maintain pedagogical boundaries and handle non-deterministic output:

1.  **Step 1: The Parser**
    * **Goal**: Extract raw math data from unstructured user input.
    * **Output**: Identifies constants, target answers, and generates a "Twin Problem" (a problem with the same structure but different numbers).

2.  **Step 2: The Tutor**
    * **Goal**: Educational execution.
    * **Output**: Provides a full, worked example of the **Twin Problem** provided by the Parser. It is strictly forbidden from using the user's original numbers.

3.  **Step 3: The Auditor**
    * **Goal**: Logic validation.
    * **Output**: Returns a JSON object `{ "succeeds": boolean, "notes": string }`. It checks for constant leaks and ensures a follow-up question was asked.



## Technical Features

* **Svelte 5 Runes**: Uses `$state` for reactive message history management.
* **MathML & Markdown-it**: Utilizes MathML for native browser mathematical rendering and `markdown-it` for structured content parsing.
* **Recursive Recovery**: If the Auditor fails a response, the engine automatically re-triggers the chain with the Auditor's feedback to self-correct.

## Setup

1. **API Key**: 
   Set up your API key at the [Groq Console](https://console.groq.com/home).

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start a Developer Server**:
    ```bash
    npm run dev
    ```
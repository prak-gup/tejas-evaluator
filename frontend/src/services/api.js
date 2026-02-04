export const callOpenRouter = async (model, messages, apiKey, targetWordCount = null) => {
    console.log(`[API_START] function called for model ${model}`);
    if (!apiKey) {
        console.error("[API] API Key is missing");
        throw new Error("API Key is missing");
    }

    let currentMessages = [...messages];
    let attempts = 0;
    const maxAttempts = 3;
    let lastContent = "";

    while (attempts < maxAttempts) {
        console.log(`[API] calling OpenRouter with model: ${model}, attempts: ${attempts}`);
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Tejas Prompt Evaluator",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: currentMessages
                })
            });

            console.log(`[API] Response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                let errorData = {};
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { message: errorText };
                }
                console.error(`[API] Full Error Data:`, errorData);
                console.error(`[API] Raw Error Text:`, errorText);
                throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log(`[API] Data received, length: ${data.choices?.[0]?.message?.content?.length}`);

            // 1. PROGRAMMATIC CLEANUP:
            // Remove ONLY leading/trailing code fences (```markdown etc) to allow ReactMarkdown to render the content properly.
            // We DO NOT remove bold/headers anymore.
            let cleanedContent = data.choices[0].message.content
                .replace(/^```[a-z]*\s*/i, '') // Remove start fence
                .replace(/```$/, '')            // Remove end fence
                .trim();

            lastContent = cleanedContent;

            if (!targetWordCount) {
                return { content: lastContent, attempts: 1 };
            }

            // Extract numeric target handles "300 (Brief)" -> 300
            const target = parseInt(targetWordCount.toString().replace(/\D/g, ''));

            // Validation skipped if valid target not found
            if (isNaN(target) || target <= 0) return { content: lastContent, attempts: 1 };

            // Count words in the response
            const wordCount = lastContent.trim().split(/\s+/).filter(w => w.length > 0).length;
            const diff = Math.abs(wordCount - target);

            // Tolerance: 10% or 15 words, whichever is larger. 
            // For 100 words, +/- 15 words (85-115). For 500 words, +/- 50 words (450-550).
            const threshold = Math.max(15, target * 0.10);

            if (diff <= threshold) {
                return { content: lastContent, attempts: attempts + 1 };
            }

            console.log(`Word count mismatch (Attempt ${attempts + 1}): Got ${wordCount}, Target ${target}. Retrying...`);

            // CONSTRUCT SMART RETRY PROMPT (SENTENCE-BASED)
            // We align specifically with the prompt's internal logic (approx 15-20 words/sentence).
            const targetSentences = Math.ceil(target / 15);

            let retryInstruction = "";

            if (target < 200) {
                // For small targets, we just re-state the sentence limit gently, avoiding "Nuclear" truncation which destroys formatting.
                retryInstruction = `STRICT LENGTH CHECK: Your response (` + wordCount + ` words) is too far from the target (` + target + ` words). \n\nPlease rewrite to be CLOSER to ` + target + ` words. \nFocus on compliance: aim for exactly ` + targetSentences + ` sentences.`;
            } else if (wordCount > target * 1.5) {
                // Grossly oversized
                retryInstruction = `STRICT SYSTEM ALERT: Your output (` + wordCount + ` words) is WAY too long (Target: ` + target + `). \n\nSUMMARIZE AGGRESSIVELY. Cut introductions/conclusions. \nAim for exactly ` + targetSentences + ` sentences.`;
            } else if (wordCount > target) {
                // Slightly oversized
                retryInstruction = `Word count check: You are over by ` + (wordCount - target) + ` words. Please trim lightly to reach approx ` + target + ` words.`;
            } else {
                // Undersized
                retryInstruction = `Word count check: You are under by ` + (target - wordCount) + ` words. Please expand slightly to reach approx ` + target + ` words. Add a bit more detail to the subheadings.`;
            }

            currentMessages.push({ role: "assistant", content: lastContent });
            currentMessages.push({
                role: "user",
                content: retryInstruction
            });

            attempts++;
        } catch (error) {
            console.error(`[API] Attempt ${attempts + 1} failed:`, error);
            attempts++;
            if (attempts >= maxAttempts) throw error;
        }
    }
    return { content: lastContent, attempts: attempts };
};

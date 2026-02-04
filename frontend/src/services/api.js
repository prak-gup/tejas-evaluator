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

            // 1. PROGRAMMATIC CLEANUP: (DISABLED) - We want strict adherence to structure
            // let cleanedContent = data.choices[0].message.content
            //     .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            //     .replace(/^#+\s+/gm, '')          // Remove headers (# Title)
            //     .replace(/`/g, '');               // Remove code ticks

            let cleanedContent = data.choices[0].message.content; // Keep raw formatting

            lastContent = cleanedContent;

            if (!targetWordCount) {
                return { content: lastContent, attempts: 1 };
            }

            const wordCount = lastContent.trim().split(/\s+/).filter(w => w.length > 0).length;
            const target = parseInt(targetWordCount);

            // Skip validation if target matches parsing error or is 0
            if (isNaN(target) || target <= 0) return { content: lastContent, attempts: 1 };

            const diff = Math.abs(wordCount - target);
            const threshold = Math.max(5, target * 0.10); // 5 words or 10% tolerance

            if (diff <= threshold) {
                return { content: lastContent, attempts: attempts + 1 };
            }

            console.log(`Word count mismatch (Attempt ${attempts + 1}): Got ${wordCount}, Target ${target}. Retrying...`);

            // CONSTRUCT SMART RETRY PROMPT
            const diffRatio = wordCount / target;
            const targetSentences = Math.ceil(target / 15);
            // const hasSubheadings = /\*\*|##/.test(lastContent); // Cleanup removed these, so we check original or just force layout

            let retryInstruction = "";

            if (target < 250) {
                // SPECIAL CASE: Small targets often get bloated. FORCE single paragraph.
                // "Nuclear" option for short texts
                const keepSentences = Math.max(3, Math.floor(target / 20));
                retryInstruction = `STRICT SYSTEM ALERT: Your output (${wordCount} words) is CRITICALLY OVER the limit of ${target} words. \n\nEMERGENCY TRUNCATION REQUIRED:\n1. DISCARD the previous draft.\n2. Write EXACTLY ${keepSentences} to ${keepSentences + 2} sentences.\n3. NO "Introduction" or "Conclusion". Just the core news.\n4. ABSOLUTE MAXIMUM LENGTH: ${target + 15} words.`;
            } else if (diffRatio > 1.5) {
                // Case 1: Grossly oversized -> Force Summarization
                retryInstruction = `STRICT SYSTEM ALERT: Your previous output was ${wordCount} words. This is DRASTICALLY longer than the ${target} word limit. You must SUMMARIZE AGGRESSIVELY. Remove all fluff. Aim for exactly ${targetSentences} sentences (approx 15 words/sentence).`;
            } else if (wordCount > target) {
                retryInstruction = `STRICT SYSTEM ALERT: Your output was ${wordCount} words. You need to be closer to ${target} words. Reduce length by ${wordCount - target} words. Aim for exactly ${targetSentences} sentences.`;
            } else {
                retryInstruction = `STRICT SYSTEM ALERT: Your output was ${wordCount} words. You need to be closer to ${target} words. Increase length by ${target - wordCount} words. Aim for exactly ${targetSentences} sentences.`;
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

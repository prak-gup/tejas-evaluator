import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pcoiccfqieeubadewoco.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb2ljY2ZxaWVldWJhZGV3b2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODU3MzMsImV4cCI6MjA4NTY2MTczM30.mtta1SyhylEct5-1FloR6LZyc_6AsNhXskJ6ROKrRYI'

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Log a model generation to Supabase.
 * @param {string} modelId - The model identifier.
 * @param {object} inputPrompt - The full prompt object.
 * @param {string} outputText - The generated text.
 * @returns {Promise<string|null>} - The ID of the inserted record, or null on error.
 */
export const logGeneration = async (modelId, inputPrompt, outputText) => {
    try {
        const { data, error } = await supabase
            .from('model_metrics')
            .insert([
                {
                    model_id: modelId,
                    input_prompt: inputPrompt,
                    output_text: outputText,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Error logging generation:', error);
            return null;
        }
        return data.id;
    } catch (err) {
        console.error('Unexpected error logging generation:', err);
        return null;
    }
};

/**
 * Update feedback for a generation.
 * @param {string} id - The record ID.
 * @param {'like' | 'dislike'} feedback - The feedback type.
 */
export const logFeedback = async (id, feedback) => {
    try {
        const { error } = await supabase
            .from('model_metrics')
            .update({ feedback })
            .eq('id', id);

        if (error) {
            console.error('Error logging feedback:', error);
        }
    } catch (err) {
        console.error('Unexpected error logging feedback:', err);
    }
};

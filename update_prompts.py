import os
import json

BASE_DIR = "/Users/prakhar/Desktop/Meegrow/tejas-prompt-evaluator"
PROMPTS_DIR = os.path.join(BASE_DIR, "prompts")
TARGET_FILE = os.path.join(BASE_DIR, "frontend/src/data/prompts.js")

# Map IDs to Filenames and Metadata
PROMPT_MAP = [
    {
        "id": "pr-to-news",
        "name": "PR to News",
        "description": "Converts press releases into news articles.",
        "filename": "amar_ujala_pr_to_news.md",
        "inputs": [
            { "name": "user_question", "label": "Press Release Text", "type": "textarea", "placeholder": "Paste press release here..." },
            {
                "name": "word_count",
                "label": "Target Word Count",
                "type": "select",
                "defaultValue": "300",
                "options": [
                    { "value": "100", "label": "100 (Flash News)" },
                    { "value": "150", "label": "150 (Brief)" },
                    { "value": "250", "label": "250 (Quick)" },
                    { "value": "350", "label": "350 (Policy/Public)" },
                    { "value": "500", "label": "500 (Authority)" },
                    { "value": "650", "label": "650 (Detailed)" },
                    { "value": "800", "label": "800 (Comprehensive)" },
                    { "value": "1000", "label": "1000+ (Deep Feature)" }
                ]
            },
            { "name": "current_date", "label": "Current Date", "type": "text", "defaultValue": "DATE_PLACEHOLDER" }
        ]
    },
    {
        "id": "compression",
        "name": "Article Compression",
        "description": "Compresses articles to a specific percentage.",
        "filename": "amar_ujala_compression.md",
        "inputs": [
            { "name": "user_question", "label": "Original Article", "type": "textarea", "placeholder": "Paste article here..." },
            { "name": "compression_percent", "label": "Compression %", "type": "number", "placeholder": "e.g., 50" },
            { "name": "current_date", "label": "Current Date", "type": "text", "defaultValue": "DATE_PLACEHOLDER" }
        ]
    },
    {
        "id": "proofreading",
        "name": "Proofreading",
        "description": "Strict pattern matching for spelling corrections.",
        "filename": "amar_ujala_proofreading.md",
        "inputs": [
            { "name": "user_question", "label": "Article Text", "type": "textarea", "placeholder": "Paste text to proofread..." },
            { "name": "current_date", "label": "Current Date", "type": "text", "defaultValue": "DATE_PLACEHOLDER" }
        ]
    },
    {
        "id": "summarization",
        "name": "Summarization",
        "description": "Generates strict summaries with word count limits.",
        "filename": "amar_ujala_summarization.md",
        "inputs": [
            { "name": "user_question", "label": "Article Text", "type": "textarea", "placeholder": "Paste article..." },
            {
                "name": "word_count",
                "label": "Target Word Count",
                "type": "select",
                "defaultValue": "200",
                "options": [
                    { "value": "100", "label": "100 words" },
                    { "value": "200", "label": "200 words" },
                    { "value": "300", "label": "300 words" },
                    { "value": "400", "label": "400 words" },
                    { "value": "500", "label": "500 words" },
                    { "value": "800", "label": "800 words" }
                ]
            },
            { "name": "current_date", "label": "Current Date", "type": "text", "defaultValue": "DATE_PLACEHOLDER" },
            { "name": "chat_history", "label": "Chat History (Optional)", "type": "textarea", "placeholder": "Previous context..." }
        ]
    }
]

js_content = "export const PROMPTS = [\n"

for idx, p in enumerate(PROMPT_MAP):
    file_path = os.path.join(PROMPTS_DIR, p["filename"])
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            template_content = f.read()
            # Escape backticks for JS template literal
            template_content = template_content.replace("`", "\\`")
            # Escape ${ to prevent JS interpolation if needed
            template_content = template_content.replace("${", "\\${")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        continue

    js_content += "  {\n"
    js_content += f'    id: "{p["id"]}",\n'
    js_content += f'    name: "{p["name"]}",\n'
    js_content += f'    description: "{p["description"]}",\n'
    
    # Inputs
    js_content += "    inputs: [\n"
    for i, inp in enumerate(p["inputs"]):
        js_content += "      {\n"
        for k, v in inp.items():
            if k == "defaultValue" and v == "DATE_PLACEHOLDER":
                js_content += f"        {k}: new Date().toLocaleDateString('en-IN'),\n"
            elif k == "options":
                js_content += f"        {k}: {json.dumps(v)},\n"
            else:
                js_content += f'        {k}: "{v}",\n'
        js_content += "      }"
        if i < len(p["inputs"]) - 1:
            js_content += ","
        js_content += "\n"
    js_content += "    ],\n"
    
    # Template
    js_content += f'    template: `{template_content}`\n'
    
    js_content += "  }"
    if idx < len(PROMPT_MAP) - 1:
        js_content += ","
    js_content += "\n"

js_content += "];\n"

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Successfully updated {TARGET_FILE}")

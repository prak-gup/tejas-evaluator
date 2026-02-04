import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            colors: {
                primary: 'var(--bg-primary)',
                secondary: 'var(--bg-secondary)',
                card: 'var(--bg-card)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-tertiary': 'var(--text-tertiary)',
                border: 'var(--border-color)',
                input: 'var(--input-bg)',
                accent: 'var(--accent-color)',
            }
        },
    },
    plugins: [
        typography,
    ],
}

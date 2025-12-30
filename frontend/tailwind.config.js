/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                background: '#020617', // Slate 950 - Deep Navy
                surface: {
                    DEFAULT: '#0f172a', // Slate 900
                    hover: '#1e293b',   // Slate 800
                    active: '#334155',  // Slate 700
                },
                primary: {
                    DEFAULT: '#10b981', // Emerald 500
                    hover: '#059669',   // Emerald 600
                    light: 'rgba(16, 185, 129, 0.1)',
                },
                secondary: {
                    DEFAULT: '#f59e0b', // Amber 500
                    light: 'rgba(245, 158, 11, 0.1)',
                },
                border: {
                    DEFAULT: '#1e293b', // Slate 800
                    hover: '#334155',   // Slate 700
                }
            }
        },
    },
    plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				neutral: {
					50: '#FAFAFA',
					100: '#F5F5F5',
					200: '#E5E5E5',
					300: '#D4D4D4',
					400: '#A3A3A3',
					500: '#737373',
					600: '#525252',
					700: '#404040',
					800: '#262626',
					900: '#171717',
					950: '#121212',
				},
				primary: {
					50: '#E6F0FF',
					100: '#CCE0FF',
					200: '#99C2FF',
					300: '#66A3FF',
					400: '#3385FF',
					500: '#0066FF',
					600: '#0052CC',
					700: '#003D99',
					800: '#002966',
					900: '#001433',
				},
				player: {
					bg: '#000000',
					surface: '#0A0A0A',
					border: '#333333',
					accent: '#00FF94',
					text: '#FFFFFF',
					muted: '#888888',
				},
			},
			fontFamily: {
				sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
				mono: ['JetBrains Mono', 'monospace'],
			},
			borderRadius: {
				lg: '12px',
				md: '8px',
				sm: '4px',
			},
			animation: {
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				short_name: "MAI Quest",
				name: "My AI Quest",
				description: "Quest with Gemini",
				icons: [
					{
						src: "favicon.ico",
						sizes: "64x64 32x32 24x24 16x16",
						type: "image/x-icon"
					},
					{
						src: "icon.svg",
						sizes: "any"
					},
					{
						src: "icon.png",
						sizes: "512x512",
						type: "image/png"
					},
					{
						src: 'icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: "maskable_icon.png",
						sizes: "512x512",
						type: "image/png",
						"purpose": "maskable"
					}
				],
				start_url: "/",
				display: "standalone",
				theme_color: "#000000",
				background_color: "#ffffff",
				prefer_related_applications: true
			}
		})
	]
});
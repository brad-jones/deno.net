import { Child } from "@hono/hono/jsx";

export const Layout = ({ title, children }: { title?: string; children?: Child }) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Deno.net - Modern Web Development{title ? ` - ${title}` : ""}</title>
      <meta name="description" content="A modern web application built with Deno!" />
    </head>
    <body class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900">Deno.net</h1>
            </div>
            <nav class="hidden md:flex space-x-8">
              <a href="/" class="text-gray-500 hover:text-gray-900 transition-colors">Home</a>
              <a href="/about" class="text-gray-500 hover:text-gray-900 transition-colors">About</a>
              <a href="#" class="text-gray-500 hover:text-gray-900 transition-colors">Services</a>
              <a href="#" class="text-gray-500 hover:text-gray-900 transition-colors">Contact</a>
            </nav>
          </div>
        </div>
      </header>
      {children}
      <footer class="bg-white border-t border-gray-200 mt-24">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="text-center text-gray-500">
            <p>© 2025 Deno.net. Built with ❤️ using Deno and TypeScript.</p>
          </div>
        </div>
      </footer>
    </body>
  </html>
);

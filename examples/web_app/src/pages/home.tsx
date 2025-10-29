import { Layout } from "../components/layout.tsx";
import { Counter } from "../components/counter.tsx";
import { PageRouteBuilder } from "@brad-jones/deno-net-app-builder";
import { isIslandDiscoveryRequest } from "@brad-jones/deno-net-islands/server";

export default (p: PageRouteBuilder) =>
  p.mapGet("/", (page) =>
    page.body(() => (
      <Layout title="Home">
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="text-center">
            <h2 class="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Welcome to <span class="text-blue-600">Deno.net</span>
            </h2>
            <p class="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              A modern web application built with Deno, showcasing the power of TypeScript-first development.
            </p>
            <div class="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div class="rounded-md shadow">
                <a
                  href="#"
                  class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-colors"
                >
                  Get Started
                </a>
              </div>
              <div class="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <a
                  href="#"
                  class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition-colors"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
          <Counter id="counter1" initialCount={isIslandDiscoveryRequest() ? 0 : 1} />
          <Counter id="counter2" initialCount={isIslandDiscoveryRequest() ? 0 : 2} />
          <div class="mt-24">
            <div class="text-center">
              <h3 class="text-3xl font-bold text-gray-900">Key Features</h3>
              <p class="mt-4 text-lg text-gray-600">Everything you need to build modern web applications</p>
            </div>
            <div class="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div class="bg-white rounded-lg shadow-md p-6">
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    >
                    </path>
                  </svg>
                </div>
                <h4 class="text-xl font-semibold text-gray-900 mb-2">Fast Performance</h4>
                <p class="text-gray-600">Built with Deno&#39;s runtime for optimal performance and security.</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    >
                    </path>
                  </svg>
                </div>
                <h4 class="text-xl font-semibold text-gray-900 mb-2">TypeScript First</h4>
                <p class="text-gray-600">Full TypeScript support out of the box with no configuration needed.</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    >
                    </path>
                  </svg>
                </div>
                <h4 class="text-xl font-semibold text-gray-900 mb-2">Modern Tooling</h4>
                <p class="text-gray-600">Integrated with the latest development tools and best practices.</p>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    )));

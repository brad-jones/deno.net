import { Layout } from "../components/layout.tsx";
import { Counter } from "../components/counter.tsx";
import { PageRouteBuilder } from "@brad-jones/deno-net-app-builder";
import { Counter2 } from "../components/counter2.tsx";

export default (p: PageRouteBuilder) =>
  p.mapGet(
    "/about",
    (page) =>
      page.mount("client-counter", `${import.meta.dirname}/../components/clientCounter.tsx`).body(
        () => (
          <Layout title="About">
            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <p>About Page</p>
              <Counter id="aboutCounter" initialCount={123} />
              <Counter2 id="aboutCounter2" initialCount={456} />
              <div id="client-counter">loading...</div>
            </main>
          </Layout>
        ),
      ),
  );

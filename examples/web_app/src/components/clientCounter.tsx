import { ApiClient } from "../client.ts";
import { render } from "@hono/hono/jsx/dom";
import { useEffect, useState } from "@hono/hono/jsx";

export default (id: string) => render(<ClientCounter />, document.getElementById(id)!);

export function ClientCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      await new Promise((r) => setTimeout(r, 3000));
      const response = await new ApiClient()["/count"].get();
      setCount(response.body.currentCount);
    })();
  }, [count]);

  return (
    <div class="flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-md flex flex-col items-center space-y-4">
        <h1 class="text-3xl font-bold text-gray-800">Client Only Counter</h1>
        <div class="text-6xl font-extrabold text-blue-600" id="counter-display">{count}</div>
        <div class="flex space-x-4">
          <button
            type="button"
            onClick={() => setCount(count - 1)}
            class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => setCount(0)}
            class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setCount(count + 1)}
            class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "@hono/hono/jsx";
import { HydrateIsland, Island, onClient } from "@brad-jones/deno-net-islands/client";

export interface Counter2Props {
  id: string;
  initialCount?: number;
}

export default (id: string) => HydrateIsland<Counter2Props>(id, (props) => <Counter2 {...props} />);

export function Counter2(props: Counter2Props) {
  const [count, setCount] = useState(props.initialCount ?? 0);

  return (
    <Island id={props.id} filePath={import.meta.filename} initialState={props}>
      <div class="flex items-center justify-center bg-gray-100">
        <div class="bg-white p-8 rounded-lg shadow-md flex flex-col items-center space-y-4">
          <h1 class="text-3xl font-bold text-gray-800">Counter Two 2</h1>
          <div class="text-6xl font-extrabold text-blue-600" id="counter2-display">{count}</div>
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
          <p>Rendered on {onClient ? "client" : "server"}</p>
        </div>
      </div>
    </Island>
  );
}

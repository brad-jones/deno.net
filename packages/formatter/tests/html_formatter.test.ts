import { expect } from "@std/expect";
import { outdent } from "@cspotcode/outdent";
import { HtmlFormatter } from "../src/mod.ts";

Deno.test("HtmlFormatter - smoke test", async () => {
  const formatter = new HtmlFormatter();
  const input =
    `<details class="details-reset details-overlay details-overlay-dark lh-default color-fg-default hx_rsm" open><summary role="button" aria-label="Close dialog"></summary><details-dialog class="Box Box--overlay d-flex flex-column anim-fade-in fast hx_rsm-dialog hx_rsm-modal"><button class="Box-btn-octicon m-0 btn-octicon position-absolute right-0 top-0" type="button" aria-label="Close dialog" data-close-dialog><svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-x"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg></button><div class="octocat-spinner my-6 js-details-dialog-spinner"></div></details-dialog></details>`;
  const output = await formatter.fmt(input);
  expect(output).toBe(outdent`
    <details
      class="details-reset details-overlay details-overlay-dark lh-default color-fg-default hx_rsm"
      open
    >
      <summary role="button" aria-label="Close dialog"></summary><details-dialog
        class="Box Box--overlay d-flex flex-column anim-fade-in fast hx_rsm-dialog hx_rsm-modal"
      ><button
          class="Box-btn-octicon m-0 btn-octicon position-absolute right-0 top-0"
          type="button"
          aria-label="Close dialog"
          data-close-dialog
        >
          <svg
            aria-hidden="true"
            height="16"
            viewBox="0 0 16 16"
            version="1.1"
            width="16"
            data-view-component="true"
            class="octicon octicon-x"
          >
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z">
            </path>
          </svg>
        </button><div class="octocat-spinner my-6 js-details-dialog-spinner">
        </div></details-dialog>
    </details>

  `);
});

import { z } from "jsr:@zod/zod";

console.log(z.string().parse("foo"));

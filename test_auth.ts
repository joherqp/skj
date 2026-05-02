import { auth } from "./src/lib/auth";

async function main() {
  console.log(Object.keys(auth.api));
}
main();

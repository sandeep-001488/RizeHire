/**
 * Prints a bcrypt hash you can paste into a user's `password` field in Atlas
 * to set a new password by hand. Uses cost 12, same as the User model.
 *
 *   cd backend && npm run hash:password
 *
 * The password is typed at a hidden prompt (not echoed, not in shell history).
 * It can also be piped in:  echo -n "secret" | npm run hash:password --silent
 */
import bcrypt from "bcryptjs";
import readline from "readline";

const MIN_LENGTH = 6; // matches the User schema's minlength

function readHidden(prompt) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data.replace(/\r?\n$/, "")));
      return;
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.startsWith(prompt)) rl.output.write(prompt); // show the prompt, hide the keystrokes
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = await readHidden("New password: ");

if (password.length < MIN_LENGTH) {
  console.error(`Password must be at least ${MIN_LENGTH} characters (User schema minlength).`);
  process.exit(1);
}

if (process.stdin.isTTY) {
  const confirm = await readHidden("Repeat password: ");
  if (confirm !== password) {
    console.error("Passwords do not match.");
    process.exit(1);
  }
}

const hash = await bcrypt.hash(password, 12);
console.log("\nPaste this into the user's `password` field in Atlas:\n");
console.log(hash);

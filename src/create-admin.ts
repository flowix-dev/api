import readlineSync from "readline-sync";
import mongoose from "mongoose";
import { User } from "./models/User";
import { UserRole } from "./types/UserRole";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/flowix";

interface AdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

function parseArgs(): Partial<AdminInput> {
  const args = process.argv.slice(2);
  const result: Partial<AdminInput> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--firstName":
      case "-fn":
        result.firstName = args[++i];
        break;
      case "--lastName":
      case "-ln":
        result.lastName = args[++i];
        break;
      case "--email":
      case "-e":
        result.email = args[++i];
        break;
      case "--password":
      case "-p":
        result.password = args[++i];
        break;
    }
  }

  return result;
}

function prompt(question: string, isPassword = false): string {
  if (isPassword) {
    return readlineSync.question(question, { hideEchoBack: true });
  }
  return readlineSync.question(question);
}

function getInput(): AdminInput {
  const args = parseArgs();

  if (args.firstName && args.lastName && args.email && args.password) {
    return args as AdminInput;
  }

  console.log("Creating admin user. Press Ctrl+C to cancel.\n");

  const firstName = args.firstName || prompt("First name: ");
  const lastName = args.lastName || prompt("Last name: ");
  const email = args.email || prompt("Email: ");
  const password = args.password || prompt("Password (min 8 chars): ", true);

  return { firstName, lastName, email, password };
}

async function createAdmin(): Promise<void> {
  try {
    const input = getInput();

    if (!input.firstName || !input.lastName || !input.email || !input.password) {
      console.error("All fields are required");
      process.exit(1);
    }

    if (input.password.length < 8) {
      console.error("Password must be at least 8 characters");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      console.error(`User with email "${input.email}" already exists`);
      await mongoose.disconnect();
      process.exit(1);
    }

    const user = await User.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
      role: UserRole.ADMIN,
      credits: 1000,
    });

    console.log(`\nAdmin user created successfully:`);
    console.log(`  ID:        ${user._id}`);
    console.log(`  Name:      ${user.firstName} ${user.lastName}`);
    console.log(`  Email:     ${user.email}`);
    console.log(`  Role:      ${user.role}`);
    console.log(`  Credits:   ${user.credits}`);
  } catch (error) {
    console.error("Failed to create admin user:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.stdin.destroy();
  }
}

createAdmin();

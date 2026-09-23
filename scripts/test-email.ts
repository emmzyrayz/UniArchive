import { emailService } from "@/utils/email";

async function main() {
  const result = await emailService.sendVerificationEmail(
    "uniarchive.team@gmail.com",
    "Test User",
    "123456",
  );
  console.log("Sent:", result);
}

main().catch((err) => {
  console.error("Failed to send email:", err);
});

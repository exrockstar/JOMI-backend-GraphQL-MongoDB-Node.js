export function getDomainFromEmail(email: string): string | null {
  if (!email) {
    return null;
  }

  const domain = email.split("@").pop();

  // make sure text exists after the @ symbol
  if (!domain) {
    return null;
  }

  return domain;
}

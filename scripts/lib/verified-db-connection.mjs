import fs from "node:fs";
import path from "node:path";

/**
 * Build a node-postgres connection config that requires TLS and validates the
 * server certificate and hostname. Supabase's private database CA can be
 * supplied through SUPABASE_DB_SSL_CA_FILE / PGSSLROOTCERT or sslrootcert in
 * the connection URL.
 */
export function getVerifiedDbConnectionConfig(connectionString, env = process.env) {
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    throw new Error("NODE_TLS_REJECT_UNAUTHORIZED=0 disables certificate validation");
  }

  const databaseUrl = new URL(connectionString);
  if (databaseUrl.searchParams.has("sslcert") || databaseUrl.searchParams.has("sslkey")) {
    throw new Error("Client certificate URL parameters are not supported by the audit harness");
  }
  const rootCertificatePath =
    env.SUPABASE_DB_SSL_CA_FILE?.trim() ||
    env.PGSSLROOTCERT?.trim() ||
    databaseUrl.searchParams.get("sslrootcert");

  // node-postgres applies SSL options from the URL after the config object;
  // remove URI SSL controls so query parameters cannot override or disable TLS.
  for (const parameter of ["ssl", "sslmode", "sslrootcert", "sslnegotiation", "uselibpqcompat"]) {
    databaseUrl.searchParams.delete(parameter);
  }

  const ssl = { rejectUnauthorized: true };
  if (rootCertificatePath) {
    ssl.ca = fs.readFileSync(path.resolve(rootCertificatePath), "utf8");
  }

  return {
    connectionString: databaseUrl.toString(),
    ssl,
  };
}

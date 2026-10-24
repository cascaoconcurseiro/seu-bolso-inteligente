import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { getVerifiedDbConnectionConfig } from "./verified-db-connection.mjs";

test("requires validated TLS even when the URL says require", () => {
  const config = getVerifiedDbConnectionConfig(
    "postgres://audit:sample-pass@db.example.test/postgres?sslmode=require",
    {}
  );
  const url = new URL(config.connectionString);

  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(url.searchParams.has("sslmode"), false);
  assert.equal(url.searchParams.has("sslrootcert"), false);
  assert.equal("ca" in config.ssl, false);
});

test("refuses a process environment that disables TLS verification globally", () => {
  assert.throws(
    () =>
      getVerifiedDbConnectionConfig("postgres://audit:sample-pass@db.example.test/postgres", {
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
      }),
    /disables certificate validation/
  );
});

test("loads and uses the Supabase CA from the configured file", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "db-ca-test-"));
  try {
    const caPath = path.join(tempDir, "supabase-ca.crt");
    fs.writeFileSync(caPath, "test root CA");

    const config = getVerifiedDbConnectionConfig(
      "postgres://audit:sample-pass@db.example.test/postgres",
      { SUPABASE_DB_SSL_CA_FILE: caPath }
    );

    assert.equal(config.ssl.rejectUnauthorized, true);
    assert.equal(config.ssl.ca, "test root CA");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("uses sslrootcert from the connection URL when no environment path is set", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "db-ca-url-test-"));
  try {
    const caPath = path.join(tempDir, "url-root.crt");
    fs.writeFileSync(caPath, "url root CA");
    const connectionString = new URL("postgres://audit:sample-pass@db.example.test/postgres");
    connectionString.searchParams.set("sslrootcert", caPath);

    const config = getVerifiedDbConnectionConfig(connectionString.toString(), {});

    assert.equal(config.ssl.ca, "url root CA");
    assert.equal(new URL(config.connectionString).searchParams.has("sslrootcert"), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("insecure URL SSL overrides cannot bypass the verified TLS config", () => {
  for (const parameter of [
    "ssl=no-verify",
    "ssl=0",
    "sslmode=disable",
    "uselibpqcompat=true&sslmode=disable",
  ]) {
    const connectionString = `postgres://audit:sample-pass@db.example.test/postgres?${parameter}`;
    const config = getVerifiedDbConnectionConfig(connectionString, {});
    const client = new pg.Client(config);

    assert.equal(client.connectionParameters.ssl.rejectUnauthorized, true, parameter);
    assert.equal(typeof client.connectionParameters.ssl, "object", parameter);
  }
});

test("rejects client certificate URL parameters before node-postgres reads files", () => {
  for (const parameter of ["sslcert=C:%5Cmissing.crt", "sslkey=C:%5Cmissing.key"]) {
    assert.throws(
      () =>
        getVerifiedDbConnectionConfig(
          `postgres://audit:sample-pass@db.example.test/postgres?${parameter}`,
          {}
        ),
      /Client certificate URL parameters are not supported/
    );
  }
});

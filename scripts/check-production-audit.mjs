import { spawnSync } from "node:child_process";

function runNpm(args) {
  const result = spawnSync("npm", args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  return result;
}

function parseJson(output, label) {
  const start = output.indexOf("{");
  if (start < 0) throw new Error(`${label} did not return JSON`);
  return JSON.parse(output.slice(start));
}

function collectProductionPaths(tree) {
  const paths = new Set();
  const visit = (node, parentPath = "node_modules") => {
    for (const [name, dependency] of Object.entries(node.dependencies ?? {})) {
      const packagePath = `${parentPath}/${name}`;
      paths.add(packagePath);
      visit(dependency, `${packagePath}/node_modules`);
    }
  };

  visit(tree);
  return paths;
}

const auditResult = runNpm(["audit", "--json"]);
const treeResult = runNpm(["ls", "--omit=dev", "--all", "--json"]);
const audit = parseJson(auditResult.stdout, "npm audit");
const tree = parseJson(treeResult.stdout, "npm ls --omit=dev");
if (auditResult.error) throw auditResult.error;
if (![0, 1].includes(auditResult.status)) {
  throw new Error(`npm audit failed to run (exit ${auditResult.status})`);
}
if (
  audit.error ||
  !audit.metadata?.vulnerabilities ||
  typeof audit.vulnerabilities !== "object"
) {
  throw new Error("npm audit did not return a valid vulnerability report");
}
const productionPaths = collectProductionPaths(tree);
const findings = Object.entries(audit.vulnerabilities ?? {}).flatMap(
  ([name, vulnerability]) =>
    (vulnerability.nodes ?? [])
      .filter((node) => productionPaths.has(node))
      .map((node) => ({
        name,
        node,
        severity: vulnerability.severity,
        via: vulnerability.via.map((item) =>
          typeof item === "string" ? item : item.title,
        ),
      })),
);
const blockingFindings = findings.filter((finding) =>
  ["high", "critical"].includes(finding.severity),
);

console.log(
  JSON.stringify(
    {
      productionPackagePaths: productionPaths.size,
      blockingProductionFindings: blockingFindings.length,
      productionFindings: findings,
      developmentOnlyFindings: Object.entries(audit.vulnerabilities ?? {})
        .filter(([, vulnerability]) =>
          !(vulnerability.nodes ?? []).some((node) => productionPaths.has(node)),
        )
        .map(([name, vulnerability]) => ({
          name,
          severity: vulnerability.severity,
        })),
    },
    null,
    2,
  ),
);

if (treeResult.status !== 0) {
  console.error(treeResult.stderr || "npm ls reported a dependency tree error");
  process.exitCode = 1;
} else if (blockingFindings.length > 0) {
  process.exitCode = 1;
}

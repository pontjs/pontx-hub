type HubCliOperation = {
  operationId: string;
  tag: string;
};

export type HubCliAction = "preview" | "call";

export function shellArgument(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function hubCliCommand(
  apiSlug: string,
  operation: HubCliOperation,
  action: HubCliAction = "call"
): string {
  const parts = ["pontx-hub", shellArgument(apiSlug), action];
  if (operation.tag.trim().toLocaleLowerCase() !== "default") {
    parts.push(shellArgument(operation.tag));
  }
  parts.push(shellArgument(operation.operationId));
  return parts.join(" ");
}

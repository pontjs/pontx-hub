import { SchemaProvider } from "@pontx/shadcn-ui";
import { SchemaViewer } from "@pontx/shadcn-ui/schema-viewer";
import type { PontxJsonSchema } from "@pontx/spec";

export default function DeferredSchemaViewer({
  components,
  name,
  schema
}: {
  components: { schemas: Record<string, PontxJsonSchema> };
  name: string;
  schema: PontxJsonSchema;
}) {
  return (
    <SchemaProvider components={components}>
      <SchemaViewer
        name={name}
        schema={schema}
        hideHeader
        defaultExpandedDepth={2}
        className="hub-schema-viewer"
      />
    </SchemaProvider>
  );
}

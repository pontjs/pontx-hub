import { lazy, Suspense, useEffect, useState } from "react";
import type { PontxSpec } from "@pontx/spec";
import { StaticResourceDirectoryNavigation } from "~/components/static-resource-directory-navigation";
import { ResourceNavigation } from "~/components/resource-navigation";
import { OperationSeoContent } from "~/components/operation-seo-content";
import type {
  CatalogApiContext,
  CatalogOperation,
  Locale
} from "~/lib/catalog/types";

let interactiveEndpointWorkspacePromise:
  | Promise<typeof import("~/components/pontx-api-workspace")>
  | undefined;

function loadInteractiveEndpointWorkspace() {
  interactiveEndpointWorkspacePromise ??= import("~/components/pontx-api-workspace");
  return interactiveEndpointWorkspacePromise;
}

// Start the optional reference download as soon as the browser evaluates this
// route chunk. It remains a separate dynamic bundle (and is not modulepreloaded
// by the static HTML), but no longer waits for a post-paint effect to begin.
if (typeof document !== "undefined") {
  void loadInteractiveEndpointWorkspace();
}

const InteractiveEndpointWorkspace = lazy(async () => {
  const module = await loadInteractiveEndpointWorkspace();
  return { default: module.PontxApiWorkspace };
});

export function EndpointReference({
  locale,
  api,
  spec,
  operation,
  skillName,
  onLoadDirectory
}: {
  locale: Locale;
  api: CatalogApiContext;
  spec: PontxSpec;
  operation: CatalogOperation;
  skillName?: string;
  onLoadDirectory?: () => void;
}) {
  const [interactive, setInteractive] = useState(false);
  const [interactiveLoadFailed, setInteractiveLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onLoadDirectory?.();
    void loadInteractiveEndpointWorkspace().then(
      () => {
        if (!cancelled) setInteractive(true);
      },
      () => {
        if (!cancelled) setInteractiveLoadFailed(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [onLoadDirectory]);

  const staticReference = (
    <main className="resource-page resource-page-workspace">
      <ResourceNavigation
        locale={locale}
        api={api}
        active="docs"
        skillName={skillName}
      />
      <div className="pontx-workspace">
        <aside
          className="pontx-workspace-directory"
          aria-label={locale === "zh" ? "API 参考目录" : "API reference directory"}
        >
          <StaticResourceDirectoryNavigation
            locale={locale}
            api={api}
            activeOperation={operation}
          />
        </aside>

        <section className="pontx-workspace-content">
          <div className="pontx-workspace-bar">
            <div>
              <span>{api.provider}</span>
              <b>/</b>
              <code>{operation.operationId}</code>
            </div>
            <p role="status" aria-live="polite">
              {interactiveLoadFailed
                ? locale === "zh"
                  ? "交互文档暂未加载 · 已保留完整静态参考"
                  : "Interactive reference unavailable · complete static reference retained"
                : locale === "zh"
                  ? "正在自动加载完整文档…"
                  : "Loading the complete reference automatically…"}
            </p>
          </div>
          <div className="pontx-workspace-body">
            <OperationSeoContent locale={locale} api={api} operation={operation} />
          </div>
        </section>
      </div>
    </main>
  );

  if (!interactive) return staticReference;

  return (
    <Suspense fallback={staticReference}>
      <InteractiveEndpointWorkspace
        locale={locale}
        api={api}
        spec={spec}
        operation={operation}
        skillName={skillName}
        initialPlaygroundOpen
      />
    </Suspense>
  );
}

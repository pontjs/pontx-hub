import { lazy, Suspense, useState } from "react";
import type { PontxSpec } from "@pontx/spec";
import { StaticResourceDirectoryNavigation } from "~/components/static-resource-directory-navigation";
import { ResourceNavigation } from "~/components/resource-navigation";
import { OperationSeoContent } from "~/components/operation-seo-content";
import type {
  CatalogApiContext,
  CatalogOperation,
  Locale
} from "~/lib/catalog/types";

const InteractiveEndpointWorkspace = lazy(async () => {
  const module = await import("~/components/pontx-api-workspace");
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

  if (interactive) {
    return (
      <Suspense fallback={<EndpointReferenceLoading locale={locale} />}>
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

  return (
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
            onLoadDirectory={onLoadDirectory}
          />
        </aside>

        <section className="pontx-workspace-content">
          <div className="pontx-workspace-bar">
            <div>
              <span>{api.provider}</span>
              <b>/</b>
              <code>{operation.operationId}</code>
            </div>
            <p>
              {locale === "zh"
                ? "静态 API 参考 · 交互资源按需加载"
                : "Static API reference · interactive resources load on demand"}
            </p>
          </div>
          <div className="pontx-workspace-body">
            <OperationSeoContent locale={locale} api={api} operation={operation} />
            <div className="pontx-interactive-docs-action">
              <button
                className="interactive-docs-button"
                type="button"
                onClick={() => {
                  onLoadDirectory?.();
                  setInteractive(true);
                }}
              >
                {locale === "zh"
                  ? "加载交互式文档与 Playground"
                  : "Load interactive docs & Playground"}
              </button>
              <p>
                {locale === "zh"
                  ? "仅在需要调试或生成代码时下载 Monaco 编辑器资源。"
                  : "Monaco editor resources download only for debugging or code generation."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function EndpointReferenceLoading({ locale }: { locale: Locale }) {
  return (
    <main className="resource-page">
      <div className="pontx-documentation-loading" role="status">
        {locale === "zh"
          ? "正在加载交互式文档…"
          : "Loading interactive documentation…"}
      </div>
    </main>
  );
}

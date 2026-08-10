import { redirect } from "react-router";
import { preferredLocale } from "~/lib/i18n";

export function loader({ request }: { request: Request }) {
  const locale = preferredLocale(request.headers.get("accept-language"));
  return redirect(`/${locale}`, 302);
}

export default function LocaleRedirect() {
  return null;
}

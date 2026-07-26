import { redirect } from "react-router";

export function loader() {
  return redirect("/zh", 302);
}

export default function LocaleRedirect() {
  return null;
}

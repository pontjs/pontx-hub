import type { Route } from "./+types/api-v2";
import { hubApi } from "~/api/hub-api.server";

export function loader({ request }: Route.LoaderArgs) {
  return hubApi.fetch(request);
}

export function action({ request }: Route.ActionArgs) {
  return hubApi.fetch(request);
}

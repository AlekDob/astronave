import { createFileRoute } from "@tanstack/react-router";

import { AstroSettingsPanel } from "../astro/AstroSettingsPanel";

function SettingsAstroRoute() {
  return <AstroSettingsPanel />;
}

export const Route = createFileRoute("/_chat/settings/astro")({
  component: SettingsAstroRoute,
});

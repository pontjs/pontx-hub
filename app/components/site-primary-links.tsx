"use client";

import { NavLink } from "react-router";
import { SharedLayoutBg } from "~/components/motion/shared-layout-bg";
import type { Locale } from "~/lib/catalog/types";

export function SitePrimaryLinks({
  locale,
  catalog,
  skill,
  docs
}: {
  locale: Locale;
  catalog: string;
  skill: string;
  docs: string;
}) {
  return (
    <SharedLayoutBg
      className="site-primary-links"
      pillClassName="site-primary-hover"
      pillContainerClassName="site-primary-pill"
      inset={7}
    >
      <NavLink key="catalog" to={`/${locale}`} end>{catalog}</NavLink>
      <NavLink key="skills" to={`/${locale}/skills`}>{skill}</NavLink>
      <NavLink key="docs" to={`/${locale}/docs`}>{docs}</NavLink>
    </SharedLayoutBg>
  );
}

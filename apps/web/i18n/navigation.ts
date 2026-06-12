import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/** Locale-aware navigation — Link/useRouter preserve the active locale across steps. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

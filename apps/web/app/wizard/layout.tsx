import { type ReactNode } from "react";

import { FunnelProvider } from "./FunnelProvider";
import { WizardChrome } from "./WizardChrome";

export default function WizardLayout({ children }: { children: ReactNode }) {
  return (
    <FunnelProvider>
      <WizardChrome>{children}</WizardChrome>
    </FunnelProvider>
  );
}

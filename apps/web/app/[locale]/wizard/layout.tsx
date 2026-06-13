import { type ReactNode } from "react";

import { ApolloProvider } from "../../../lib/apollo/Provider";
import { FunnelProvider } from "./FunnelProvider";
import { WizardChrome } from "./WizardChrome";

export default function WizardLayout({ children }: { children: ReactNode }) {
  return (
    <ApolloProvider>
      <FunnelProvider>
        <WizardChrome>{children}</WizardChrome>
      </FunnelProvider>
    </ApolloProvider>
  );
}
